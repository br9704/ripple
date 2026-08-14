import { useEffect, useRef } from 'react'

/**
 * Calls `onLoadMore` when a sentinel element scrolls into view (S10.5).
 *
 * IntersectionObserver rather than a scroll listener: a scroll handler fires on
 * every frame and has to be throttled, whereas this only wakes when the
 * sentinel actually approaches the viewport. `rootMargin` starts the fetch
 * before the user hits the bottom, so pagination is invisible rather than a
 * visible stall.
 *
 * Returns a ref to attach to the sentinel.
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  { enabled = true, rootMargin = '400px' }: { enabled?: boolean; rootMargin?: string } = {}
) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onLoadMore)

  useEffect(() => {
    callbackRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !enabled) return
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) callbackRef.current()
      },
      { rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, rootMargin])

  return sentinelRef
}
