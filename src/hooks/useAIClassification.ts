import { useCallback, useEffect, useRef, useState } from 'react'
import { loadClassifier, runInference, type LoadedClassifier } from '@/lib/litert'
import { preprocessImage } from '@/lib/preprocessImage'
import {
  getConfidenceTier,
  toProbabilities,
  topPredictions,
  type ConfidenceTier,
  type Prediction,
} from '@/lib/classification'
import { CATEGORIES } from '@/constants/categories'
import { AI_BUDGET_MS } from '@/constants/config'
import type { ReportCategory } from '@/types'

/** Model output index → Ripple category. Order must match the training labels. */
const LABELS: ReportCategory[] = CATEGORIES.map((c) => c.key)

export interface AIClassificationState {
  /** Best prediction, or null before/without a result. */
  category: ReportCategory | null
  confidence: number
  /** Top two, for the <60% "which one is it?" case. */
  top2: Prediction[]
  tier: ConfidenceTier | null
  isModelLoading: boolean
  isClassifying: boolean
  /** 0–1, or null when the server sends no Content-Length. */
  loadProgress: number | null
  /** Non-null when classification is unavailable — the UI falls back to manual. */
  error: string | null
  /** Measured capture→result time, for the S7.13 latency budget. */
  elapsedMs: number | null
  /** True once the user has overridden the AI's answer. */
  wasOverridden: boolean
  override: (category: ReportCategory) => void
}

// The compiled model is expensive and stateless — share one across the session.
let cached: LoadedClassifier | null = null
let loading: Promise<LoadedClassifier> | null = null

function getClassifier(onProgress?: (f: number | null) => void): Promise<LoadedClassifier> {
  if (cached) return Promise.resolve(cached)

  loading ??= loadClassifier({ onProgress: (p) => onProgress?.(p.fraction) })
    .then((c) => {
      cached = c
      return c
    })
    .catch((err: unknown) => {
      // Do not poison later attempts — the user may reach the camera again on
      // a better connection.
      loading = null
      throw err
    })

  return loading
}

/** Test seam — resets the module-level model cache. */
export function __resetClassifierCache() {
  cached = null
  loading = null
}

/**
 * Classifies a captured photo entirely on-device.
 *
 * Contract: this hook NEVER throws into render and never blocks a report. Any
 * failure — model missing, WebGPU broken, WASM blocked, decode error — settles
 * as `error` with `category: null`, and the caller falls back to the manual
 * category picker (S7.11). A classifier that can break the reporting flow is
 * worse than no classifier.
 *
 * Privacy: inference is local. The photo is never uploaded for classification
 * purposes — only the compressed image, and only after the user taps Submit
 * (PRD §6.2, §13.1).
 */
export function useAIClassification(photo: Blob | null): AIClassificationState {
  const [state, setState] = useState<Omit<AIClassificationState, 'override'>>({
    category: null,
    confidence: 0,
    top2: [],
    tier: null,
    isModelLoading: false,
    isClassifying: false,
    loadProgress: null,
    error: null,
    elapsedMs: null,
    wasOverridden: false,
  })

  // Guards against a stale result landing after the user retakes the photo.
  const runIdRef = useRef(0)

  useEffect(() => {
    if (!photo) return

    const runId = ++runIdRef.current
    let cancelled = false
    const startedAt = performance.now()

    setState({
      category: null,
      confidence: 0,
      top2: [],
      tier: null,
      isModelLoading: !cached,
      isClassifying: true,
      loadProgress: null,
      error: null,
      elapsedMs: null,
      wasOverridden: false,
    })

    void (async () => {
      try {
        const classifier = await getClassifier((fraction) => {
          if (cancelled || runIdRef.current !== runId) return
          setState((s) => ({ ...s, loadProgress: fraction }))
        })

        if (cancelled || runIdRef.current !== runId) return
        setState((s) => ({ ...s, isModelLoading: false }))

        const { data, shape } = await preprocessImage(photo, {
          size: classifier.inputSize,
          quantised: classifier.quantised,
        })

        if (cancelled || runIdRef.current !== runId) return

        const raw = await runInference(classifier.model, data, shape)
        if (cancelled || runIdRef.current !== runId) return

        const probabilities = toProbabilities(raw)
        const top2 = topPredictions(probabilities, LABELS, 2)
        const best = top2[0]
        const elapsedMs = Math.round(performance.now() - startedAt)

        if (import.meta.env.DEV) {
          // S7.13: instrument the budget. MOTION.md is explicit that exceeding
          // it is a finding to record, not something to hide behind a longer
          // animation.
          const verdict = elapsedMs > AI_BUDGET_MS ? 'OVER BUDGET' : 'ok'
          console.info(
            `[ripple:ai] ${elapsedMs}ms (${classifier.accelerator}, ${classifier.inputSize}px) — ${verdict}`
          )
        }

        setState({
          category: best?.category ?? null,
          confidence: best?.confidence ?? 0,
          top2,
          tier: best ? getConfidenceTier(best.confidence) : null,
          isModelLoading: false,
          isClassifying: false,
          loadProgress: 1,
          error: best ? null : 'No prediction produced',
          elapsedMs,
          wasOverridden: false,
        })
      } catch (err) {
        if (cancelled || runIdRef.current !== runId) return
        setState((s) => ({
          ...s,
          isModelLoading: false,
          isClassifying: false,
          error: err instanceof Error ? err.message : 'Classification unavailable',
        }))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [photo])

  const override = useCallback((category: ReportCategory) => {
    setState((s) => ({ ...s, category, wasOverridden: true }))
  }, [])

  return { ...state, override }
}
