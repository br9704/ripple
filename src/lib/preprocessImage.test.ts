import { describe, it, expect } from 'vitest'
import { imageDataToTensor } from './preprocessImage'

/** Builds ImageData with every pixel set to the same RGBA value. */
function solid(size: number, r: number, g: number, b: number, a = 255): ImageData {
  const data = new Uint8ClampedArray(size * size * 4)
  for (let p = 0; p < size * size; p++) {
    data[p * 4] = r
    data[p * 4 + 1] = g
    data[p * 4 + 2] = b
    data[p * 4 + 3] = a
  }
  return { data, width: size, height: size, colorSpace: 'srgb' } as ImageData
}

describe('imageDataToTensor', () => {
  it('emits NHWC shape by default', () => {
    const { shape } = imageDataToTensor(solid(4, 0, 0, 0), { size: 4 })
    expect(shape).toEqual([1, 4, 4, 3])
  })

  it('emits NCHW shape when asked', () => {
    const { shape } = imageDataToTensor(solid(4, 0, 0, 0), { size: 4, layout: 'nchw' })
    expect(shape).toEqual([1, 3, 4, 4])
  })

  it('drops the alpha channel — 3 values per pixel, not 4', () => {
    // Keeping alpha would shift every subsequent pixel, producing a tensor of
    // the right length and entirely wrong content.
    const { data } = imageDataToTensor(solid(8, 10, 20, 30), { size: 8 })
    expect(data).toHaveLength(8 * 8 * 3)
  })

  it('scales to 0–1 with default mean/std', () => {
    const { data } = imageDataToTensor(solid(2, 255, 0, 128), { size: 2 })
    expect(data[0]).toBeCloseTo(1)
    expect(data[1]).toBeCloseTo(0)
    expect(data[2]).toBeCloseTo(128 / 255)
  })

  it('applies per-channel normalisation', () => {
    const { data } = imageDataToTensor(solid(2, 255, 255, 255), {
      size: 2,
      mean: [0.5, 0.5, 0.5],
      std: [0.5, 0.5, 0.5],
    })
    // (1.0 - 0.5) / 0.5 = 1.0
    expect(data[0]).toBeCloseTo(1)
  })

  it('interleaves RGB in NHWC order', () => {
    const { data } = imageDataToTensor(solid(2, 255, 0, 0), { size: 2 })
    // Every triple should read (1, 0, 0).
    for (let p = 0; p < 4; p++) {
      expect(data[p * 3]).toBeCloseTo(1)
      expect(data[p * 3 + 1]).toBeCloseTo(0)
      expect(data[p * 3 + 2]).toBeCloseTo(0)
    }
  })

  it('planarises channels in NCHW order', () => {
    const { data } = imageDataToTensor(solid(2, 255, 0, 0), { size: 2, layout: 'nchw' })
    const pixels = 4
    // Whole red plane first, then green, then blue.
    for (let i = 0; i < pixels; i++) expect(data[i]).toBeCloseTo(1)
    for (let i = 0; i < pixels; i++) expect(data[pixels + i]).toBeCloseTo(0)
    for (let i = 0; i < pixels; i++) expect(data[pixels * 2 + i]).toBeCloseTo(0)
  })

  it('emits raw uint8 bytes in quantised mode, unnormalised', () => {
    // An int8/uint8 model carries its own quantisation parameters; normalising
    // here as well would apply the scaling twice.
    const { data } = imageDataToTensor(solid(2, 200, 100, 50), { size: 2, quantised: true })
    expect(data).toBeInstanceOf(Uint8Array)
    expect(data[0]).toBe(200)
    expect(data[1]).toBe(100)
    expect(data[2]).toBe(50)
  })

  it('produces float32 in the default path', () => {
    const { data } = imageDataToTensor(solid(2, 0, 0, 0), { size: 2 })
    expect(data).toBeInstanceOf(Float32Array)
  })

  it('is deterministic — the same bitmap yields identical tensors', () => {
    const a = imageDataToTensor(solid(4, 12, 34, 56), { size: 4 })
    const b = imageDataToTensor(solid(4, 12, 34, 56), { size: 4 })
    expect(Array.from(a.data)).toEqual(Array.from(b.data))
  })
})
