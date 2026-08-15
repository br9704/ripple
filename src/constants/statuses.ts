import type { ReportStatus } from '@/types'

export interface StatusConfig {
  key: ReportStatus
  label: string
  /**
   * SIGNAL colour for the status dot.
   *
   * Green appears ONLY on `fixed` (MOTION.md:89) — it is the payoff state and
   * spending the colour anywhere else devalues it. `declined` / `wont_fix` are
   * dim rather than red: a refusal is information, and red is not in this
   * palette. Everything else is grayscale or amber.
   */
  color: string
  /** Terminal-style marker, so status reads without relying on colour. */
  marker: string
  /** True once the report has reached a terminal state. */
  isTerminal: boolean
}

/**
 * These hexes duplicate the `--color-status-*` tokens in `index.css`, because
 * they are consumed by Mapbox paint properties, which take literal colour
 * values and cannot read a CSS custom property.
 *
 * That duplication is exactly how S21.13 happened. `#55504a` failed WCAG AA at
 * 2.56:1 and was raised in `index.css` for `--color-text-tertiary` in an
 * earlier sprint — but the identical value in `--color-status-declined`, and
 * its copy here, were both missed, so a fixed contrast bug went on rendering
 * from two other places. Any change to a colour below must be made in
 * `index.css` too, and `statuses.contrast.test.ts` now fails the build if the
 * two files disagree or if any value drops under 4.5:1.
 *
 * Every value here is measured against `--color-bg` (#050505), not chosen by
 * eye, and the `marker` glyph means colour is never the only differentiator
 * (PRD §10.2).
 */
export const STATUSES: StatusConfig[] = [
  { key: 'reported',    label: 'Reported',    color: '#98928a', marker: '○', isTerminal: false }, // 6.61:1
  { key: 'acknowledged', label: 'Acknowledged', color: '#9e6d00', marker: '◔', isTerminal: false }, // 4.50:1
  { key: 'in_progress', label: 'In Progress', color: '#ffb000', marker: '◑', isTerminal: false }, // 11.12:1
  { key: 'fixed',       label: 'Fixed',       color: '#4e8252', marker: '●', isTerminal: true  }, // 4.50:1
  { key: 'declined',    label: 'Declined',    color: '#7d756d', marker: '✕', isTerminal: true  }, // 4.50:1
  { key: 'wont_fix',    label: "Won't Fix",   color: '#7d756d', marker: '✕', isTerminal: true  }, // 4.50:1
]

export const STATUS_MAP = Object.fromEntries(
  STATUSES.map((s) => [s.key, s])
) as Record<ReportStatus, StatusConfig>
