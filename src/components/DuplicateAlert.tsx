import { Link } from 'react-router-dom'

export interface DuplicateNearby {
  report_id: string
  upvote_count: number
  address: string
}

interface DuplicateAlertProps {
  duplicate: DuplicateNearby
}

/**
 * Surfaces the `duplicate_nearby` the submit-report Edge Function already
 * returns (via the find_nearby_reports RPC: same category, within 50m, last 30
 * days). The server has computed this since Sprint 5 and the client threw it
 * away — the only occurrence of `duplicate_nearby` in src/ was the type.
 *
 * PRD §12.7 draws this as a pre-submit choice ("I see this too" vs "Submit as
 * new report"). It cannot be that yet, for two honest reasons: the Edge
 * Function inserts the report *before* reporting the duplicate, so by the time
 * the client learns about it the choice is already made; and upvoting does not
 * exist until Sprint 8. So this is the post-submit form — the user is told, and
 * pointed at the existing report. The pre-submit variant needs a dedicated
 * check endpoint and lands in Sprint 8 alongside useUpvote.
 */
export function DuplicateAlert({ duplicate }: DuplicateAlertProps) {
  return (
    <div className="mt-6 w-full max-w-xs border border-border px-4 py-3 text-left">
      <p className="font-mono text-xs text-text-secondary">&gt; similar report nearby</p>

      <p className="mt-2 text-sm text-text-primary">{duplicate.address}</p>

      <p className="mt-1 font-mono text-xs text-text-tertiary">
        {duplicate.upvote_count === 1
          ? '1 person has seen this too'
          : `${duplicate.upvote_count} people have seen this too`}
      </p>

      <Link
        to={`/report/${duplicate.report_id}`}
        className="mt-3 inline-block font-mono text-xs text-action underline-offset-4 hover:underline"
      >
        [ view that report → ]
      </Link>
    </div>
  )
}
