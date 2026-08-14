import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppHeader } from '@/components/AppHeader'
import { TabBar } from '@/components/TabBar'
import { CameraFab } from '@/components/CameraFab'
import { ReportFeed } from '@/components/ReportFeed'
import { FilterPanel } from '@/components/FilterPanel'
import { TypingLine } from '@/components/TypingLine'
import { Leaderboard } from '@/components/Leaderboard'
import { useReports } from '@/hooks/useReports'
import { useFilterStore } from '@/stores/filterStore'
import { applyFilters, countActiveFilters } from '@/lib/reportFilters'
import { sortReports, SORT_LABELS, type SortOption } from '@/lib/reportSort'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { SEARCH_DEFAULT_PAGE_SIZE } from '@/constants/config'

const SORT_OPTIONS: SortOption[] = ['newest', 'upvotes', 'priority']

/**
 * List view of recent reports (PRD §12.9).
 *
 * Shares the filter store and predicate with the map, so switching tabs never
 * changes which reports are considered to match — two implementations of
 * "matching" would drift and quietly show different answers for the same
 * filters.
 */
export function FeedPage() {
  const { reports, isLoading, error } = useReports()
  const [sort, setSort] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [visibleCount, setVisibleCount] = useState(SEARCH_DEFAULT_PAGE_SIZE)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const { categories, statuses, dateRange, minUpvotes, cityId } = useFilterStore()

  const criteria = useMemo(
    () => ({ categories, statuses, dateRange, minUpvotes, cityId }),
    [categories, statuses, dateRange, minUpvotes, cityId]
  )
  const activeFilterCount = countActiveFilters(criteria)

  const matching = useMemo(
    () => sortReports(applyFilters(reports, criteria), sort),
    [reports, criteria, sort]
  )

  // Page in place rather than re-querying: useReports already holds the full
  // set and subscribes to Realtime, so a server round-trip per page would be
  // slower AND would fight the live subscription.
  const visible = useMemo(() => matching.slice(0, visibleCount), [matching, visibleCount])
  const hasMore = visible.length < matching.length

  const sentinelRef = useInfiniteScroll(
    () => setVisibleCount((n) => n + SEARCH_DEFAULT_PAGE_SIZE),
    { enabled: hasMore }
  )

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <AppHeader />

      <div className="absolute inset-0 overflow-y-auto pb-32 pt-[52px]">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSort(option)}
                aria-pressed={sort === option}
                className={`border px-2 py-1 font-mono text-xs transition-colors duration-150 ${
                  sort === option
                    ? 'border-action text-action'
                    : 'border-border-bright text-text-secondary hover:text-text-primary'
                }`}
              >
                {SORT_LABELS[option]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowLeaderboard((v) => !v)}
            aria-pressed={showLeaderboard}
            className={`border px-2 py-1 font-mono text-xs transition-colors duration-150 ${
              showLeaderboard
                ? 'border-action text-action'
                : 'border-border-bright text-text-secondary hover:text-text-primary'
            }`}
          >
            top
          </button>

          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className={`border px-2 py-1 font-mono text-xs transition-colors duration-150 ${
              activeFilterCount > 0
                ? 'border-action text-action'
                : 'border-border-bright text-text-secondary hover:text-text-primary'
            }`}
          >
            filter{activeFilterCount > 0 ? ` [${activeFilterCount}]` : ''}
          </button>
        </div>

        {showLeaderboard && (
          <div className="border-b border-border px-4 py-3">
            <Leaderboard />
          </div>
        )}

        {isLoading ? (
          <div className="px-4 py-8">
            <TypingLine text="loading reports..." />
          </div>
        ) : error ? (
          <p className="px-4 py-8 text-center font-mono text-xs text-text-tertiary">
            &gt; could not load reports
          </p>
        ) : (
          <>
            <ReportFeed
              reports={visible}
              emptyMessage={
                activeFilterCount > 0 ? 'no reports match these filters' : 'no reports yet'
              }
            />
            {hasMore && (
              <div ref={sentinelRef} className="px-4 py-6 text-center">
                <span className="font-mono text-xs tabular-nums text-text-tertiary">
                  loading {matching.length - visible.length} more…
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showFilters && <FilterPanel onClose={() => setShowFilters(false)} />}
      </AnimatePresence>

      <CameraFab />
      <TabBar />
    </div>
  )
}
