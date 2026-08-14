import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MapPin, ReportCategory, ReportStatus } from '@/types'

export type SearchSort = 'relevance' | 'newest' | 'upvotes' | 'priority'

export interface SearchParams {
  query: string
  categories?: ReportCategory[]
  statuses?: ReportStatus[]
  minUpvotes?: number
  sort?: SearchSort
  pageSize?: number
}

export interface SearchResult extends MapPin {
  rank: number
}

interface SearchRow extends Omit<SearchResult, 'photo_url'> {
  total_count: number
}

export interface UseSearchResult {
  results: SearchResult[]
  total: number
  isSearching: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
}

const DEBOUNCE_MS = 250

/**
 * Full-text search over reports.
 *
 * Backed by the Postgres `search_reports` RPC (migration 016) rather than
 * Elasticsearch — see OG4 for why. The interface here is deliberately backend-
 * agnostic: swapping in ES later means changing this hook's body and nothing
 * else in the UI.
 *
 * Debounced, and every in-flight request carries a sequence number so a slow
 * response for "pot" can never overwrite a fast one for "pothole". Without
 * that guard, search results visibly flicker back to earlier queries.
 */
export function useSearch(params: SearchParams): UseSearchResult {
  const { query, categories, statuses, minUpvotes = 0, sort = 'relevance', pageSize = 20 } = params

  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const requestId = useRef(0)

  // Reset paging whenever the query itself changes, adjusting state during
  // render rather than from an effect.
  const signature = useMemo(
    () =>
      JSON.stringify([query, categories ?? [], statuses ?? [], minUpvotes, sort]),
    [query, categories, statuses, minUpvotes, sort]
  )
  const [renderedFor, setRenderedFor] = useState(signature)
  if (renderedFor !== signature) {
    setRenderedFor(signature)
    setPage(0)
  }

  // An empty query with no filters is not a search — it is the feed. Derived
  // at render rather than written into state from an effect, which would be
  // both a lint violation and an extra render for something already known.
  const trimmed = query.trim()
  const isEmptySearch =
    !trimmed && !categories?.length && !statuses?.length && minUpvotes <= 0

  useEffect(() => {
    if (isEmptySearch) return

    const id = ++requestId.current

    const timer = setTimeout(async () => {
      // Flagged as searching only once the request actually fires, not during
      // the debounce window — the user is still typing, not waiting on us.
      setIsSearching(true)

      const { data, error: err } = await supabase.rpc('search_reports', {
        p_query: trimmed || null,
        p_categories: categories?.length ? categories : null,
        p_statuses: statuses?.length ? statuses : null,
        p_min_upvotes: minUpvotes,
        p_sort: sort,
        p_limit: pageSize,
        p_offset: page * pageSize,
      })

      // A stale response must never overwrite a newer one.
      if (id !== requestId.current) return

      if (err) {
        setError(err.message)
        setIsSearching(false)
        return
      }

      const rows = (data as SearchRow[]) ?? []
      const mapped: SearchResult[] = rows.map((r) => ({ ...r, photo_url: null }))

      setError(null)
      setTotal(rows[0]?.total_count ?? 0)
      setResults((prev) => (page === 0 ? mapped : [...prev, ...mapped]))
      setIsSearching(false)
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [isEmptySearch, trimmed, query, categories, statuses, minUpvotes, sort, page, pageSize])

  const loadMore = useCallback(() => setPage((p) => p + 1), [])

  if (isEmptySearch) {
    return { results: [], total: 0, isSearching: false, error: null, hasMore: false, loadMore }
  }

  return {
    results,
    total,
    isSearching,
    error,
    hasMore: results.length < total,
    loadMore,
  }
}
