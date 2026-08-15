import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Report, ReportPhoto, StatusHistory } from '@/types'

export interface ReportDetailData extends Report {
  photos: ReportPhoto[]
  status_history: StatusHistory[]
  council_name: string | null
  /**
   * Whether this report belongs to the caller's own reporter token.
   *
   * Answered by the `is_my_report` RPC rather than by comparing
   * `report.reporter_token` in the browser: migration 025 revokes SELECT on
   * that column, because a token any client could read is a token any client
   * could impersonate.
   */
  is_mine: boolean
}

// Every column spelled out. `select=*` is no longer valid for the anon role —
// it expands to include reports.reporter_token, which is revoked (migration
// 025) — and an explicit list is what keeps this query and the `Report` type
// honest with each other. Same for report_photos, which carries
// uploaded_by_token.
const SELECT = `
  id, council_id, category, ai_category, ai_confidence, user_corrected_ai,
  lat, lng, address, suburb, postcode, note, status, council_note,
  priority_score, upvote_count, submitted_at, status_updated_at, fixed_at,
  report_photos(id, report_id, storage_path, public_url, photo_type, uploaded_at),
  status_history(id, report_id, from_status, to_status, changed_by, council_note, created_at),
  councils(name)
`

export interface UseReportResult {
  report: ReportDetailData | null
  isLoading: boolean
  /** True when the id is well-formed but no such report exists. */
  notFound: boolean
  error: string | null
}

/**
 * Fetches one report with its photos, status history and council.
 *
 * Distinguishes "not found" from "failed to load" because they need different
 * screens: a missing report is a dead end that should offer a route back, while
 * a network failure is worth retrying and must not tell the user their report
 * was deleted.
 */
export function useReport(id: string | undefined): UseReportResult {
  const [report, setReport] = useState<ReportDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // A missing id is derived below rather than written into state here —
    // setting state directly in an effect is both a lint violation and an
    // extra render for something already known at render time.
    if (!id) return

    let cancelled = false

    async function fetchReport() {
      // Issued together rather than in sequence: ownership is only needed to
      // decide whether to render the fix-confirmation control, and waiting for
      // it would delay the whole page for a boolean.
      const [{ data, error: err }, ownership] = await Promise.all([
        supabase.from('reports').select(SELECT).eq('id', id).maybeSingle(),
        supabase.rpc('is_my_report', { p_report_id: id }),
      ])

      if (cancelled) return

      if (err) {
        setError(err.message)
        setIsLoading(false)
        return
      }

      if (!data) {
        setNotFound(true)
        setIsLoading(false)
        return
      }

      const row = data as unknown as Report & {
        report_photos?: ReportPhoto[] | null
        status_history?: StatusHistory[] | null
        councils?: { name: string } | null
      }

      setReport({
        ...row,
        // A failed ownership check falls back to "not mine": showing the
        // confirm-fix control to a non-owner is the worse error, and the
        // server rejects it anyway.
        is_mine: ownership.data === true,
        photos: row.report_photos ?? [],
        // Oldest first: a timeline reads forwards.
        status_history: [...(row.status_history ?? [])].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
        council_name: row.councils?.name ?? null,
      })
      setIsLoading(false)
    }

    void fetchReport()
    return () => {
      cancelled = true
    }
  }, [id])

  // With no id there is nothing to fetch and nothing to wait for.
  if (!id) {
    return { report: null, isLoading: false, notFound: true, error: null }
  }

  return { report, isLoading, notFound, error }
}
