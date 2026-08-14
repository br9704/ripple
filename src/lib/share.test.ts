import { describe, it, expect, vi, afterEach } from 'vitest'
import { shareReport, formatReportId } from './share'

const payload = { title: 'Pothole', text: 'Reported on Ripple', url: 'https://x/report/1' }

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('shareReport', () => {
  it('uses the Web Share API when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })
    await expect(shareReport(payload)).resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith(payload)
  })

  it('treats a cancelled share sheet as a non-event, not an error', async () => {
    // The user closing the sheet is a decision, not a failure, and must not
    // surface as one.
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(abort) })
    await expect(shareReport(payload)).resolves.toBe('unavailable')
  })

  it('falls back to the clipboard when share is absent', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(shareReport(payload)).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(payload.url)
  })

  it('falls back to the clipboard when share rejects for a non-abort reason', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      clipboard: { writeText },
    })
    await expect(shareReport(payload)).resolves.toBe('copied')
  })

  it('reports unavailable when neither path exists', async () => {
    vi.stubGlobal('navigator', {})
    await expect(shareReport(payload)).resolves.toBe('unavailable')
  })

  it('reports unavailable when the clipboard write is denied', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    await expect(shareReport(payload)).resolves.toBe('unavailable')
  })
})

describe('formatReportId', () => {
  it('shortens a UUID to a readable reference', () => {
    expect(formatReportId('4f3a91b2-1234-5678-9abc-def012345678')).toBe('Report #4f3a91b2')
  })

  it('does not throw on a short id', () => {
    expect(formatReportId('abc')).toBe('Report #abc')
  })
})
