import { useMemo } from 'react'
import { UPVOTE_THRESHOLD_HIGH_PRIORITY, UPVOTE_THRESHOLD_COUNCIL_ALERT } from '@/constants/config'
import { CATEGORY_MAP } from '@/constants/categories'

interface AlertReport {
  id: string
  category: string
  address: string | null
  upvote_count: number
  community_suggests_fixed: boolean
  status: string
}

interface CouncilAlertsProps {
  reports: AlertReport[]
}

type Severity = 'high' | 'medium'

interface Alert {
  id: string
  severity: Severity
  label: string
  detail: string
}

/**
 * Dashboard alerts (S18.7) — what a coordinator should look at first.
 *
 * Derived from data already loaded rather than a separate query: this runs on
 * the same 200 reports the priority feed shows, so it can never disagree with
 * the list directly beneath it.
 *
 * PRD §6.4's school/hospital proximity clustering is deliberately absent: it
 * needs a POI dataset that does not exist in this schema, and inventing a
 * proxy for "near a school" would produce alerts a council could not act on.
 */
export function CouncilAlerts({ reports }: CouncilAlertsProps) {
  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = []

    for (const r of reports) {
      const label = CATEGORY_MAP[r.category as keyof typeof CATEGORY_MAP]?.label ?? r.category
      const where = r.address ?? 'location unknown'

      if (r.community_suggests_fixed && r.status !== 'fixed') {
        out.push({
          id: `${r.id}-fixed`,
          severity: 'high',
          label: 'community says fixed',
          detail: `${label} — ${where}`,
        })
      }

      if (r.upvote_count >= UPVOTE_THRESHOLD_COUNCIL_ALERT) {
        out.push({
          id: `${r.id}-50`,
          severity: 'high',
          label: `${r.upvote_count} upvotes`,
          detail: `${label} — ${where}`,
        })
      } else if (r.upvote_count >= UPVOTE_THRESHOLD_HIGH_PRIORITY) {
        out.push({
          id: `${r.id}-25`,
          severity: 'medium',
          label: `${r.upvote_count} upvotes`,
          detail: `${label} — ${where}`,
        })
      }
    }

    // High severity first, then stable by id so the list does not reshuffle.
    return out.sort(
      (a, b) =>
        (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1) || a.id.localeCompare(b.id)
    )
  }, [reports])

  if (alerts.length === 0) return null

  return (
    <section aria-label="Alerts" className="mb-4 border border-action px-3 py-2">
      <h2 className="font-mono text-xs text-action">
        alerts ({alerts.length})
      </h2>
      <ul className="mt-2 space-y-1">
        {alerts.slice(0, 8).map((a) => (
          <li key={a.id} className="font-mono text-xs">
            <span className={a.severity === 'high' ? 'text-action' : 'text-text-secondary'}>
              [{a.label}]
            </span>{' '}
            <span className="text-text-secondary">{a.detail}</span>
          </li>
        ))}
        {alerts.length > 8 && (
          <li className="font-mono text-xs text-text-tertiary">
            …and {alerts.length - 8} more
          </li>
        )}
      </ul>
    </section>
  )
}
