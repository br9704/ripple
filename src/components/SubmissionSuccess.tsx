import { Link } from 'react-router-dom'
import { DuplicateAlert, type DuplicateNearby } from '@/components/DuplicateAlert'
import { CATEGORY_MAP } from '@/constants/categories'
import type { ReportCategory } from '@/types'

interface SubmissionSuccessProps {
  address: string | null
  category: ReportCategory
  councilName: string | null
  onReportAnother: () => void
  queued?: boolean
  duplicate?: DuplicateNearby | null
}

export function SubmissionSuccess({
  address,
  category,
  councilName,
  onReportAnother,
  queued = false,
  duplicate = null,
}: SubmissionSuccessProps) {
  const cat = CATEGORY_MAP[category]

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      {/* Checkmark */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-status-fixed/20">
        <span className="text-4xl text-status-fixed" role="img" aria-label="Success">
          {queued ? '📡' : '✓'}
        </span>
      </div>

      {/* Heading */}
      <h1 className="font-display text-2xl font-bold text-text-primary">
        {queued ? 'Report queued!' : 'Report submitted!'}
      </h1>

      {queued && (
        <p className="mt-2 text-sm text-text-secondary">
          You're offline. Your report will submit automatically when you reconnect.
        </p>
      )}

      {/* Details */}
      <div className="mt-6 space-y-2 text-sm">
        {address && (
          <p className="text-text-secondary">
            <span aria-hidden="true">📍</span> {address}
          </p>
        )}
        <p className="text-text-secondary">
          Category: {cat?.icon} {cat?.label ?? category}
        </p>
        {councilName && (
          <p className="text-text-secondary">
            Routed to {councilName}
          </p>
        )}
      </div>

      {/* Message */}
      {!queued && (
        <p className="mt-6 text-xs text-text-tertiary">
          Your report is now visible to the community.
        </p>
      )}

      {duplicate && <DuplicateAlert duplicate={duplicate} />}

      {/* Actions.
          "View on map" was specified in MASTERPLAN S5.7 but never built, which
          left this screen a dead end: with no TabBar rendered in ReportFlow,
          the browser back button was the only way out after submitting. */}
      <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
        <Link
          to="/"
          className="w-full rounded-lg bg-action px-4 py-3 text-center text-sm font-semibold text-text-primary transition-colors hover:bg-action-hover"
        >
          View on map
        </Link>
        <button
          type="button"
          onClick={onReportAnother}
          className="w-full rounded-lg border border-border px-4 py-3 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
        >
          Report another issue
        </button>
      </div>
    </div>
  )
}
