import { useEffect, useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useMenuDisclosure } from '@/hooks/useMenuDisclosure'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface MenuDestination {
  path: string
  label: string
  hint: string
}

/**
 * Every entry is a route that actually exists in `App.tsx`. Two of them exist
 * nowhere else in the UI: `/council` had no link at all — a real page reachable
 * only by typing the URL — and `/terms` is new in S21.6. The rest are duplicated
 * from the tab bar deliberately, because the tab bar is not rendered on every
 * screen and a menu that is missing the obvious destinations is a menu people
 * stop opening.
 */
const DESTINATIONS: readonly MenuDestination[] = [
  { path: '/', label: 'map', hint: 'live reports near you' },
  { path: '/feed', label: 'feed', hint: 'everything, newest first' },
  { path: '/search', label: 'search', hint: 'find a report' },
  { path: '/my-reports', label: 'my reports', hint: 'kept on this device' },
  { path: '/council', label: 'council dashboard', hint: 'for council staff' },
  { path: '/terms', label: 'terms & privacy', hint: 'what happens to a report' },
]

/**
 * The header menu (S21.7).
 *
 * This button spent the whole project disabled, with a title attribute standing
 * in for a destination, because SIGNAL forbids dead links and there was
 * genuinely nowhere to go. S21.6 built the destination, so the honest control
 * is now an enabled one.
 *
 * A dropdown disclosure rather than a `role="menu"` widget: the ARIA menu
 * pattern obliges arrow-key roving focus and typeahead, and buys nothing here,
 * where six links in a nav are already reachable by Tab on a keyboard and by
 * swipe in a screen reader. The trigger carries `aria-expanded`/`aria-controls`,
 * which is the part that actually communicates state.
 */
export function AppMenu() {
  const { isOpen, toggle, close, triggerRef, panelRef } = useMenuDisclosure()
  const reduced = useReducedMotion()
  const { pathname } = useLocation()
  const panelId = useId()

  // Close on navigation. Tapping an item closes it directly, but a route can
  // also change under an open menu — the back button, or a redirect.
  useEffect(() => {
    close()
  }, [pathname, close])

  // Opening with the keyboard should land on the first destination, not leave
  // focus parked on a trigger whose panel is now below it.
  useEffect(() => {
    if (!isOpen) return
    panelRef.current?.querySelector('a')?.focus()
  }, [isOpen, panelRef])

  return (
    <div
      className="relative"
      onBlur={(event) => {
        // Tabbing past the last item dismisses the menu, the same as clicking
        // away. `relatedTarget` is null when focus leaves the document entirely,
        // which `contains` correctly treats as "outside".
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        className="flex h-11 w-11 items-center justify-center text-text-secondary transition-colors hover:text-text-primary"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            id={panelId}
            // MOTION.md: ease-out only, nothing over 600ms, and reduced motion
            // means static — not faster. `initial={false}` skips the enter
            // animation outright rather than compressing it.
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 max-w-[calc(100vw-2rem)] border border-border-bright bg-bg-secondary"
          >
            <nav aria-label="Main menu">
              <ul>
                {DESTINATIONS.map((destination) => {
                  const isCurrent = pathname === destination.path
                  return (
                    <li key={destination.path}>
                      <Link
                        to={destination.path}
                        onClick={() => close()}
                        aria-current={isCurrent ? 'page' : undefined}
                        // min-h-[44px]: the iOS touch-target floor, which the
                        // old 36px header buttons sat under.
                        className="flex min-h-[44px] flex-col justify-center border-b border-border px-4 py-2 transition-colors last:border-b-0 hover:bg-bg-primary"
                      >
                        <span
                          className={`font-mono text-xs ${isCurrent ? 'text-action' : 'text-text-primary'}`}
                        >
                          {destination.label}
                        </span>
                        <span className="font-mono text-xs text-text-tertiary">{destination.hint}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
