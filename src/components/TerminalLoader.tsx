import { renderLoader } from '@/lib/progressBar'

interface TerminalLoaderProps {
  /** 0–1. */
  progress: number
  /** Accessible description of what is loading. */
  label: string
  className?: string
}

/**
 * The SIGNAL loader: `[████░░░░] 72%`.
 *
 * SIGNAL has no spinners — MOTION.md forbids them outright, because a generic
 * spinner breaks the instrument language and, worse, communicates nothing about
 * progress. This bar and the typing line are the only two loading vocabularies
 * in the system.
 *
 * Exposed to assistive tech as a real progressbar with a numeric value, so the
 * animated state has the static equivalent MOTION.md requires.
 */
export function TerminalLoader({ progress, label, className = '' }: TerminalLoaderProps) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      // tabular-nums stops the percentage jittering as digits change width.
      className={`font-mono text-xs tabular-nums text-text-secondary ${className}`}
    >
      {renderLoader(progress)}
    </div>
  )
}
