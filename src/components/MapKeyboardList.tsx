import { CATEGORY_MAP } from '@/constants/categories'
import { STATUS_MAP } from '@/constants/statuses'
import { timeAgo } from '@/lib/mapHelpers'
import type { MapPin } from '@/types'

interface MapKeyboardListProps {
  reports: MapPin[]
  onSelect: (reportId: string) => void
}

/** Beyond this, tabbing through pins is worse than useless. */
const MAX_TABBABLE = 50

/**
 * Keyboard- and screen-reader-accessible equivalent of the map pins (S16.5).
 *
 * Mapbox renders pins into a `<canvas>`. Canvas has no accessibility tree, so
 * every pin on the map is invisible to screen readers and unreachable by
 * keyboard — PRD §10.2 requires both ("Map pins keyboard navigable"), and no
 * amount of ARIA on the canvas element fixes it.
 *
 * The fix is a parallel DOM list: visually hidden but focusable, so Tab walks
 * the reports in order and Enter opens the same detail sheet a tap would. This
 * is the standard approach for canvas-rendered data and is why the list is
 * `sr-only` rather than `display: none` — the latter would remove it from the
 * accessibility tree too, defeating the point.
 *
 * Capped at 50: tabbing through 500 pins is not accessibility, it is a trap.
 * Beyond the cap the Feed tab is the accessible route, and we say so.
 */
export function MapKeyboardList({ reports, onSelect }: MapKeyboardListProps) {
  const tabbable = reports.slice(0, MAX_TABBABLE)

  return (
    <div className="sr-only">
      <h2>Reports on the map</h2>
      <p>
        {reports.length} {reports.length === 1 ? 'report' : 'reports'} shown.
        {reports.length > MAX_TABBABLE &&
          ` Showing the first ${MAX_TABBABLE}; use the Feed tab to browse all of them.`}
      </p>

      <ul>
        {tabbable.map((report) => {
          const cat = CATEGORY_MAP[report.category]
          const status = STATUS_MAP[report.status]

          return (
            <li key={report.id}>
              <button type="button" onClick={() => onSelect(report.id)}>
                {cat?.ariaLabel ?? report.category}
                {report.address ? ` at ${report.address}` : ''}. Status:{' '}
                {status?.label ?? report.status}. Reported {timeAgo(report.submitted_at)}.{' '}
                {report.upvote_count}{' '}
                {report.upvote_count === 1 ? 'person has' : 'people have'} seen this too.
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
