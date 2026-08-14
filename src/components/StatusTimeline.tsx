import { STATUS_MAP } from '@/constants/statuses'
import { timeAgo } from '@/lib/mapHelpers'
import type { ReportStatus, StatusHistory } from '@/types'

interface StatusTimelineProps {
  history: StatusHistory[]
  currentStatus: ReportStatus
  submittedAt: string
}

/**
 * Visual history: Reported → Acknowledged → In Progress → Fixed.
 *
 * MOTION.md renders this as a segmented bar where a newly filled segment fills
 * left→right over 400ms before its label cross-fades. Green appears only on
 * `fixed`.
 *
 * If the report has no `status_history` rows — which is the normal case for a
 * fresh report, since the trigger only writes on change — we synthesise the
 * opening "Reported" entry from `submitted_at` rather than showing an empty
 * timeline. The event genuinely happened; it simply predates the history table.
 */
export function StatusTimeline({ history, currentStatus, submittedAt }: StatusTimelineProps) {
  const entries =
    history.length > 0
      ? history
      : [
          {
            id: 'synthetic-initial',
            report_id: '',
            from_status: null,
            to_status: 'reported' as ReportStatus,
            changed_by: 'system' as const,
            council_note: null,
            created_at: submittedAt,
          },
        ]

  const current = STATUS_MAP[currentStatus]

  return (
    <section aria-label="Status history" className="space-y-3">
      <h2 className="font-mono text-xs text-text-tertiary">updates</h2>

      <ol className="space-y-3">
        {entries.map((entry, i) => {
          const status = STATUS_MAP[entry.to_status]
          const isLatest = i === entries.length - 1

          return (
            <li key={entry.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 font-mono text-xs"
                style={{ color: status?.color }}
              >
                {status?.marker}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className="text-sm"
                  style={{ color: isLatest ? status?.color : undefined }}
                >
                  {status?.label ?? entry.to_status}
                </p>
                <p className="font-mono text-xs text-text-tertiary">
                  {timeAgo(entry.created_at)}
                </p>
                {entry.council_note && (
                  <p className="mt-1 border-l border-border-bright pl-2 text-sm text-text-secondary">
                    {entry.council_note}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* Static text equivalent — MOTION.md requires every animated state to be
          readable without the animation. */}
      <span className="sr-only" role="status">
        Current status: {current?.label ?? currentStatus}
      </span>
    </section>
  )
}
