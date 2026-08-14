import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { TabBar } from '@/components/TabBar'
import { UpvoteButton } from '@/components/UpvoteButton'
import { StatusTimeline } from '@/components/StatusTimeline'
import { CommentThread } from '@/components/CommentThread'
import { FixConfirmation } from '@/components/FixConfirmation'
import { ConfirmationPhotos } from '@/components/ConfirmationPhotos'
import { TypingLine } from '@/components/TypingLine'
import { useReport } from '@/hooks/useReport'
import { shareReport, formatReportId, type ShareOutcome } from '@/lib/share'
import { CATEGORY_MAP } from '@/constants/categories'
import { STATUS_MAP } from '@/constants/statuses'
import { timeAgo } from '@/lib/mapHelpers'
import { getReporterToken } from '@/lib/reporterToken'

/**
 * Full report view at a shareable URL (PRD §12.8).
 *
 * The map's bottom sheet is deliberately terse; this page has room for the full
 * photo, the complete status history and the council note. It is also the only
 * link target that survives being pasted into a message — which is what makes
 * "47 reports in Fitzroy North" usable as evidence in Deb's persona (PRD §3.5).
 */
export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { report, isLoading, notFound, error } = useReport(id)
  const [shareResult, setShareResult] = useState<ShareOutcome | null>(null)

  const handleShare = async () => {
    if (!report) return
    const cat = CATEGORY_MAP[report.category]
    setShareResult(
      await shareReport({
        title: `Ripple — ${cat?.label ?? report.category}`,
        text: report.address
          ? `${cat?.label ?? report.category} at ${report.address}`
          : (cat?.label ?? report.category),
        url: window.location.href,
      })
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <AppHeader />

      <div className="absolute inset-0 overflow-y-auto pb-20 pt-[52px]">
        {isLoading ? (
          <div className="px-4 py-8">
            <TypingLine text="loading report..." />
          </div>
        ) : notFound ? (
          <EmptyState
            heading="404"
            body="no such report"
            hint="It may have been removed, or the link may be wrong."
          />
        ) : error ? (
          // Deliberately distinct from 404: a network failure must not tell the
          // user their report was deleted.
          <EmptyState
            heading="could not load"
            body="something went wrong fetching this report"
            hint="Check your connection and try again."
          />
        ) : report ? (
          <article className="space-y-5 px-4 py-4">
            {report.photos[0] && (
              <img
                src={report.photos[0].public_url}
                alt={`Reported ${CATEGORY_MAP[report.category]?.label ?? report.category}${
                  report.address ? ` at ${report.address}` : ''
                }`}
                className="w-full border border-border object-cover"
              />
            )}

            <header className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center border font-mono text-sm ${
                    CATEGORY_MAP[report.category]?.isSafety
                      ? 'border-action text-action'
                      : 'border-border-bright text-text-secondary'
                  }`}
                >
                  {CATEGORY_MAP[report.category]?.glyph}
                </span>
                <h1 className="text-lg text-text-primary">
                  {CATEGORY_MAP[report.category]?.label ?? report.category}
                </h1>
              </div>

              {report.address && (
                <p className="font-mono text-xs text-text-secondary">&gt; {report.address}</p>
              )}
              <p className="font-mono text-xs text-text-tertiary">
                {timeAgo(report.submitted_at)}
                {report.council_name && ` · routed to ${report.council_name}`}
              </p>
            </header>

            {report.note && (
              <p className="border-l border-border-bright pl-3 text-sm text-text-secondary">
                {report.note}
              </p>
            )}

            <UpvoteButton reportId={report.id} initialCount={report.upvote_count} />

            <StatusTimeline
              history={report.status_history}
              currentStatus={report.status}
              submittedAt={report.submitted_at}
            />

            <ConfirmationPhotos
              original={report.photos.find((p) => p.photo_type === 'original')}
              confirmations={report.photos.filter((p) => p.photo_type === 'fixed_confirmation')}
            />

            <FixConfirmation
              reportId={report.id}
              status={report.status}
              isOwnReport={report.reporter_token === getReporterToken()}
              confirmationCount={
                report.photos.filter((p) => p.photo_type === 'fixed_confirmation').length
              }
            />

            <CommentThread reportId={report.id} />

            <footer className="flex items-center justify-between border-t border-border pt-4">
              <span className="font-mono text-xs text-text-tertiary">
                {formatReportId(report.id)}
              </span>
              <button
                type="button"
                onClick={() => { void handleShare() }}
                className="border border-border-bright px-3 py-1.5 font-mono text-xs text-text-secondary transition-colors hover:text-text-primary"
              >
                {shareResult === 'copied'
                  ? '[link copied]'
                  : shareResult === 'unavailable'
                    ? '[could not share]'
                    : '[share]'}
              </button>
            </footer>

            <p className="font-mono text-xs text-text-tertiary">
              {STATUS_MAP[report.status]?.isTerminal
                ? '> this report is closed'
                : '> this report is open'}
            </p>
          </article>
        ) : null}
      </div>

      <TabBar />
    </div>
  )
}

function EmptyState({ heading, body, hint }: { heading: string; body: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p className="font-mono text-sm text-text-primary">{heading}</p>
      <p className="font-mono text-xs text-text-secondary">{body}</p>
      <p className="font-mono text-xs text-text-tertiary">{hint}</p>
      <Link
        to="/"
        className="mt-4 font-mono text-xs text-action underline-offset-4 hover:underline"
      >
        [← back to map]
      </Link>
    </div>
  )
}
