import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TypingLine } from '@/components/TypingLine'

interface LeaderboardRow {
  display_name: string
  suburb: string | null
  report_count: number
}

/**
 * Opt-in community leaderboard (S19.3/S19.4).
 *
 * PRD sketches this as a map sidebar. Shipped as a panel reachable from the
 * feed instead: a sidebar is a desktop affordance and this is a 375px-first
 * product, where the map viewport is the entire screen and the camera control
 * is the thing that must never be crowded.
 *
 * Shows chosen display names only. Nothing here can be traced to a
 * reporter_token — the database function does not return one (PRD §13.1).
 */
export function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase.rpc('leaderboard', { p_limit: 10 })
      if (cancelled) return
      setRows((data as LeaderboardRow[]) ?? [])
      setIsLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (isLoading) return <TypingLine text="loading leaderboard..." />

  if (rows.length === 0) {
    return (
      <p className="font-mono text-xs text-text-tertiary">
        &gt; nobody has opted in yet — the leaderboard is opt-in by design
      </p>
    )
  }

  return (
    <section aria-label="Community leaderboard" className="space-y-2">
      <h2 className="font-mono text-xs text-text-tertiary">top reporters</h2>
      <ol className="divide-y divide-border border-y border-border">
        {rows.map((r, i) => (
          <li key={r.display_name} className="flex items-center gap-3 px-1 py-2">
            <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-text-tertiary">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
              {r.display_name}
              {r.suburb && (
                <span className="ml-2 font-mono text-xs text-text-tertiary">{r.suburb}</span>
              )}
            </span>
            <span className="font-mono text-xs tabular-nums text-action">{r.report_count}</span>
          </li>
        ))}
      </ol>
      <p className="font-mono text-xs text-text-tertiary">
        &gt; display names only. reports are never linked to an identity.
      </p>
    </section>
  )
}
