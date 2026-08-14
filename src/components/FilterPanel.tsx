import { motion } from 'framer-motion'
import { CATEGORIES } from '@/constants/categories'
import { STATUSES } from '@/constants/statuses'
import { useFilterStore, type DateRange } from '@/stores/filterStore'
import { countActiveFilters } from '@/lib/reportFilters'

interface FilterPanelProps {
  onClose: () => void
}

const RANGES: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'all' },
]

const UPVOTE_STEPS = [0, 5, 10, 25, 50]

/**
 * Map filter controls, as a bottom sheet.
 *
 * SIGNAL vocabulary throughout: bracketed toggles, monospace labels, hairline
 * dividers. No coloured chips — selection is carried by amber type and border,
 * spending the single accent one element at a time.
 */
export function FilterPanel({ onClose }: FilterPanelProps) {
  const {
    categories,
    statuses,
    dateRange,
    minUpvotes,
    nearMe,
    toggleCategory,
    toggleStatus,
    setDateRange,
    setMinUpvotes,
    setNearMe,
    reset,
  } = useFilterStore()

  const activeCount = countActiveFilters({ categories, statuses, dateRange, minUpvotes })

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close filters"
        className="fixed inset-0 z-40 bg-bg-overlay"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto border-t border-border-bright bg-bg-secondary"
        role="dialog"
        aria-label="Map filters"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-mono text-xs text-text-primary">
            filters {activeCount > 0 && <span className="text-action">[{activeCount}]</span>}
          </h2>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="font-mono text-xs text-text-secondary hover:text-text-primary"
            >
              [reset]
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="font-mono text-sm text-text-secondary hover:text-text-primary"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-5 px-4 py-4">
          <Section label="category">
            <div className="grid grid-cols-2 gap-px border border-border bg-border">
              {CATEGORIES.map((c) => {
                const on = categories.includes(c.key)
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleCategory(c.key)}
                    aria-pressed={on}
                    className={`flex items-center gap-2 px-3 py-2 text-left font-mono text-xs transition-colors duration-150 ${
                      on ? 'bg-bg-primary text-action' : 'bg-bg-secondary text-text-secondary'
                    }`}
                  >
                    <span aria-hidden="true" className="w-4 shrink-0 text-center">
                      {c.glyph}
                    </span>
                    <span className="truncate">{c.label.split(' / ')[0]}</span>
                    <span className="sr-only">{c.ariaLabel}</span>
                  </button>
                )
              })}
            </div>
          </Section>

          <Section label="status">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const on = statuses.includes(s.key)
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleStatus(s.key)}
                    aria-pressed={on}
                    className={`border px-3 py-1.5 font-mono text-xs transition-colors duration-150 ${
                      on
                        ? 'border-action text-action'
                        : 'border-border-bright text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </Section>

          <Section label="reported within">
            <div className="flex gap-2">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setDateRange(r.value)}
                  aria-pressed={dateRange === r.value}
                  className={`flex-1 border px-3 py-1.5 font-mono text-xs transition-colors duration-150 ${
                    dateRange === r.value
                      ? 'border-action text-action'
                      : 'border-border-bright text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </Section>

          <Section label={`minimum upvotes: ${minUpvotes === 0 ? 'any' : minUpvotes}`}>
            <div className="flex gap-2">
              {UPVOTE_STEPS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMinUpvotes(n)}
                  aria-pressed={minUpvotes === n}
                  className={`flex-1 border px-2 py-1.5 font-mono text-xs tabular-nums transition-colors duration-150 ${
                    minUpvotes === n
                      ? 'border-action text-action'
                      : 'border-border-bright text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {n === 0 ? 'any' : `${n}+`}
                </button>
              ))}
            </div>
          </Section>

          <button
            type="button"
            onClick={() => setNearMe(!nearMe)}
            aria-pressed={nearMe}
            className={`w-full border px-3 py-2.5 font-mono text-xs transition-colors duration-150 ${
              nearMe
                ? 'border-action text-action'
                : 'border-border-bright text-text-secondary hover:text-text-primary'
            }`}
          >
            {nearMe ? '[x]' : '[ ]'} only within 1km of me
          </button>
        </div>
      </motion.div>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-mono text-xs text-text-tertiary">{label}</h3>
      {children}
    </section>
  )
}
