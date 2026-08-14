import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { TabBar } from '@/components/TabBar'
import { CameraFab } from '@/components/CameraFab'
import { ReportFeed } from '@/components/ReportFeed'
import { TypingLine } from '@/components/TypingLine'
import { NotificationSettings } from '@/components/NotificationSettings'
import { supabase } from '@/lib/supabase'
import { getReporterToken } from '@/lib/reporterToken'
import { sortReports } from '@/lib/reportSort'
import type { MapPin } from '@/types'

interface ReportRow extends Omit<MapPin, 'photo_url'> {
  report_photos?: { public_url: string; photo_type: string }[] | null
}

const SELECT =
  'id, lat, lng, category, status, upvote_count, priority_score, address, suburb, submitted_at, report_photos(public_url, photo_type)'

/**
 * The reporter's own submissions (PRD §12.1).
 *
 * Scoped by the anonymous `reporter_token` in localStorage — this is the user's
 * only route back to their own reports, because there is no account by design
 * (PRD §6.1). Clearing site data therefore loses the history permanently, which
 * is a deliberate trade for requiring no personal information at all.
 */
export function MyReportsPage() {
  const [reports, setReports] = useState<MapPin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchMine() {
      const { data, error: err } = await supabase
        .from('reports')
        .select(SELECT)
        .eq('reporter_token', getReporterToken())
        .order('submitted_at', { ascending: false })

      if (cancelled) return
      if (err) {
        setError(true)
        setIsLoading(false)
        return
      }

      setReports(
        ((data as ReportRow[]) ?? []).map((row) => {
          const original =
            row.report_photos?.find((p) => p.photo_type === 'original') ?? row.report_photos?.[0]
          return { ...row, photo_url: original?.public_url ?? null }
        })
      )
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

        <div className="px-4 py-3">
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
