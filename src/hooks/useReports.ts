import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MapPin } from '@/types'

// report_photos is joined so the detail card can show a thumbnail — PRD §6.3
// lists the photo as the first element of the pin detail card, but MapPin
// carried no photo URL, so ReportCard had nothing to render.
const REPORTS_SELECT =
  'id, lat, lng, category, status, upvote_count, priority_score, address, suburb, submitted_at, report_photos(public_url, photo_type)'

interface ReportRow extends Omit<MapPin, 'photo_url'> {
  report_photos?: { public_url: string; photo_type: string }[] | null
}

/** Flattens the joined photo rows down to a single original-photo URL. */
function toMapPin(row: ReportRow): MapPin {
  const original =
    row.report_photos?.find((p) => p.photo_type === 'original') ?? row.report_photos?.[0]
  return { ...row, photo_url: original?.public_url ?? null }
}

/**
 * Fetches all reports as lightweight MapPin objects and subscribes
 * to Supabase Realtime for live updates (new reports, status changes).
 */
export function useReports() {
  const [reports, setReports] = useState<MapPin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchReports() {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select(REPORTS_SELECT)
        .order('submitted_at', { ascending: false })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setIsLoading(false)
        return
      }

      setReports(((data as ReportRow[]) ?? []).map(toMapPin))
      setIsLoading(false)
    }

    fetchReports()

    // Realtime subscription
    const channel = supabase
      .channel('reports-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
          if (cancelled) return
          // Realtime delivers the `reports` row only — never the joined
          // report_photos — so photo_url is absent here by construction. The
          // photo is inserted moments later by the Edge Function anyway.
          const newReport = payload.new as ReportRow
          if (newReport?.id) {
            setReports((prev) => [{ ...newReport, photo_url: null }, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reports' },
        (payload) => {
          if (cancelled) return
          const updated = payload.new as ReportRow
          if (updated?.id) {
            setReports((prev) =>
              prev.map((r) =>
                r.id === updated.id
                  // Preserve the photo we resolved on fetch: the Realtime
                  // payload has no photo_url, so a naive spread would blank it
                  // and the thumbnail would vanish on every status change.
                  ? { ...r, ...updated, photo_url: r.photo_url }
                  : r
              )
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reports' },
        (payload) => {
          if (cancelled) return
          const deleted = payload.old as { id: string }
          if (deleted?.id) {
            setReports((prev) => prev.filter((r) => r.id !== deleted.id))
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  return { reports, isLoading, error }
}
