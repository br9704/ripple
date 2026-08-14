import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { UpvoteButton } from '@/components/UpvoteButton'
import { CATEGORY_MAP } from '@/constants/categories'
import { STATUS_MAP } from '@/constants/statuses'
import { timeAgo } from '@/lib/mapHelpers'
import type { MapPin } from '@/types'

interface ReportCardProps {
  report: MapPin
  onClose: () => void
}

export function ReportCard({ report, onClose }: ReportCardProps) {
  const cat = CATEGORY_MAP[report.category]
  const status = STATUS_MAP[report.status]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        // MOTION.md:11 — ease-out or linear only. No bounce. No spring.
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 100) onClose()
        }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-border-bright"
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-border-bright" />
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Photo — PRD §6.3 lists this first in the pin detail card. It was
              absent until Aug 2026 because MapPin carried no photo URL. */}
          {report.photo_url && (
            <img
              src={report.photo_url}
              alt={`Reported ${cat?.label ?? report.category}${
                report.address ? ` at ${report.address}` : ''
              }`}
              loading="lazy"
              className="h-40 w-full rounded-md object-cover"
            />
          )}

          {/* Category + Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 items-center justify-center border font-mono text-sm ${
                  cat?.isSafety
                    ? 'border-action text-action'
                    : 'border-border-bright text-text-secondary'
                }`}
              >
                {cat?.glyph}
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {cat?.label ?? report.category}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: status?.color }}
              />
              <span className="text-xs text-text-secondary">
                {status?.label ?? report.status}
              </span>
            </div>
          </div>

          {/* Address + Time */}
          <div className="space-y-1">
            {report.address && (
              <p className="text-sm text-text-primary truncate">
                <span className="font-mono text-text-secondary" aria-hidden="true">&gt; </span>
                {report.address}
              </p>
            )}
            <p className="text-xs text-text-tertiary">
              {timeAgo(report.submitted_at)}
            </p>
          </div>

          {/* Upvotes — S8. Replaces the static count with the real control. */}
          <UpvoteButton reportId={report.id} initialCount={report.upvote_count} />

          {/* Report ID + link to the full page, which the map sheet is too
              cramped for (S11 note). */}
          <Link
            to={`/report/${report.id}`}
            className="block font-mono text-xs text-action underline-offset-4 hover:underline"
          >
            [ view full report → ]
          </Link>
          <p className="text-xs font-mono text-text-tertiary">
            Report #{report.id.slice(0, 8)}
          </p>
        </div>
      </motion.div>
    </>
  )
}
