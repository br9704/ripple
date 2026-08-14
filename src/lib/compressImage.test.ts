import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { compressImage } from './compressImage'
import { PHOTO_MAX_WIDTH, PHOTO_JPEG_QUALITY } from '@/constants/config'

/**
 * jsdom implements neither image decoding nor canvas rasterisation, so we stub
 * both and assert on the geometry the implementation asks for. That is the part
 * that carries the logic — the actual pixel work is the browser's job.
 */

interface CanvasStub {
  width: number
  height: number
  getContext: ReturnType<typeof vi.fn>
  toBlob: ReturnType<typeof vi.fn>
}

let canvasStub: CanvasStub
let drawImage: ReturnType<typeof vi.fn>
let toBlobResult: Blob | null
let contextAvailable: boolean
let imageShouldFail: boolean
let naturalSize: { width: number; height: number }

const OriginalImage = globalThis.Image

beforeEach(() => {
  toBlobResult = new Blob(['compressed'], { type: 'image/jpeg' })
  contextAvailable = true
  imageShouldFail = false
  naturalSize = { width: 4000, height: 3000 }
  drawImage = vi.fn()

  canvasStub = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => (contextAvailable ? { drawImage } : null)),
    toBlob: vi.fn((cb: BlobCallback) => {
      // Async, like the real API.
      queueMicrotask(() => cb(toBlobResult))
    }),
  }

  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'canvas') return canvasStub as unknown as HTMLCanvasElement
    return OriginalDocumentCreateElement.call(document, tag)
  }) as typeof document.createElement)

  // Minimal Image stub that fires load/error on assignment to `src`.
  class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    width = 0
    height = 0
    set src(_value: string) {
      queueMicrotask(() => {
        if (imageShouldFail) {
          this.onerror?.()
        } else {
          this.width = naturalSize.width
          this.height = naturalSize.height
          this.onload?.()
        }
      })
    }
  }
  globalThis.Image = MockImage as unknown as typeof Image
})

const OriginalDocumentCreateElement = document.createElement

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.Image = OriginalImage
})

function file(): File {
  return new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
}

describe('compressImage', () => {
  it('scales a large photo down to PHOTO_MAX_WIDTH preserving aspect ratio', async () => {
    naturalSize = { width: 4000, height: 3000 }
    await compressImage(file())

    expect(canvasStub.width).toBe(PHOTO_MAX_WIDTH)
    // 3000 * (1920/4000) = 1440
    expect(canvasStub.height).toBe(1440)
  })

  it('never upscales an image narrower than the max', async () => {
    naturalSize = { width: 800, height: 600 }
    await compressImage(file())

    expect(canvasStub.width).toBe(800)
    expect(canvasStub.height).toBe(600)
  })

  it('leaves an image exactly at the max width untouched', async () => {
    naturalSize = { width: PHOTO_MAX_WIDTH, height: 1080 }
    await compressImage(file())

    expect(canvasStub.width).toBe(PHOTO_MAX_WIDTH)
    expect(canvasStub.height).toBe(1080)
  })

  it('rounds fractional heights to an integer', async () => {
    // Canvas dimensions must be integers; 1000/3333 would otherwise be fractional.
    naturalSize = { width: 3333, height: 1000 }
    await compressImage(file())

    expect(Number.isInteger(canvasStub.height)).toBe(true)
  })

  it('encodes as JPEG at the configured quality', async () => {
    await compressImage(file())
    expect(canvasStub.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      PHOTO_JPEG_QUALITY
    )
  })

  it('revokes the object URL once the image has loaded', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    await compressImage(file())
    expect(revoke).toHaveBeenCalled()
  })

  it('revokes the object URL on decode failure too, so it does not leak', async () => {
    imageShouldFail = true
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    await expect(compressImage(file())).rejects.toThrow(/Failed to load image/)
    expect(revoke).toHaveBeenCalled()
  })

  it('rejects when the 2D context is unavailable', async () => {
    contextAvailable = false
    await expect(compressImage(file())).rejects.toThrow(/canvas 2D context/)
  })

  it('rejects when encoding produces no blob', async () => {
    toBlobResult = null
    await expect(compressImage(file())).rejects.toThrow(/Failed to compress/)
  })
})
