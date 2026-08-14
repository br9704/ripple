import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * True when the user has asked for reduced motion.
 *
 * MOTION.md states this as a hard rule with no exceptions: reduced motion means
 * *everything* static, including the Sprint 7 scan sweep. The CSS media query in
 * index.css handles declarative animation; this hook exists for the cases CSS
 * cannot reach — typing effects, count-ups, and looping sequences driven by
 * JavaScript timers, which must not merely animate faster but must not run at
 * all.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)

    // Safari < 14 only has the deprecated addListener form.
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    // Safari <14 has only the deprecated form, and dropping it would silently
    // disable reduced-motion support on those devices.
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- deliberate
    mql.addListener(onChange)
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- pairs with addListener
      mql.removeListener(onChange)
    }
  }, [])

  return reduced
}
