import type { MapPin } from '@/types'

export type SortOption = 'newest' | 'upvotes' | 'priority'

export const SORT_LABELS: Record<SortOption, string> = {
  newest: 'newest',
  upvotes: 'most upvoted',
  priority: 'highest priority',
}

/**
 * Sorts reports for the feed.
 *
 * Returns a new array — callers pass memoised results straight into render, and
 * an in-place sort would mutate the shared `useReports` state and produce
 * update loops that are miserable to trace.
 *
 * Every comparator falls back to `id` so ordering is total and stable: two
 * reports submitted in the same millisecond, or tied on upvotes, must not swap
 * places between renders.
 */
export function sortReports(reports: MapPin[], sort: SortOption): MapPin[] {
  const copy = [...reports]

  switch (sort) {
    case 'upvotes':
      return copy.sort(
        (a, b) => b.upvote_count - a.upvote_count || a.id.localeCompare(b.id)
      )
    case 'priority':
      return copy.sort(
        (a, b) => b.priority_score - a.priority_score || a.id.localeCompare(b.id)
      )
    case 'newest':
    default:
      return copy.sort((a, b) => {
        const ta = new Date(a.submitted_at).getTime()
        const tb = new Date(b.submitted_at).getTime()
        const va = Number.isFinite(ta) ? ta : 0
        const vb = Number.isFinite(tb) ? tb : 0
        return vb - va || a.id.localeCompare(b.id)
      })
  }
}
