import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { TabBar } from '@/components/TabBar'
import { ReportFeed } from '@/components/ReportFeed'
import { TypingLine } from '@/components/TypingLine'
import { useSearch, type SearchSort } from '@/hooks/useSearch'

const SORTS: { value: SearchSort; label: string }[] = [
  { value: 'relevance', label: 'relevance' },
  { value: 'newest', label: 'newest' },
  { value: 'upvotes', label: 'upvotes' },
]

/**
 * Full-text search (PRD §12.1).
 *
 * Backed by Postgres FTS rather than Elasticsearch — see OG4. The distinction
 * is invisible here by design: this page talks to `useSearch`, so replacing the
 * backend later touches one hook and no UI.
 */
export function SearchPage() {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SearchSort>('relevance')

  const { results, total, isSearching, error, hasMore, loadMore } = useSearch({ query, sort })

  const trimmed = query.trim()

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <AppHeader />

      <div className="absolute inset-0 overflow-y-auto pb-20 pt-[52px]">
        <div className="space-y-3 border-b border-border px-4 py-3">
          <label className="block">
            <span className="sr-only">Search reports</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="pothole fitzroy"
              autoComplete="off"
              className="w-full border border-border-bright bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-action focus:outline-none"
            />
          </label>

          <div className="flex gap-2">
            {SORTS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSort(s.value)}
                aria-pressed={sort === s.value}
                className={`border px-2 py-1 font-mono text-xs transition-colors duration-150 ${
                  sort === s.value
                    ? 'border-action text-action'
                    : 'border-border-bright text-text-secondary hover:text-text-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {!trimmed ? (
          <div className="px-4 py-8">
            <TypingLine text="search by address, suburb, or note" />
          </div>
        ) : isSearching && results.length === 0 ? (
          <div className="px-4 py-8">
            <TypingLine text="searching..." />
          </div>
        ) : error ? (
          <p className="px-4 py-8 text-center font-mono text-xs text-text-tertiary">
            &gt; search unavailable
          </p>
        ) : (
          <>
            <p className="px-4 py-2 font-mono text-xs tabular-nums text-text-tertiary">
              {total} {total === 1 ? 'result' : 'results'}
            </p>

            <ReportFeed reports={results} emptyMessage={`nothing matches "${trimmed}"`} />

            {hasMore && (
              <div className="px-4 py-4">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isSearching}
                  className="w-full border border-border-bright px-3 py-2 font-mono text-xs text-text-secondary transition-colors hover:text-text-primary disabled:opacity-60"
                >
                  {isSearching ? '[loading...]' : '[ load more ]'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <TabBar />
    </div>
  )
}
