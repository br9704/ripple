import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MapPin } from '@/types'

const REPORTS_SELECT = 'id, lat, lng, category, status, upvote_count, priority_score, address, suburb, submitted_at'

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

      setReports((data as MapPin[]) ?? [])
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
          const newReport = payload.new as MapPin
          if (newReport?.id) {
            setReports((prev) => [newReport, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reports' },
        (payload) => {
          if (cancelled) return
          const updated = payload.new as MapPin
          if (updated?.id) {
            setReports((prev) =>
              prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
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
