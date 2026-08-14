import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Report, ReportPhoto, StatusHistory } from '@/types'

export interface ReportDetailData extends Report {
  photos: ReportPhoto[]
  status_history: StatusHistory[]
  council_name: string | null
}

const SELECT = `
  *,
  report_photos(*),
  status_history(*),
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
      const { data, error: err } = await supabase
        .from('reports')
        .select(SELECT)
        .eq('id', id)
        .maybeSingle()

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
