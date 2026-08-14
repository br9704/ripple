import { useEffect, useState, type CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type Phase = 'idle' | 'sweep' | 'hold' | 'exit'

/**
 * A 2px bar that sweeps left→right on route change.
 *
 * SIGNAL spec: sweep 300ms · hold 50ms at 100% · off right 200ms. It replaces
 * nothing — the app previously swapped routes instantly — and gives navigation
 * a sense of mechanism without ever blocking input.
 *
 * Purely decorative, so it is hidden from assistive tech and does not run at
 * all under reduced motion.
 */
export function PageTransition() {
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')

  // Restart the sweep when the path changes, adjusting state during render
  // rather than from an effect.
  const [renderedFor, setRenderedFor] = useState(location.pathname)
  if (renderedFor !== location.pathname) {
    setRenderedFor(location.pathname)
    setPhase(reducedMotion ? 'idle' : 'sweep')
  }

  useEffect(() => {
    if (phase !== 'sweep') return

    const toHold = setTimeout(() => setPhase('hold'), 300)
    const toExit = setTimeout(() => setPhase('exit'), 350)
    const toIdle = setTimeout(() => setPhase('idle'), 550)

    return () => {
      clearTimeout(toHold)
      clearTimeout(toExit)
      clearTimeout(toIdle)
    }
  }, [phase])

  if (reducedMotion || phase === 'idle') return null

  // sweep: grows to full width. hold: stays. exit: slides off to the right.
  const style: CSSProperties =
    phase === 'sweep'
      ? { width: '100%', transition: 'width 300ms linear' }
      : phase === 'hold'
        ? { width: '100%' }
        : { width: '100%', transform: 'translateX(100%)', transition: 'transform 200ms linear' }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[99999] h-[2px] w-full overflow-hidden"
    >
      <div className="h-full bg-action" style={style} />
    </div>
  )
}
