import {
  loadLiteRt,
  loadAndCompile,
  isWebGPUSupported,
  Tensor,
  type CompiledModel,
} from '@litertjs/core'
import { AI_MODEL_URL, AI_WASM_PATH } from '@/constants/config'

export type Accelerator = 'webgpu' | 'wasm'

export interface LoadedClassifier {
  model: CompiledModel
  accelerator: Accelerator
  /** Square input edge read from the model itself, not assumed. */
  inputSize: number
  /** True when the model wants uint8 input rather than float32. */
  quantised: boolean
}

export interface LoadProgress {
  received: number
  total: number
  /** 0–1, or null when the server sends no Content-Length. */
  fraction: number | null
}

let runtimePromise: Promise<void> | null = null

/**
 * Loads the LiteRT WASM runtime exactly once per session.
 *
 * WASM is served from our own origin (public/litert-wasm, synced by
 * scripts/sync-litert-wasm.mjs) rather than the jsDelivr CDN that LiteRT's
 * quickstart suggests — a classifier that needs the network is not an
 * on-device classifier (PRD §10.5).
 */
export function ensureRuntime(): Promise<void> {
  if (!runtimePromise) {
    runtimePromise = loadLiteRt(AI_WASM_PATH).then(() => undefined)
    // A failed load must not poison every later attempt.
    runtimePromise.catch(() => {
      runtimePromise = null
    })
  }
  return runtimePromise
}

/**
 * Picks the best available accelerator.
 *
 * WebNN is deliberately absent: as of Aug 2026 it sits behind flags in every
 * browser and additionally requires JSPI, so it is not shippable. WebGPU with a
 * WASM/XNNPACK fallback covers the real device population.
 */
export function selectAccelerator(): Accelerator {
  try {
    return isWebGPUSupported() ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

/**
 * Fetches the model with progress, so the UI can show a real loader rather than
 * a fake one. `loadAndCompile` accepts a ReadableStream reader directly, which
 * means reporting progress costs nothing extra — it is the same pass.
 */
async function fetchModelWithProgress(
  url: string,
  signal: AbortSignal | undefined,
  onProgress?: (p: LoadProgress) => void
): Promise<Uint8Array> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Model fetch failed: ${response.status} ${response.statusText}`)
  }

  const total = Number(response.headers.get('content-length') ?? 0)
  const reader = response.body?.getReader()

  if (!reader) {
    const buf = new Uint8Array(await response.arrayBuffer())
    onProgress?.({ received: buf.byteLength, total: buf.byteLength, fraction: 1 })
    return buf
  }

  const chunks: Uint8Array[] = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.byteLength
      onProgress?.({
        received,
        total,
        // No Content-Length means no honest fraction. Report null rather than
        // inventing one — MOTION.md forbids faking progress.
        fraction: total > 0 ? Math.min(1, received / total) : null,
      })
    }
  }

  const out = new Uint8Array(received)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

/**
 * Loads and compiles the civic classifier.
 *
 * Throws on any failure. Callers are expected to treat a throw as "fall back to
 * the manual category picker" — a missing or broken classifier must never block
 * a report (S7.11).
 */
export async function loadClassifier(
  options: { signal?: AbortSignal; onProgress?: (p: LoadProgress) => void } = {}
): Promise<LoadedClassifier> {
  await ensureRuntime()

  const bytes = await fetchModelWithProgress(AI_MODEL_URL, options.signal, options.onProgress)

  const accelerator = selectAccelerator()
  let model: CompiledModel
  try {
    model = await loadAndCompile(bytes, { accelerator })
  } catch (err) {
    // WebGPU compilation can fail on drivers that advertise support. Falling
    // back to WASM is slower but correct, and beats losing the feature.
    if (accelerator === 'webgpu') {
      const fallback = await loadAndCompile(bytes, { accelerator: 'wasm' })
      return { model: fallback, accelerator: 'wasm', ...readInputSpec(fallback) }
    }
    throw err
  }

  return { model, accelerator, ...readInputSpec(model) }
}

/**
 * Reads the input geometry from the model rather than hardcoding 224.
 * A fine-tuned EfficientNet-Lite0 and a MobileNetV3-Small disagree on this, and
 * guessing produces a tensor the runtime rejects at the worst moment.
 */
function readInputSpec(model: CompiledModel): { inputSize: number; quantised: boolean } {
  try {
    const details = model.getInputDetails()
    const first = details[0]
    const shape = first?.shape ?? []
    // NHWC [1, H, W, 3] is the norm for TFLite vision models.
    const size = shape.length >= 3 ? Number(shape[1]) : NaN
    const dtype = String(first?.dtype ?? '').toLowerCase()

    return {
      inputSize: Number.isFinite(size) && size > 0 ? size : DEFAULT_INPUT_SIZE,
      quantised: dtype.includes('int8') || dtype.includes('uint8'),
    }
  } catch {
    return { inputSize: DEFAULT_INPUT_SIZE, quantised: false }
  }
}

const DEFAULT_INPUT_SIZE = 224

/** Runs inference and returns the raw output vector. */
export async function runInference(
  model: CompiledModel,
  data: Float32Array | Uint8Array,
  shape: [number, number, number, number]
): Promise<number[]> {
  const input = Tensor.fromTypedArray(data, shape)
  const outputs = await model.run(input)
  const first = outputs[0]
  if (!first) throw new Error('Model produced no output')

  // Prefer the async accessor: dataSync-style reads stall the GPU pipeline on
  // the WebGPU backend.
  const raw = await first.data()
  return Array.from(raw as ArrayLike<number>, Number)
}
