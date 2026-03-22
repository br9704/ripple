import { motion } from 'framer-motion'
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
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 100) onClose()
        }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-xl bg-bg-secondary border-t border-border shadow-card"
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-border-bright" />
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Category + Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
                style={{ backgroundColor: cat?.color + '20', color: cat?.color }}
              >
                {cat?.icon}
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
                <span className="text-text-secondary" aria-hidden="true">📍 </span>
                {report.address}
              </p>
            )}
            <p className="text-xs text-text-tertiary">
              {timeAgo(report.submitted_at)}
            </p>
          </div>

          {/* Upvotes */}
          <div className="flex items-center gap-2 rounded-lg bg-bg-elevated px-3 py-2">
            <span className="text-sm" aria-hidden="true">👍</span>
            <span className="text-sm text-text-secondary">
              {report.upvote_count} {report.upvote_count === 1 ? 'person' : 'people'} saw this too
            </span>
          </div>

          {/* Report ID */}
          <p className="text-xs font-mono text-text-tertiary">
            Report #{report.id.slice(0, 8)}
          </p>
        </div>
      </motion.div>
    </>
  )
}
