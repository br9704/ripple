import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/** One row of `my_streak()`, exactly as PostgREST returns it. */
interface StreakRow {
  current_weeks: number
  longest_weeks: number
  weeks_active: number
  last_report_at: string | null
}

export interface StreakSummary {
  /**
   * Consecutive weeks with at least one report, counting a run that ended last
   * week as still current. Migration 026 grants that one week of grace on
   * purpose, so the number does not appear to collapse every Monday morning
   * before the user has had any chance to see something broken.
   */
  currentWeeks: number
  /** The longest run ever, which survives a lapse. */
  longestWeeks: number
  /** Distinct weeks with at least one report, consecutive or not. */
  weeksActive: number
  /** ISO timestamp of the most recent report, or null if there has never been one. */
  lastReportAt: string | null
}

export interface UseStreakResult {
  streak: StreakSummary | null
  isLoading: boolean
  error: string | null
}

const EMPTY: StreakSummary = {
  currentWeeks: 0,
  longestWeeks: 0,
  weeksActive: 0,
  lastReportAt: null,
}

/**
 * The caller's own reporting streak (S21.4, PRD §5.5).
 *
 * Identity comes from the `x-reporter-token` header that `lib/supabase.ts`
 * attaches to every request, so `my_streak()` takes no argument. That is not an
 * omission: a token parameter would turn the function into an oracle returning
 * any user's history to anyone who could name their token.
 *
 * The unit is weeks, never reports — migration 026's second design note explains
 * why at length, and the short version is that a mechanic which rewards volume
 * rewards inventing reports, and a fabricated report costs a council a real
 * truck roll. Nothing in this hook derives a per-report figure, and nothing
 * downstream should: PRD §13.4 rules out gamification that could push someone
 * toward reporting things that are not there.
 *
 * Read-only and fire-once. There is no refresh: a streak changes at most once a
 * week, and the page it lives on is mounted fresh each visit.
 */
export function useStreak(): UseStreakResult {
  const [streak, setStreak] = useState<StreakSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const { data, error: err } = await supabase.rpc('my_streak')
      if (cancelled) return

      if (err) {
        // No partial state: showing a zeroed streak on a failed request would
        // tell the user their run had ended when it had not.
        setError(err.message)
        setIsLoading(false)
        return
      }

      // `my_streak()` is a set-returning function, so PostgREST hands back an
      // array. It always emits exactly one row — including for a request with
      // no token, where every column is zero — but the empty case is handled
      // anyway rather than indexing into nothing.
      const row = ((data as StreakRow[] | null) ?? [])[0]
      setStreak(
        row
          ? {
              currentWeeks: row.current_weeks,
              longestWeeks: row.longest_weeks,
              weeksActive: row.weeks_active,
              lastReportAt: row.last_report_at,
            }
          : EMPTY
      )
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { streak, isLoading, error }
}
