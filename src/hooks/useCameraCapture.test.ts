import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCameraCapture } from './useCameraCapture'

vi.mock('@/lib/compressImage', () => ({
  compressImage: vi.fn(async (f: File) => new Blob([await f.text()], { type: 'image/jpeg' })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * Desktop file-picker path (S3.7).
 *
 * This is the one of the three platforms in S3.5–S3.7 that can be verified
 * without hardware: on desktop there is no camera, so `capture="environment"`
 * is ignored and the same <input type="file"> becomes a file picker. The hook
 * takes the identical code path, so exercising a File through it IS the desktop
 * test — iOS and Android differ only in which OS surface the input opens.
 */
describe('useCameraCapture — desktop file picker path', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCameraCapture())
    expect(result.current.photo).toBeNull()
    expect(result.current.preview).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('accepts a chosen file and produces a compressed blob plus a preview', async () => {
    const { result } = renderHook(() => useCameraCapture())
    const file = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' })

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [file], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })

    await waitFor(() => expect(result.current.photo).not.toBeNull())
    expect(result.current.preview).toBeTruthy()
    expect(result.current.isProcessing).toBe(false)
  })

  it('ignores an empty selection — cancelling the picker is not an error', async () => {
    const { result } = renderHook(() => useCameraCapture())

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.photo).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('surfaces a compression failure instead of hanging', async () => {
    const { compressImage } = await import('@/lib/compressImage')
    vi.mocked(compressImage).mockRejectedValueOnce(new Error('Failed to load image'))

    const { result } = renderHook(() => useCameraCapture())
    const file = new File(['x'], 'bad.jpg', { type: 'image/jpeg' })

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [file], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.isProcessing).toBe(false)
  })

  it('clears state on reset', async () => {
    const { result } = renderHook(() => useCameraCapture())
    const file = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' })

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [file], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })
    await waitFor(() => expect(result.current.photo).not.toBeNull())

    act(() => {
      result.current.reset()
    })

    await waitFor(() => expect(result.current.photo).toBeNull())
    expect(result.current.preview).toBeNull()
  })
})
