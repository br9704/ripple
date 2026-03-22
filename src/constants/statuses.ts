import type { ReportStatus } from '@/types'

export interface StatusConfig {
  key: ReportStatus
  label: string
  color: string
}

export const STATUSES: StatusConfig[] = [
  { key: 'reported', label: 'Reported', color: '#8B949E' },
  { key: 'acknowledged', label: 'Acknowledged', color: '#388BFD' },
  { key: 'in_progress', label: 'In Progress', color: '#F0883E' },
  { key: 'fixed', label: 'Fixed', color: '#3FB950' },
  { key: 'declined', label: 'Declined', color: '#F85149' },
  { key: 'wont_fix', label: "Won't Fix", color: '#F85149' },
] as const

export const STATUS_MAP = Object.fromEntries(
  STATUSES.map((s) => [s.key, s])
) as Record<ReportStatus, StatusConfig>
