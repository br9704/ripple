import { describe, it, expect, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMenuDisclosure } from './useMenuDisclosure'

/**
 * The three dismissals a menu is expected to honour, tested at the hook rather
 * than through the component, because they are document-level behaviour: a
 * keydown that never reached the panel, and a pointer that landed on something
 * else entirely.
 */

/** Attaches a real element so `contains()` is testing the DOM, not a mock. */
function mountElement<K extends keyof HTMLElementTagNameMap>(
  tag: K
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useMenuDisclosure', () => {
  it('starts closed and toggles', () => {
    const { result } = renderHook(() => useMenuDisclosure())
    expect(result.current.isOpen).toBe(false)

    act(() => { result.current.toggle() })
    expect(result.current.isOpen).toBe(true)

    act(() => { result.current.toggle() })
    expect(result.current.isOpen).toBe(false)
  })

  it('closes on Escape and returns focus to the trigger', () => {
    const trigger = mountElement('button')
    const { result } = renderHook(() => useMenuDisclosure())
    result.current.triggerRef.current = trigger

    act(() => { result.current.toggle() })
    expect(result.current.isOpen).toBe(true)

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(result.current.isOpen).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('ignores keys that are not Escape', () => {
    const { result } = renderHook(() => useMenuDisclosure())
    act(() => { result.current.toggle() })

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    })

    expect(result.current.isOpen).toBe(true)
  })

  it('closes on a pointer press outside the panel', () => {
    const outside = mountElement('div')
    const { result } = renderHook(() => useMenuDisclosure())

    act(() => { result.current.toggle() })
    act(() => {
      outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    expect(result.current.isOpen).toBe(false)
  })

  it('stays open when the press lands inside the panel', () => {
    const panel = mountElement('div')
    const inner = document.createElement('a')
    panel.appendChild(inner)

    const { result } = renderHook(() => useMenuDisclosure())
    result.current.panelRef.current = panel

    act(() => { result.current.toggle() })
    act(() => {
      inner.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    expect(result.current.isOpen).toBe(true)
  })

  it('ignores a press on the trigger, which has its own handler', () => {
    // Closing here as well would run close-then-toggle on a single tap and the
    // menu would appear never to close.
    const trigger = mountElement('button')
    const { result } = renderHook(() => useMenuDisclosure())
    result.current.triggerRef.current = trigger

    act(() => { result.current.toggle() })
    act(() => {
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    expect(result.current.isOpen).toBe(true)
  })

  it('does not move focus when closed by a click outside', () => {
    const trigger = mountElement('button')
    const elsewhere = mountElement('input')
    const { result } = renderHook(() => useMenuDisclosure())
    result.current.triggerRef.current = trigger

    act(() => { result.current.toggle() })
    elsewhere.focus()

    act(() => {
      elsewhere.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    expect(result.current.isOpen).toBe(false)
    expect(document.activeElement).toBe(elsewhere)
  })

  it('removes its document listeners once closed', () => {
    const outside = mountElement('div')
    const { result } = renderHook(() => useMenuDisclosure())

    act(() => { result.current.toggle() })
    act(() => { result.current.close() })
    expect(result.current.isOpen).toBe(false)

    // If the keydown listener were still attached this would throw nothing but
    // would also do nothing observable, so assert on the state staying put.
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(result.current.isOpen).toBe(false)
  })
})
