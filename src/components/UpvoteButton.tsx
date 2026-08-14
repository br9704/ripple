import { useState } from 'react'
import { useUpvote } from '@/hooks/useUpvote'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface UpvoteButtonProps {
  reportId: string
  initialCount: number
}

/**
 * "I see this too" / "You saw this too".
 *
 * This is the most-repeated interaction in the app, so MOTION.md gives it the
 * lightest possible ripple — a single 300ms ring from the tapped control, never
 * stacked. Anything heavier becomes irritating by the tenth tap.
 */
export function UpvoteButton({ reportId, initialCount }: UpvoteButtonProps) {
  const { upvoteCount, hasUpvoted, isPending, error, toggle } = useUpvote(reportId, initialCount)
  const reducedMotion = useReducedMotion()
  const [rippleKey, setRippleKey] = useState(0)

  const handleClick = () => {
    // Only ripple on the way *in* — removing an upvote is a correction, not an
    // impact, and does not deserve the signature motif.
    if (!reducedMotion && !hasUpvoted) setRippleKey((k) => k + 1)
    void toggle()
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={hasUpvoted}
        className={`relative flex w-full items-center justify-center gap-2 overflow-hidden border px-4 py-3 font-mono text-xs transition-colors duration-150 ease-signal disabled:opacity-60 ${
          hasUpvoted
            ? 'border-action text-action'
            : 'border-border-bright text-text-secondary hover:text-text-primary'
        }`}
      >
        {/* The signature motif — one ring, keyed so it restarts per tap and
            never stacks. */}
        {rippleKey > 0 && !reducedMotion && (
          <span
            key={rippleKey}
            aria-hidden="true"
            className="ripple-ring pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2"
            style={{ animationDuration: '300ms' }}
          />
        )}

        <span aria-hidden="true">{hasUpvoted ? '[+]' : '[ ]'}</span>
        <span>{hasUpvoted ? 'you saw this too' : 'i see this too'}</span>
        <span aria-hidden="true" className="tabular-nums">
          ({upvoteCount})
        </span>
      </button>

      <span className="sr-only" role="status">
        {upvoteCount} {upvoteCount === 1 ? 'person has' : 'people have'} seen this
      </span>

      {error && <p className="font-mono text-xs text-text-tertiary">&gt; {error}</p>}
    </div>
  )
}
