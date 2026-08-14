import { Link } from 'react-router-dom'
import { CATEGORY_MAP } from '@/constants/categories'
import { STATUS_MAP } from '@/constants/statuses'
import { timeAgo } from '@/lib/mapHelpers'
import type { MapPin } from '@/types'

interface ReportFeedProps {
  reports: MapPin[]
  emptyMessage?: string
}

/**
 * Scrollable list of reports — the alternative to the map (PRD §12.9).
 *
 * Rendered as a directory listing rather than cards: SIGNAL's index-page
 * language, hairline-separated rows, monospace metadata. Each row is a link to
 * the detail page, so keyboard navigation and middle-click work for free —
 * which the map pins, being canvas, cannot offer.
 */
export function ReportFeed({ reports, emptyMessage = 'no reports yet' }: ReportFeedProps) {
  if (reports.length === 0) {
    return (
      <p className="px-4 py-8 text-center font-mono text-xs text-text-tertiary">
        &gt; {emptyMessage}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {reports.map((report) => {
        const cat = CATEGORY_MAP[report.category]
        const status = STATUS_MAP[report.status]

        return (
          <li key={report.id}>
            <Link
              to={`/report/${report.id}`}
              className="flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-bg-secondary"
            >
              {report.photo_url ? (
                <img
                  src={report.photo_url}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="h-14 w-14 shrink-0 object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={`flex h-14 w-14 shrink-0 items-center justify-center border font-mono text-sm ${
                    cat?.isSafety
                      ? 'border-action text-action'
                      : 'border-border-bright text-text-secondary'
                  }`}
                >
                  {cat?.glyph}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">
                  {cat?.label ?? report.category}
                </p>
                {report.address && (
                  <p className="truncate font-mono text-xs text-text-secondary">
                    {report.address}
                  </p>
                )}
                <p className="mt-1 flex items-center gap-2 font-mono text-xs text-text-tertiary">
                  <span className="tabular-nums">{timeAgo(report.submitted_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">+{report.upvote_count}</span>
                  <span aria-hidden="true">·</span>
                  <span style={{ color: status?.color }}>
                    <span aria-hidden="true">{status?.marker} </span>
                    {status?.label ?? report.status}
                  </span>
                </p>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
