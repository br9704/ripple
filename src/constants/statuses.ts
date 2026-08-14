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

export const STATUSES: StatusConfig[] = [
  { key: 'reported',    label: 'Reported',    color: '#98928a', marker: '○', isTerminal: false },
  { key: 'acknowledged', label: 'Acknowledged', color: '#8f6300', marker: '◔', isTerminal: false },
  { key: 'in_progress', label: 'In Progress', color: '#ffb000', marker: '◑', isTerminal: false },
  { key: 'fixed',       label: 'Fixed',       color: '#4a7c4e', marker: '●', isTerminal: true  },
  { key: 'declined',    label: 'Declined',    color: '#55504a', marker: '✕', isTerminal: true  },
  { key: 'wont_fix',    label: "Won't Fix",   color: '#55504a', marker: '✕', isTerminal: true  },
]

export const STATUS_MAP = Object.fromEntries(
  STATUSES.map((s) => [s.key, s])
) as Record<ReportStatus, StatusConfig>
