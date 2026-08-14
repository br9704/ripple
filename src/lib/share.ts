export type ShareOutcome = 'shared' | 'copied' | 'unavailable'

export interface SharePayload {
  title: string
  text: string
  url: string
}

/**
 * Shares a report, falling back to the clipboard.
 *
 * Web Share API where available (iOS Safari and Android Chrome both have it,
 * and it opens the native sheet), clipboard otherwise. Returns which path was
 * taken so the caller can confirm — a silent clipboard write with no feedback
 * reads as a broken button.
 *
 * A user cancelling the native sheet throws AbortError. That is not a failure
 * and must not surface as one.
 */
export async function shareReport(payload: SharePayload): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'unavailable'
      // Fall through to clipboard — some browsers reject share() for reasons
      // unrelated to the user's intent.
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload.url)
      return 'copied'
    } catch {
      return 'unavailable'
    }
  }

  return 'unavailable'
}

/** Short human-facing report reference, e.g. "Report #4f3a91b2". */
export function formatReportId(id: string): string {
  return `Report #${id.slice(0, 8)}`
}
