/** Characters used by the SIGNAL loader: `[████░░░░] 72%`. */
export const BAR_FILLED = '█'
export const BAR_EMPTY = '░'
export const BAR_WIDTH = 12

/**
 * Renders a progress fraction as a monospace bar.
 *
 * Pure and separately testable, because the honesty rules around this bar
 * matter more than its appearance: MOTION.md requires that it hold at 90%
 * until a real result arrives and never fake completion, so "what does 0.9
 * render as" and "can this ever show 100% early" are behaviours worth pinning
 * down in tests rather than eyeballing.
 *
 * @param progress 0–1. Values outside the range are clamped, not rejected —
 *                 a rounding error upstream must never crash the capture flow.
 */
export function renderBar(progress: number, width: number = BAR_WIDTH): string {
  const safe = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  const filled = Math.round(safe * width)
  return BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(width - filled)
}

/** Formats a 0–1 fraction as an integer percentage, e.g. `72%`. */
export function formatPercent(progress: number): string {
  const safe = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  return `${Math.round(safe * 100)}%`
}

/** The full readout: `[████░░░░] 72%`. */
export function renderLoader(progress: number, width: number = BAR_WIDTH): string {
  return `[${renderBar(progress, width)}] ${formatPercent(progress)}`
}
