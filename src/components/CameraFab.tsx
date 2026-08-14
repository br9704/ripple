import { useNavigate } from 'react-router-dom'

/**
 * Primary CTA — a bracketed instrument control.
 *
 * The previous version was the single most non-compliant element in the repo:
 * `rounded-full bg-action shadow-glow animate-pulse-slow` broke four SIGNAL
 * rules at once (radius, shadow, sparing-accent, no-bounce — a 2s scale(1.05)
 * breathe). SIGNAL's amber allowance explicitly covers CTAs, so amber *type*
 * inside a hairline bracket survives; a 64px glowing pulsing disc does not.
 *
 * PRD §10.2 requires a minimum 60x60pt target for this control, so the hit area
 * is preserved even though the visual weight drops sharply.
 */
export function CameraFab() {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate('/report')}
      aria-label="Report an issue"
      className="fixed bottom-[72px] left-1/2 z-50 flex h-[60px] min-w-[160px] -translate-x-1/2 items-center justify-center gap-2 border border-action bg-bg-primary px-6 font-mono text-sm tracking-wide text-action transition-colors duration-150 ease-signal hover:bg-action hover:text-bg-primary active:bg-action active:text-bg-primary"
    >
      <span aria-hidden="true">[</span>
      <span aria-hidden="true" className="status-pulse">
        ◉
      </span>
      <span>REPORT</span>
      <span aria-hidden="true">]</span>
    </button>
  )
}
