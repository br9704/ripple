import { describe, it, expect } from 'vitest'
import { createOriginElement } from './originMarker'

describe('createOriginElement', () => {
  it('frames the position with four corner brackets and the capture glyph', () => {
    const el = createOriginElement()
    expect(el.querySelectorAll('.origin-corner')).toHaveLength(4)
    expect(el.querySelector('.origin-glyph')?.textContent).toBe('◉')
  })

  it('gives each corner its own positioning class', () => {
    const el = createOriginElement()
    const classes = [...el.querySelectorAll('.origin-corner')].map((c) =>
      [...c.classList].find((n) => n.startsWith('origin-corner-'))
    )
    // Four distinct corners. Two sharing a class would stack invisibly in one
    // corner and read as a bracket pair rather than a frame.
    expect(new Set(classes).size).toBe(4)
  })

  it('carries the .origin class, which is what makes it ignore pointer events', () => {
    // Mapbox uses the given element directly rather than wrapping it, so the
    // `pointer-events: none` in that class is the only thing stopping a 44px
    // invisible box from swallowing taps meant for report pins underneath —
    // exactly where a user is most likely to be aiming.
    expect(createOriginElement().className).toBe('origin')
  })

  it('is hidden from the accessibility tree', () => {
    // LocationStatus already announces the position in words; a second,
    // shapelier copy of the same fact is noise to a screen reader.
    expect(createOriginElement().getAttribute('aria-hidden')).toBe('true')
  })

  it('builds from the document it is handed, not a global', () => {
    // Injectable so the factory stays testable and cannot quietly depend on a
    // live document that a non-DOM environment would not have.
    const el = createOriginElement(document)
    expect(el.ownerDocument).toBe(document)
  })

  it('returns a fresh element each call', () => {
    // Two maps, or a remount, must not share one node — reparenting would make
    // the marker vanish from the first map with no error anywhere.
    expect(createOriginElement()).not.toBe(createOriginElement())
  })
})
