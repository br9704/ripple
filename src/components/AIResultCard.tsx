import { ConfidenceBar } from '@/components/ConfidenceBar'
import { TypingLine } from '@/components/TypingLine'
import { CATEGORY_MAP } from '@/constants/categories'
import type { ConfidenceTier, Prediction } from '@/lib/classification'
import type { ReportCategory } from '@/types'

interface AIResultCardProps {
  top2: Prediction[]
  tier: ConfidenceTier
  selected: ReportCategory | null
  onSelect: (category: ReportCategory) => void
  onOpenPicker: () => void
}

/**
 * The classification result.
 *
 * MOTION.md is explicit that the three confidence tiers must *differ in
 * motion*, because the motion is the message:
 *
 *   ≥85%  certain  — snaps in, bar fills fast, green tick. A verdict.
 *   60–84% asking  — enters normally, "> does this look right?" types out
 *                    beneath, category label carries the 2s status pulse.
 *   <60%  offering — two options fan in with a 60ms stagger, neither
 *                    emphasised, no green, bar dimmed. A choice, not a verdict.
 *
 * Entry animation is CSS-driven so `prefers-reduced-motion` in index.css
 * neutralises it without this component needing to know.
 */
export function AIResultCard({ top2, tier, selected, onSelect, onOpenPicker }: AIResultCardProps) {
  const best = top2[0]
  if (!best) return null

  // <60%: offer the top two side by side, neither emphasised.
  if (tier === 'offering') {
    return (
      <section aria-label="AI suggestions" className="space-y-2">
        <TypingLine text="not sure — which one is it?" />
        <div className="grid grid-cols-2 gap-px border border-border bg-border">
          {top2.map((p, i) => {
            const cat = CATEGORY_MAP[p.category]
            const isSelected = selected === p.category
            return (
              <button
                key={p.category}
                type="button"
                onClick={() => onSelect(p.category)}
                aria-pressed={isSelected}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`flex flex-col gap-2 px-3 py-3 text-left transition-colors duration-150 ease-signal ${
                  isSelected ? 'bg-bg-primary text-action' : 'bg-bg-secondary text-text-secondary'
                }`}
              >
                <span className="flex items-center gap-2 font-mono text-xs">
                  <span aria-hidden="true">{cat?.glyph}</span>
                  <span className="truncate">{cat?.label.split(' / ')[0]}</span>
                </span>
                <span className="sr-only">
                  {cat?.ariaLabel}, {Math.round(p.confidence * 100)} percent confidence
                </span>
                <ConfidenceBar confidence={p.confidence} tier="offering" />
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onOpenPicker}
          className="font-mono text-xs text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
        >
          [ neither — pick a category ]
        </button>
      </section>
    )
  }

  const cat = CATEGORY_MAP[best.category]
  const isCertain = tier === 'certain'

  return (
    <section aria-label="AI result" className="border border-border-bright px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center border border-action font-mono text-sm text-action"
        >
          {cat?.glyph}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm text-text-primary ${
              // "Asking" pulses the label — it reads as the system hedging.
              isCertain ? '' : 'status-pulse'
            }`}
          >
            {cat?.label ?? best.category}
          </p>
          <span className="sr-only">
            {cat?.ariaLabel}, {Math.round(best.confidence * 100)} percent confidence
          </span>
          <ConfidenceBar confidence={best.confidence} tier={tier} className="mt-1" />
        </div>

        {isCertain && (
          <span aria-hidden="true" className="font-mono text-sm text-status-fixed">
            ✓
          </span>
        )}
      </div>

      {/* 60–84%: ask, out loud. */}
      {!isCertain && <TypingLine text="does this look right?" className="mt-3" />}

      <button
        type="button"
        onClick={onOpenPicker}
        className="mt-3 font-mono text-xs text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
      >
        [ change category ]
      </button>
    </section>
  )
}
