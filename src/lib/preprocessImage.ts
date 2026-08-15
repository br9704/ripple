/**
 * Canvas-based image preprocessing for on-device inference.
 *
 * Deliberately does NOT use TensorFlow.js. LiteRT's own quickstart routes
 * inference through `@litertjs/tfjs-interop`'s `runWithTfjsTensors`, which
 * would drag the frozen TF.js runtime (last release Oct 2024) back in purely
 * for tensor plumbing. `CompiledModel.run(Tensor[])` and
 * `Tensor.fromTypedArray()` are native to @litertjs/core, so Canvas → typed
 * array is all we need and TF.js can be removed from the project entirely.
 */

export type PixelLayout = 'nhwc' | 'nchw'

export interface PreprocessOptions {
  /** Square input edge, read from the model's own getInputDetails(). */
  size: number
  /** Channel order. TFLite vision models are almost always NHWC. */
  layout?: PixelLayout
  /** Per-channel mean, in 0–1 units. */
  mean?: [number, number, number]
  /** Per-channel standard deviation, in 0–1 units. */
  std?: [number, number, number]
  /** Emit uint8 (quantised input) instead of normalised float32. */
  quantised?: boolean
}

export interface PreprocessResult {
  /**
   * Pinned to `ArrayBuffer` rather than the default `ArrayBufferLike`: LiteRT's
   * `Tensor.fromTypedArray` accepts only `ArrayBuffer`-backed arrays, and a
   * `SharedArrayBuffer`-backed one would not be assignable. Every array here is
   * built with `new Uint8Array(n)` / `new Float32Array(n)`, so this is the true
   * type, not a widening cast.
   */
  data: Float32Array<ArrayBuffer> | Uint8Array<ArrayBuffer>
  shape: [number, number, number, number]
}

/**
 * Draws a bitmap into a square canvas using a centre crop.
 *
 * Centre crop rather than a squash: stretching a 4:3 photo to 1:1 distorts
 * aspect ratio, and a pothole rendered as an ellipse is a materially different
 * image from the ones the model was trained on. Cropping loses edges but keeps
 * geometry, which is what the classifier actually keys on.
 */
export function drawCentreCropped(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  size: number
): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Failed to get canvas 2D context for preprocessing')

  const edge = Math.min(sourceWidth, sourceHeight)
  const sx = (sourceWidth - edge) / 2
  const sy = (sourceHeight - edge) / 2

  ctx.drawImage(source, sx, sy, edge, edge, 0, 0, size, size)
  return ctx.getImageData(0, 0, size, size)
}

/**
 * Converts RGBA ImageData into the tensor layout the model expects.
 *
 * The alpha channel is dropped: these are opaque JPEGs, and a fourth channel
 * would silently shift every subsequent pixel, producing a tensor that is the
 * right size and completely wrong.
 */
export function imageDataToTensor(
  imageData: ImageData,
  options: PreprocessOptions
): PreprocessResult {
  const {
    size,
    layout = 'nhwc',
    mean = [0, 0, 0],
    std = [1, 1, 1],
    quantised = false,
  } = options

  const { data: rgba } = imageData
  const pixels = size * size

  if (quantised) {
    // uint8 input: hand the model raw bytes and let its own quantisation
    // parameters do the scaling. Normalising here would double-apply it.
    const out = new Uint8Array(pixels * 3)
    for (let p = 0; p < pixels; p++) {
      const src = p * 4
      if (layout === 'nhwc') {
        out[p * 3] = rgba[src]
        out[p * 3 + 1] = rgba[src + 1]
        out[p * 3 + 2] = rgba[src + 2]
      } else {
        out[p] = rgba[src]
        out[pixels + p] = rgba[src + 1]
        out[pixels * 2 + p] = rgba[src + 2]
      }
    }
    return {
      data: out,
      shape: layout === 'nhwc' ? [1, size, size, 3] : [1, 3, size, size],
    }
  }

  const out = new Float32Array(pixels * 3)
  for (let p = 0; p < pixels; p++) {
    const src = p * 4
    const r = (rgba[src] / 255 - mean[0]) / std[0]
    const g = (rgba[src + 1] / 255 - mean[1]) / std[1]
    const b = (rgba[src + 2] / 255 - mean[2]) / std[2]

    if (layout === 'nhwc') {
      out[p * 3] = r
      out[p * 3 + 1] = g
      out[p * 3 + 2] = b
    } else {
      out[p] = r
      out[pixels + p] = g
      out[pixels * 2 + p] = b
    }
  }

  return {
    data: out,
    shape: layout === 'nhwc' ? [1, size, size, 3] : [1, 3, size, size],
  }
}

/**
 * Full pipeline: Blob → decoded bitmap → centre crop → tensor.
 *
 * Uses createImageBitmap where available (it decodes off the main thread, which
 * matters when we are already inside a 3-second budget) and falls back to an
 * HTMLImageElement on Safari versions that lack it for Blobs.
 */
export async function preprocessImage(
  blob: Blob,
  options: PreprocessOptions
): Promise<PreprocessResult> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    try {
      const imageData = drawCentreCropped(bitmap, bitmap.width, bitmap.height, options.size)
      return imageDataToTensor(imageData, options)
    } finally {
      bitmap.close()
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const imageData = drawCentreCropped(img, img.width, img.height, options.size)
    return imageDataToTensor(imageData, options)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to decode image for classification'))
    img.src = src
  })
}
