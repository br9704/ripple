import { create } from 'zustand'
import type { ReportCategory, ReportStatus } from '@/types'

export type DateRange = '7d' | '30d' | '90d' | 'all'

export interface FilterState {
  /** Active city (S20.3/S20.4). Null means "all cities", which is the state a
      single-city deployment stays in. */
  cityId: string | null
  categories: ReportCategory[]
  statuses: ReportStatus[]
  dateRange: DateRange
  minUpvotes: number
  nearMe: boolean
  showHeatmap: boolean

  toggleCategory: (c: ReportCategory) => void
  toggleStatus: (s: ReportStatus) => void
  setDateRange: (r: DateRange) => void
  setMinUpvotes: (n: number) => void
  setNearMe: (v: boolean) => void
  toggleHeatmap: () => void
  setCity: (id: string | null) => void
  reset: () => void
}

/** The filter fields only — `showHeatmap` is a view mode, not a filter. */
const INITIAL_FILTERS = {
  categories: [] as ReportCategory[],
  statuses: [] as ReportStatus[],
  dateRange: 'all' as DateRange,
  minUpvotes: 0,
  nearMe: false,
  cityId: null as string | null,
}

/**
 * Map filter state.
 *
 * Global rather than local because three separate surfaces read it — the map
 * layers, the filter panel's active-count badge, and (from Sprint 10) the feed —
 * and threading it through props would couple components that otherwise have
 * nothing to do with each other.
 *
 * An empty `categories` or `statuses` array means "no filter", not "match
 * nothing". That reading is load-bearing: the inverse would render an empty map
 * on first open, which reads as a broken app rather than an unfiltered one.
 *
 * This is the first use of Zustand, which has been an unused dependency since
 * Sprint 0 (see the S0.2 correction).
 */
export const useFilterStore = create<FilterState>((set) => ({
  ...INITIAL_FILTERS,
  showHeatmap: false,

  toggleCategory: (c) =>
    set((s) => ({
      categories: s.categories.includes(c)
        ? s.categories.filter((x) => x !== c)
        : [...s.categories, c],
    })),

  toggleStatus: (st) =>
    set((s) => ({
      statuses: s.statuses.includes(st)
        ? s.statuses.filter((x) => x !== st)
        : [...s.statuses, st],
    })),

  setDateRange: (dateRange) => set({ dateRange }),
  setMinUpvotes: (minUpvotes) => set({ minUpvotes }),
  setNearMe: (nearMe) => set({ nearMe }),
  toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
  setCity: (cityId) => set({ cityId }),

  // `set` merges partials, so omitting showHeatmap leaves it untouched. The
  // heatmap is a view mode, not a filter: clearing filters should not change
  // how the user is looking at the map.
  reset: () => set({ ...INITIAL_FILTERS }),
}))
