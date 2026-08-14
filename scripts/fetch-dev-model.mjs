// Downloads a real EfficientNet-Lite0 int8 .tflite for local development.
//
// MASTERPLAN S7 always planned to ship on a generic ImageNet-classed backbone
// and swap the fine-tuned civic classifier in later — the versioned model URL
// exists to make that a one-line change. This fetches the generic half so the
// pipeline can be exercised and TIMED for real instead of only reasoned about.
//
// It is NOT the Ripple classifier. Its labels are ImageNet's 1000 classes, not
// our ten categories, so its predictions are not civic-meaningful. What it is
// good for: proving the runtime loads, measuring genuine inference latency
// (S7.13), and exercising the offline cache path (S7.14).
//
// Not committed to git — 5MB, and reproducible from this URL.
import { writeFile, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const URL_INT8 =
  'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/int8/1/efficientnet_lite0.tflite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'public', 'models', 'ripple-classifier-v1.tflite')

if (existsSync(dest)) {
  const { size } = await stat(dest)
  console.log(`[model] already present (${(size / 1024 / 1024).toFixed(1)}MB) — skipping`)
  process.exit(0)
}

console.log('[model] fetching EfficientNet-Lite0 int8…')
const res = await fetch(URL_INT8)
if (!res.ok) {
  console.error(`[model] fetch failed: ${res.status} ${res.statusText}`)
  process.exit(1)
}

const bytes = new Uint8Array(await res.arrayBuffer())
await mkdir(dirname(dest), { recursive: true })
await writeFile(dest, bytes)

console.log(`[model] wrote ${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB → public/models/`)
console.log('[model] NOTE: ImageNet labels, not Ripple categories. Development only.')
