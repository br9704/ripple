import type { ReportCategory, ReportStatus } from '@/types'
import type { DateRange } from '@/stores/filterStore'

export interface ShareableFilters {
  categories: ReportCategory[]
  statuses: ReportStatus[]
  dateRange: DateRange
  minUpvotes: number
}

const DATE_RANGES: DateRange[] = ['7d', '30d', '90d', 'all']

/**
 * Encodes filters into URL search params (S20.1).
 *
 * This is what turns "47 reports in Fitzroy North in the past 30 days, 18 of
 * them accessibility issues" from an anecdote into a link a councillor can
 * open — PRD §3.5, Deb's persona, which is the entire argument for the feature.
 *
 * Only non-default values are written, so a shared link stays short and its
 * intent stays readable.
 */
export function encodeFilters(f: ShareableFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.categories.length) p.set('cat', f.categories.join(','))
  if (f.statuses.length) p.set('status', f.statuses.join(','))
  if (f.dateRange !== 'all') p.set('since', f.dateRange)
  if (f.minUpvotes > 0) p.set('minup', String(f.minUpvotes))
  return p
}

/**
 * Decodes filters from URL params.
 *
 * Every value is validated against the known sets. A shared link is untrusted
 * input — someone can hand-edit it — and an unrecognised category must be
 * dropped rather than reaching a Mapbox expression or a database query.
 */
export function decodeFilters(
  params: URLSearchParams,
  validCategories: readonly ReportCategory[],
  validStatuses: readonly ReportStatus[]
): ShareableFilters {
  const csv = (key: string): string[] =>
    (params.get(key) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const rawSince = params.get('since')
  const rawMin = Number(params.get('minup'))

  return {
    categories: csv('cat').filter((c): c is ReportCategory =>
      (validCategories as readonly string[]).includes(c)
    ),
    statuses: csv('status').filter((s): s is ReportStatus =>
      (validStatuses as readonly string[]).includes(s)
    ),
    dateRange: DATE_RANGES.includes(rawSince as DateRange) ? (rawSince as DateRange) : 'all',
    minUpvotes: Number.isFinite(rawMin) && rawMin > 0 ? Math.min(Math.floor(rawMin), 1000) : 0,
  }
}
