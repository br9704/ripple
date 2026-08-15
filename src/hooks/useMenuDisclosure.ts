import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export interface MenuDisclosure {
  isOpen: boolean
  /** Flips the state. Safe to hand straight to the trigger's onClick. */
  toggle: () => void
  /**
   * Closes the menu. Pass `true` to move focus back to the trigger — do that
   * for dismissals the keyboard caused (Escape), not for a click outside,
   * where stealing focus back would be a jump the user did not ask for.
   */
  close: (restoreFocus?: boolean) => void
  triggerRef: RefObject<HTMLButtonElement | null>
  panelRef: RefObject<HTMLDivElement | null>
}

/**
 * Open/close state for a disclosure menu, with the three dismissals a menu is
 * expected to honour: Escape, a click outside, and (via `close`) navigation.
 *
 * This is a hook rather than component-local state because it is the part with
 * behaviour — document listeners, focus restoration, and the subtle rule that
 * the trigger must be excluded from the outside-click test. `AppMenu` is then
 * just markup, which is the split CLAUDE.md §6 asks for and the only way any of
 * this is testable without rendering a router.
 */
export function useMenuDisclosure(): MenuDisclosure {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback((restoreFocus = false) => {
    setIsOpen(false)
    // Without this, dismissing with Escape drops focus onto <body> and a
    // keyboard user has to tab from the top of the document to get back to
    // where they were.
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((open) => !open)
  }, [])

  useEffect(() => {
    // Listeners only exist while the menu is open — an app-wide keydown handler
    // that runs on every keystroke of every form is a cost with no purpose.
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      close(true)
    }

    function handleOutside(event: Event) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target)) return
      // The trigger has its own onClick. Closing here as well would run both
      // handlers on one tap — close, then toggle — and the menu would appear
      // not to close at all.
      if (triggerRef.current?.contains(target)) return
      close()
    }

    document.addEventListener('keydown', handleKeyDown)
    // mousedown/touchstart rather than click: on touch, a menu that survives
    // until the finger lifts reads as unresponsive.
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [isOpen, close])

  return { isOpen, toggle, close, triggerRef, panelRef }
}
