import type { MapPin } from '@/types'
import type { DateRange } from '@/stores/filterStore'
import type { ReportCategory, ReportStatus } from '@/types'

export interface ReportFilterCriteria {
  categories: ReportCategory[]
  statuses: ReportStatus[]
  dateRange: DateRange
  minUpvotes: number
}

const RANGE_DAYS: Record<Exclude<DateRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

/**
 * Applies the active filters to a report list.
 *
 * Pure and separate from the map so the same predicate can serve the feed in
 * Sprint 10 — two implementations of "what counts as matching" would inevitably
 * disagree, and the user would see different results for the same filters.
 *
 * An empty `categories` or `statuses` array means "no constraint", not "match
 * nothing". The inverse reading would render an empty map on first open.
 */
export function applyFilters(
  reports: MapPin[],
  criteria: ReportFilterCriteria,
  now: number = Date.now()
): MapPin[] {
  const { categories, statuses, dateRange, minUpvotes } = criteria

  const cutoff =
    dateRange === 'all' ? null : now - RANGE_DAYS[dateRange] * 24 * 60 * 60 * 1000

  return reports.filter((r) => {
    if (categories.length > 0 && !categories.includes(r.category)) return false
    if (statuses.length > 0 && !statuses.includes(r.status)) return false
    if (minUpvotes > 0 && r.upvote_count < minUpvotes) return false

    if (cutoff !== null) {
      const submitted = new Date(r.submitted_at).getTime()
      // An unparseable timestamp must not silently delete a report from the
      // map; keep it and let it be visible rather than vanishing.
      if (Number.isFinite(submitted) && submitted < cutoff) return false
    }

    return true
  })
}

/** How many filter dimensions are currently narrowing the view. */
export function countActiveFilters(criteria: ReportFilterCriteria): number {
  let n = 0
  if (criteria.categories.length > 0) n++
  if (criteria.statuses.length > 0) n++
  if (criteria.dateRange !== 'all') n++
  if (criteria.minUpvotes > 0) n++
  return n
}

/** Reports submitted at or after `since` (epoch ms). */
export function countReportsSince(reports: MapPin[], since: number): number {
  return reports.filter((r) => {
    const t = new Date(r.submitted_at).getTime()
    return Number.isFinite(t) && t >= since
  }).length
}
