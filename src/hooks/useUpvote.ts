import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getReporterToken } from '@/lib/reporterToken'

export interface UpvoteState {
  upvoteCount: number
  hasUpvoted: boolean
  isPending: boolean
  error: string | null
  toggle: () => Promise<void>
}

/**
 * "I see this too" — the social-proof mechanism (PRD §6.4).
 *
 * Optimistic by design: the count moves the instant the user taps, and rolls
 * back on failure. A civic reporting tool used one-handed at a bus stop cannot
 * afford a round-trip before acknowledging a tap.
 *
 * Identity is the anonymous `reporter_token`, never an account. Note that
 * migration 015 scopes `upvotes` SELECT to own-rows-only, so the *public* tally
 * comes from `reports.upvote_count` (maintained by the 011 trigger) while the
 * "have I upvoted this?" check reads the caller's own row. Before 015 the
 * upvotes table published every reporter_token to anyone with the anon key.
 */
export function useUpvote(reportId: string, initialCount: number): UpvoteState {
  const [upvoteCount, setUpvoteCount] = useState(initialCount)
  const [hasUpvoted, setHasUpvoted] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep in step when the parent receives a Realtime update for this report.
  const [syncedFor, setSyncedFor] = useState(initialCount)
  if (syncedFor !== initialCount) {
    setSyncedFor(initialCount)
    setUpvoteCount(initialCount)
  }

  useEffect(() => {
    let cancelled = false

    async function checkExisting() {
      const { data, error: err } = await supabase
        .from('upvotes')
        .select('id')
        .eq('report_id', reportId)
        .eq('reporter_token', getReporterToken())
        .maybeSingle()

      if (cancelled || err) return
      setHasUpvoted(Boolean(data))
    }

    void checkExisting()
    return () => {
      cancelled = true
    }
  }, [reportId])

  const toggle = useCallback(async () => {
    if (isPending) return

    const token = getReporterToken()
    const wasUpvoted = hasUpvoted
    const previousCount = upvoteCount

    // Optimistic.
    setHasUpvoted(!wasUpvoted)
    setUpvoteCount(previousCount + (wasUpvoted ? -1 : 1))
    setIsPending(true)
    setError(null)

    try {
      if (wasUpvoted) {
        const { error: err } = await supabase
          .from('upvotes')
          .delete()
          .eq('report_id', reportId)
          .eq('reporter_token', token)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('upvotes')
          .insert({ report_id: reportId, reporter_token: token })
        // 23505 is the UNIQUE(report_id, reporter_token) constraint: the user
        // already upvoted, so the optimistic state is correct and this is not
        // an error worth showing them.
        if (err && err.code !== '23505') throw err
      }
    } catch (err) {
      // Roll back.
      setHasUpvoted(wasUpvoted)
      setUpvoteCount(previousCount)
      setError(err instanceof Error ? err.message : 'Could not register your upvote')
    } finally {
      setIsPending(false)
    }
  }, [reportId, hasUpvoted, upvoteCount, isPending])

  return { upvoteCount, hasUpvoted, isPending, error, toggle }
}
