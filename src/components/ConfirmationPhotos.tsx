import { useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { ReportPhoto } from '@/types'

interface ConfirmationPhotosProps {
  original: ReportPhoto | undefined
  confirmations: ReportPhoto[]
}

/**
 * Before/after comparison for a confirmed fix (S15.4).
 *
 * MOTION.md calls this "the emotional payoff of the whole product" and gives it
 * the full 600ms — the one place in the system permitted to take that long. A
 * scrubbable slider rather than a tap-toggle, because the satisfaction is in
 * the transition itself, not in seeing two photos.
 *
 * Under reduced motion the slider still works (it is direct manipulation, not
 * animation) but the crossfade is instant.
 */
export function ConfirmationPhotos({ original, confirmations }: ConfirmationPhotosProps) {
  const [position, setPosition] = useState(100)
  const reducedMotion = useReducedMotion()

  if (confirmations.length === 0) return null
  const after = confirmations[0]

  // Without a "before" there is nothing to compare — show the fix on its own.
  if (!original) {
    return (
      <section aria-label="Fix confirmation" className="space-y-2">
        <h2 className="font-mono text-xs text-text-tertiary">confirmed fixed</h2>
        <img src={after.public_url} alt="Photo confirming the issue is fixed"
             className="w-full border border-border object-cover" />
      </section>
    )
  }

  return (
    <section aria-label="Before and after" className="space-y-2">
      <h2 className="font-mono text-xs text-text-tertiary">
        before / after
        {confirmations.length > 1 && ` · ${confirmations.length} confirmations`}
      </h2>

      <div className="relative overflow-hidden border border-border">
        <img src={original.public_url} alt="The issue as originally reported"
             className="block w-full object-cover" />

        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            clipPath: `inset(0 0 0 ${position}%)`,
            transition: reducedMotion ? 'none' : 'clip-path 600ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <img src={after.public_url} alt="The same location after being fixed"
               className="block w-full object-cover" />
        </div>

        {/* Position marker */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-action"
             style={{ left: `${position}%` }} />
      </div>

      <label className="block">
        <span className="sr-only">Drag to compare before and after</span>
        <input
          type="range" min={0} max={100} value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          className="w-full accent-[#ffb000]"
        />
      </label>

      <p className="flex justify-between font-mono text-xs text-text-tertiary">
        <span>after</span><span>before</span>
      </p>
    </section>
  )
}
