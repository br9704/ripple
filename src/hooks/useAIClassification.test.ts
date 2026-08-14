import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const loadClassifier = vi.fn()
const runInference = vi.fn()
const preprocessImage = vi.fn()

vi.mock('@/lib/litert', () => ({
  loadClassifier: (...a: unknown[]) => loadClassifier(...a),
  runInference: (...a: unknown[]) => runInference(...a),
}))
vi.mock('@/lib/preprocessImage', () => ({
  preprocessImage: (...a: unknown[]) => preprocessImage(...a),
}))

const { useAIClassification, __resetClassifierCache } = await import('./useAIClassification')

/** Ten scores, peaking on the category at `index`. */
function scores(index: number, peak: number): number[] {
  const rest = (1 - peak) / 9
  return Array.from({ length: 10 }, (_, i) => (i === index ? peak : rest))
}

// Blobs must be created ONCE and reused. Constructing one inside the
// renderHook callback yields a new identity on every render, which re-triggers
// the [photo] effect endlessly — an infinite loop that crashes the worker.
const PHOTO = new Blob(['photo-a'])
const PHOTO_B = new Blob(['photo-b'])

function fakeModel() {
  return { model: {}, accelerator: 'wasm' as const, inputSize: 224, quantised: false }
}

beforeEach(() => {
  __resetClassifierCache()
  loadClassifier.mockReset()
  runInference.mockReset()
  preprocessImage.mockReset()
  preprocessImage.mockResolvedValue({ data: new Float32Array(3), shape: [1, 224, 224, 3] })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAIClassification', () => {
  it('stays idle with no photo', () => {
    const { result } = renderHook(() => useAIClassification(null))
    expect(result.current.category).toBeNull()
    expect(result.current.isClassifying).toBe(false)
    expect(loadClassifier).not.toHaveBeenCalled()
  })

  it('classifies a photo and reports the top category with its tier', async () => {
    loadClassifier.mockResolvedValue(fakeModel())
    runInference.mockResolvedValue(scores(0, 0.94))

    const { result } = renderHook(() => useAIClassification(PHOTO))

    await waitFor(() => expect(result.current.isClassifying).toBe(false))
    expect(result.current.category).toBe('pothole')
    expect(result.current.confidence).toBeCloseTo(0.94, 2)
    expect(result.current.tier).toBe('certain')
    expect(result.current.error).toBeNull()
  })

  it('returns the top two for the low-confidence path', async () => {
    loadClassifier.mockResolvedValue(fakeModel())
    // Deliberately below the 60% threshold.
    const raw = [0.4, 0.3, ...Array(8).fill(0.0375)]
    runInference.mockResolvedValue(raw)

    const { result } = renderHook(() => useAIClassification(PHOTO))

    await waitFor(() => expect(result.current.isClassifying).toBe(false))
    expect(result.current.tier).toBe('offering')
    expect(result.current.top2).toHaveLength(2)
    expect(result.current.top2.map((p) => p.category)).toEqual(['pothole', 'streetlight'])
  })

  it('measures elapsed time for the latency budget', async () => {
    loadClassifier.mockResolvedValue(fakeModel())
    runInference.mockResolvedValue(scores(2, 0.9))

    const { result } = renderHook(() => useAIClassification(PHOTO))

    await waitFor(() => expect(result.current.isClassifying).toBe(false))
    expect(result.current.elapsedMs).toBeTypeOf('number')
    expect(result.current.elapsedMs!).toBeGreaterThanOrEqual(0)
  })

  describe('graceful degradation — the contract that matters most', () => {
    it('surfaces a model-load failure as error, never a throw', async () => {
      // A missing .tflite is the *expected* state until OG2 lands, so this is
      // the normal path, not an edge case.
      loadClassifier.mockRejectedValue(new Error('Model fetch failed: 404 Not Found'))

      const { result } = renderHook(() => useAIClassification(PHOTO))

      await waitFor(() => expect(result.current.isClassifying).toBe(false))
      expect(result.current.error).toMatch(/404/)
      expect(result.current.category).toBeNull()
      expect(result.current.tier).toBeNull()
    })

    it('survives an inference failure', async () => {
      loadClassifier.mockResolvedValue(fakeModel())
      runInference.mockRejectedValue(new Error('Operation Not Supported'))

      const { result } = renderHook(() => useAIClassification(PHOTO))

      await waitFor(() => expect(result.current.isClassifying).toBe(false))
      expect(result.current.error).toMatch(/Not Supported/)
      expect(result.current.category).toBeNull()
    })

    it('survives a preprocessing failure', async () => {
      loadClassifier.mockResolvedValue(fakeModel())
      preprocessImage.mockRejectedValue(new Error('Failed to decode image'))

      const { result } = renderHook(() => useAIClassification(PHOTO))

      await waitFor(() => expect(result.current.isClassifying).toBe(false))
      expect(result.current.error).toMatch(/decode/)
    })

    it('reports an error rather than a null category when the model returns nothing', async () => {
      loadClassifier.mockResolvedValue(fakeModel())
      runInference.mockResolvedValue([])

      const { result } = renderHook(() => useAIClassification(PHOTO))

      await waitFor(() => expect(result.current.isClassifying).toBe(false))
      expect(result.current.category).toBeNull()
      expect(result.current.error).toBeTruthy()
    })
  })

  it('lets the user override the prediction', async () => {
    loadClassifier.mockResolvedValue(fakeModel())
    runInference.mockResolvedValue(scores(0, 0.9))

    const { result } = renderHook(() => useAIClassification(PHOTO))
    await waitFor(() => expect(result.current.category).toBe('pothole'))

    result.current.override('graffiti')

    await waitFor(() => expect(result.current.category).toBe('graffiti'))
    expect(result.current.wasOverridden).toBe(true)
  })

  it('reuses the compiled model across photos', async () => {
    loadClassifier.mockResolvedValue(fakeModel())
    runInference.mockResolvedValue(scores(1, 0.88))

    const { result, rerender } = renderHook(({ p }) => useAIClassification(p), {
      initialProps: { p: PHOTO },
    })
    await waitFor(() => expect(result.current.isClassifying).toBe(false))

    rerender({ p: PHOTO_B })
    await waitFor(() => expect(result.current.isClassifying).toBe(false))

    // Compiling a model is expensive; doing it per photo would blow the budget.
    expect(loadClassifier).toHaveBeenCalledTimes(1)
    expect(runInference).toHaveBeenCalledTimes(2)
  })
})
