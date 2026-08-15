import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { TabBar } from '@/components/TabBar'
import { CameraFab } from '@/components/CameraFab'
import { ReportFeed } from '@/components/ReportFeed'
import { TypingLine } from '@/components/TypingLine'
import { NotificationSettings } from '@/components/NotificationSettings'
import { StreakCard } from '@/components/StreakCard'
import { ReferralCard } from '@/components/ReferralCard'
import { supabase } from '@/lib/supabase'
import { sortReports } from '@/lib/reportSort'
import type { MapPin } from '@/types'

/**
 * The reporter's own submissions (PRD §12.1).
 *
 * Scoped by the anonymous `reporter_token` in localStorage — this is the user's
 * only route back to their own reports, because there is no account by design
 * (PRD §6.1). Clearing site data therefore loses the history permanently, which
 * is a deliberate trade for requiring no personal information at all.
 *
 * The scoping happens server-side. This used to be
 * `.select(…).eq('reporter_token', getReporterToken())`, which needed SELECT on
 * that column — and a column readable in a WHERE clause is a column readable in
 * a select list, which is how any caller could harvest another reporter's token
 * and impersonate them. Migration 025 revokes the column and answers the same
 * question with `my_reports()`, which reads the token from the request header
 * the Supabase client already sends and never returns it.
 */
export function MyReportsPage() {
  const [reports, setReports] = useState<MapPin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchMine() {
      // Already ordered newest-first and photo-flattened by the function, so
      // there is no client-side join to get wrong.
      const { data, error: err } = await supabase.rpc('my_reports')

      if (cancelled) return
      if (err) {
        setError(true)
        setIsLoading(false)
        return
      }

      setReports((data as MapPin[] | null) ?? [])
      setIsLoading(false)
    }

    void fetchMine()
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = useMemo(() => sortReports(reports, 'newest'), [reports])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <AppHeader />

      <div className="absolute inset-0 overflow-y-auto pb-32 pt-[52px]">
        <div className="border-b border-border px-4 py-3">
          <h1 className="font-mono text-xs text-text-primary">my reports</h1>
          <p className="mt-1 font-mono text-xs text-text-tertiary">
            &gt; kept on this device only — no account, no tracking
          </p>
        </div>

        {/* S21.4 / S21.5. My Reports is the only surface that is already about
            this user's own activity, so it is where a streak and an invite code
            belong. Both are self-fetching and render honest empty states — a
            first-time visitor sees an explanation, never a zeroed counter
            framing an empty history as a failed one. */}
        <div className="space-y-3 px-4 py-3">
          <StreakCard />
          <ReferralCard />
          <NotificationSettings />
        </div>

        {isLoading ? (
          <div className="px-4 py-8">
            <TypingLine text="loading your reports..." />
          </div>
        ) : error ? (
          <p className="px-4 py-8 text-center font-mono text-xs text-text-tertiary">
            &gt; could not load your reports
          </p>
        ) : (
          <ReportFeed
            reports={sorted}
            emptyMessage="you haven't reported anything yet"
          />
        )}
      </div>

      <CameraFab />
      <TabBar />
    </div>
  )
}
