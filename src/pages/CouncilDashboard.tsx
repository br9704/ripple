import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCouncilAuth } from '@/hooks/useCouncilAuth'
import { supabase } from '@/lib/supabase'
import { toCsv, downloadCsv } from '@/lib/csvExport'
import { TypingLine } from '@/components/TypingLine'
import { CATEGORY_MAP } from '@/constants/categories'
import { STATUSES, STATUS_MAP } from '@/constants/statuses'
import { timeAgo } from '@/lib/mapHelpers'
import { isValidEmail } from '@/lib/validateEmail'
import type { ReportStatus } from '@/types'

interface CouncilReport {
  id: string
  category: string
  status: ReportStatus
  address: string | null
  suburb: string | null
  upvote_count: number
  priority_score: number
  submitted_at: string
  community_suggests_fixed: boolean
}

const SELECT =
  'id, category, status, address, suburb, upvote_count, priority_score, submitted_at, community_suggests_fixed'

/**
 * Fetches this council's reports, priority first.
 *
 * Module-level rather than a component callback so the mount effect and the
 * post-update refresh share one implementation — two copies of the query would
 * drift, and the second one would be the one nobody noticed was wrong.
 *
 * No council filter here on purpose: RLS scopes the rows. Filtering client-side
 * would imply the boundary lives in the client, which it must not.
 */
async function fetchCouncilReports(): Promise<CouncilReport[]> {
  const { data } = await supabase
    .from('reports')
    .select(SELECT)
    .order('priority_score', { ascending: false })
    .limit(200)

  return (data as CouncilReport[]) ?? []
}

/**
 * Council coordinator dashboard (PRD §6.7, Sprints 17–18).
 *
 * Every query is scoped by RLS rather than by a client-side filter, so a
 * coordinator cannot widen their view by editing a request. The dashboard is a
 * route here rather than the separate admin.ripple.app subdomain the PRD
 * sketches — one deployment, one auth session, and the same RLS boundary. A
 * subdomain would add DNS and a second build for no security gain, since the
 * boundary is the database either way.
 */
export function CouncilDashboard() {
  const { session, councilId, councilName, isLoading, error, signInWithEmail, signOut } =
    useCouncilAuth()

  if (isLoading) {
    return (
      <Shell>
        <TypingLine text="checking your session..." />
      </Shell>
    )
  }

  if (!session) return <SignIn onSubmit={signInWithEmail} error={error} />

  if (!councilId) {
    return (
      <Shell>
        <p className="font-mono text-xs text-text-secondary">
          &gt; this account is not linked to a council
        </p>
        <p className="mt-2 font-mono text-xs text-text-tertiary">
          Ask an administrator to set council_id on your account.
        </p>
        <button onClick={() => void signOut()} className="mt-4 font-mono text-xs text-action">
          [sign out]
        </button>
      </Shell>
    )
  }

  return <Dashboard councilName={councilName} onSignOut={signOut} />
}

