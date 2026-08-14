import { useEffect, useState } from 'react'
import { TypingLine } from '@/components/TypingLine'
import { TerminalLoader } from '@/components/TerminalLoader'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { AI_EXPECTED_INFERENCE_MS } from '@/constants/config'

interface ScanOverlayProps {
  previewUrl: string
  /** True while the model is downloading (as opposed to running). */
  isModelLoading: boolean
  /** Download progress 0–1, or null when Content-Length is absent. */
  loadProgress: number | null
}

/** The bar fills to here and HOLDS. It never completes on a guess. */
const HOLD_AT = 0.9

/**
 * The classification scan — MOTION.md's hero moment.
 *
 * A 1px line sweeps top→bottom across the photo (1200ms/pass, linear, looping).
 * Behind it the image sits at 60% opacity and in front at 100%, so the line
 * reads as *reading* the image. Beneath, `> analysing...` types at 40ms/char
 * and a loader fills toward 90%.
 *
 * The honesty rule, which is the whole point: the bar fills to 90% over the
 * *expected* inference time and then holds there until a real result arrives.
 * It never fakes completion. Three seconds of legible machine-thinking is the
 * demo; three seconds of a frozen screen — or a lying progress bar — is the
 * failure. If the model is slower than expected, the hold simply lasts longer,
 * which is the truth.
 *
 * Under reduced motion the sweep does not run and the state is conveyed as text.
 */
export function ScanOverlay({ previewUrl, isModelLoading, loadProgress }: ScanOverlayProps) {
  const reducedMotion = useReducedMotion()
  const [inferenceProgress, setInferenceProgress] = useState(0)

  useEffect(() => {
    // While downloading, the real fetch fraction is authoritative — no need to
    // simulate anything.
    if (isModelLoading) return

    const start = performance.now()
    let frame = 0

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / AI_EXPECTED_INFERENCE_MS)
      setInferenceProgress(t * HOLD_AT)
      if (t < 1) frame = requestAnimationFrame(step)
      // At t === 1 we stop at exactly HOLD_AT and wait. The parent unmounts
      // this overlay when the result lands.
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [isModelLoading])

  const progress = isModelLoading ? (loadProgress ?? 0) : inferenceProgress

  const label = isModelLoading
    ? loadProgress === null
      ? 'downloading classifier...'
      : 'downloading classifier'
    : 'analysing...'

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden border border-border">
        <img
          src={previewUrl}
          alt=""
          aria-hidden="true"
          className="h-48 w-full object-cover opacity-60"
        />

        {!reducedMotion && (
          <>
            {/* The sweeping read-head. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-full animate-scan-line"
            >
              <div className="h-px w-full bg-action" />
            </div>
          </>
        )}
      </div>

      <TypingLine text={label} cursor={false} />

      <TerminalLoader
        progress={progress}
        label={isModelLoading ? 'Downloading classifier' : 'Analysing photo'}
      />

      {/* Static equivalent for screen readers and reduced motion. */}
      <p className="sr-only" role="status">
        {isModelLoading ? 'Downloading the classifier' : 'Analysing the photo on your device'}
      </p>
    </div>
  )
}
