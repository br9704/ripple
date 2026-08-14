import { useEffect, useState } from 'react'
import { renderBar, BAR_WIDTH } from '@/lib/progressBar'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { ConfidenceTier } from '@/lib/classification'

interface ConfidenceBarProps {
  /** 0–1. */
  confidence: number
  tier: ConfidenceTier
  className?: string
}

/** Certainty fills fast and decisively; uncertainty takes its time. */
const FILL_MS: Record<ConfidenceTier, number> = {
  certain: 350,
  asking: 500,
  offering: 500,
}

/**
 * `[████████░░░░] 94%` — the confidence readout.
 *
 * The bar fills from 0 to the score while the percentage counts up in sync,
 * in tabular figures so the digits do not jitter as they change width.
 * Under reduced motion it renders its final value immediately.
 *
 * The `offering` tier renders dimmed: below 60% the model is not making a
 * claim, and the bar should not look like one.
 */
export function ConfidenceBar({ confidence, tier, className = '' }: ConfidenceBarProps) {
  const reducedMotion = useReducedMotion()
  const [animated, setAnimated] = useState(0)

  // Reduced motion short-circuits the animation entirely rather than running it
  // faster — MOTION.md treats that distinction as a hard rule.
  const shown = reducedMotion ? confidence : animated

  useEffect(() => {
    if (reducedMotion) return

    const duration = FILL_MS[tier]
    const start = performance.now()
    let frame = 0

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out — never bounce, never overshoot.
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimated(confidence * eased)
      if (t < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [confidence, tier, reducedMotion])

  const percent = Math.round(shown * 100)
  const dimmed = tier === 'offering'

  return (
    <div
      className={`flex items-center gap-2 font-mono text-xs tabular-nums ${
        dimmed ? 'text-text-tertiary' : 'text-text-secondary'
      } ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(confidence * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="AI confidence"
    >
      <span aria-hidden="true" className={dimmed ? '' : 'text-action'}>
        [{renderBar(shown, BAR_WIDTH)}]
      </span>
      <span aria-hidden="true">{percent}%</span>
    </div>
  )
}