function Dashboard({
  councilName,
  onSignOut,
}: {
  councilName: string | null
  onSignOut: () => Promise<void>
}) {
  const [reports, setReports] = useState<CouncilReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setReports(await fetchCouncilReports())
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const rows = await fetchCouncilReports()
      if (cancelled) return
      setReports(rows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const open = reports.filter(
      (r) => !['fixed', 'declined', 'wont_fix'].includes(r.status)
    ).length
    const suggested = reports.filter((r) => r.community_suggests_fixed).length
    return { total: reports.length, open, suggested }
  }, [reports])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  /** Batch status update (S18.4). */
  const applyStatus = async (status: ReportStatus) => {
    if (selected.size === 0) return
    setBusy(true)

    // One call per report: update-status enforces the council scope check and
    // writes the history row. A bulk UPDATE would bypass both.
    for (const id of selected) {
      await supabase.functions.invoke('update-status', {
        body: { report_id: id, new_status: status },
      })
    }

    setSelected(new Set())
    setBusy(false)
    await refresh()
  }

  const exportCsv = () => {
    const rows = (selected.size > 0 ? reports.filter((r) => selected.has(r.id)) : reports).map(
      (r) => ({
        id: r.id,
        category: CATEGORY_MAP[r.category as keyof typeof CATEGORY_MAP]?.label ?? r.category,
        status: STATUS_MAP[r.status]?.label ?? r.status,
        address: r.address ?? '',
        suburb: r.suburb ?? '',
        upvotes: r.upvote_count,
        priority: r.priority_score,
        submitted_at: r.submitted_at,
      })
    )
    downloadCsv(`ripple-reports-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))
  }

  return (
    <Shell>
      <header className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="font-mono text-sm text-text-primary">{councilName ?? 'Council'}</h1>
          <p className="font-mono text-xs tabular-nums text-text-tertiary">
            {stats.total} reports · {stats.open} open
            {stats.suggested > 0 && ` · ${stats.suggested} community-confirmed fixed`}
          </p>
        </div>
        <button onClick={() => void onSignOut()} className="font-mono text-xs text-text-secondary">
          [sign out]
        </button>
      </header>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 border border-action px-3 py-2">
          <span className="font-mono text-xs tabular-nums text-action">
            {selected.size} selected
          </span>
          {STATUSES.filter((s) => s.key !== 'reported').map((s) => (
            <button
              key={s.key}
              type="button"
              disabled={busy}
              onClick={() => void applyStatus(s.key)}
              className="border border-border-bright px-2 py-1 font-mono text-xs text-text-secondary hover:text-text-primary disabled:opacity-40"
            >
              → {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={exportCsv}
          className="border border-border-bright px-2 py-1 font-mono text-xs text-text-secondary hover:text-text-primary"
        >
          [export csv{selected.size > 0 ? ` (${selected.size})` : ''}]
        </button>
      </div>

      {loading ? (
        <TypingLine text="loading reports..." />
      ) : reports.length === 0 ? (
        <p className="font-mono text-xs text-text-tertiary">&gt; no reports for this council yet</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {reports.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-1 py-2">
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                aria-label={`Select report at ${r.address ?? 'unknown location'}`}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">
                  {CATEGORY_MAP[r.category as keyof typeof CATEGORY_MAP]?.label ?? r.category}
                  {r.community_suggests_fixed && (
                    <span className="ml-2 font-mono text-xs text-status-fixed">
                      [community says fixed]
                    </span>
                  )}
                </p>
                <p className="truncate font-mono text-xs text-text-secondary">
                  {r.address ?? r.suburb ?? '—'}
                </p>
                <p className="font-mono text-xs tabular-nums text-text-tertiary">
                  priority {Number(r.priority_score).toFixed(0)} · +{r.upvote_count} ·{' '}
                  {timeAgo(r.submitted_at)} ·{' '}
                  <span style={{ color: STATUS_MAP[r.status]?.color }}>
                    {STATUS_MAP[r.status]?.label ?? r.status}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}

function SignIn({
  onSubmit,
  error,
}: {
  onSubmit: (email: string) => Promise<boolean>
  error: string | null
}) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <Shell>
      <h1 className="mb-1 font-mono text-sm text-text-primary">council sign in</h1>
      <p className="mb-4 font-mono text-xs text-text-tertiary">
        &gt; a sign-in link will be emailed to you
      </p>

      {sent ? (
        <TypingLine text="check your email for the sign-in link" />
      ) : (
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@council.vic.gov.au"
            className="w-full border border-border-bright bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-action focus:outline-none"
          />
          <button
            type="button"
            disabled={!isValidEmail(email)}
            onClick={async () => {
              if (await onSubmit(email)) setSent(true)
            }}
            className="w-full border border-action px-3 py-2 font-mono text-xs text-action transition-colors hover:bg-action hover:text-bg-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-action"
          >
            [ send sign-in link ]
          </button>
          {error && <p className="font-mono text-xs text-status-declined">&gt; {error}</p>}
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-y-auto bg-bg-primary px-4 py-6">
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  )
}
