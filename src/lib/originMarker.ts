/**
 * "Origin" — the marker for where you are standing.
 *
 * The map had no user-position indicator at all. `flyToUser` panned the camera
 * to your coordinates and then rendered nothing there, so the one thing a
 * civic reporting app most needs to confirm — *you are at the problem* — was
 * the one thing it never showed. Pan away and you were lost with no way back
 * but to tap locate again and hope.
 *
 * ── Why brackets and not a ripple ──
 * The obvious choice for an app called Ripple is an expanding circle. It is
 * the wrong one. `index.css` documents the ripple motif as "three places only
 * — report submitted (600ms), upvote (300ms), new report on the live map", and
 * marks `border-radius: 50%` as permitted nowhere else. A looping ripple under
 * your feet would be a fourth use, the only infinite one, and it would spend
 * the motif that the third case — a report actually landing on the map — has
 * been saved for and has never yet had the chance to fire.
 *
 * Brackets are the other half of SIGNAL's identity: `[ ◉ REPORT ]`, `[ terms &
 * privacy ]`, the focus brackets. Framing your position in the same corner
 * marks the capture control uses says "this is the thing being acted on" in a
 * language the app already speaks, and leaves the ripple intact.
 *
 * ── Why it settles and then stops ──
 * No ambient loop. The brackets close inward once, over --dur-base, and rest.
 * An empty map does not need a second thing breathing on it, a permanent
 * animation on a mostly-static screen reads as an alert rather than a fact,
 * and a marker that has stopped moving is easier to aim at. It also means
 * reduced-motion needs no special case: the global block collapses the
 * duration and, because the animation is `forwards`, it lands on exactly the
 * resting state it would have reached anyway.
 */

/** Corner order is TL, TR, BL, BR — matched by the `.origin-corner-*` rules. */
const CORNERS = ['tl', 'tr', 'bl', 'br'] as const

/**
 * Builds the marker element for `mapboxgl.Marker({ element })`.
 *
 * Mapbox uses the element given to it directly rather than wrapping it, so the
 * `pointer-events: none` in `.origin` is what stops a 44px invisible box from
 * swallowing taps meant for report pins underneath. That is a real hazard: the
 * marker sits exactly where the user is most likely to be looking for a pin.
 *
 * `doc` is injectable so the factory is testable without a live document.
 */
export function createOriginElement(doc: Document = document): HTMLElement {
  const el = doc.createElement('div')
  el.className = 'origin'
  // Decorative in the accessibility tree: the position is already announced by
  // LocationStatus in words, and a screen reader gains nothing from a second,
  // shapelier copy of the same fact.
  el.setAttribute('aria-hidden', 'true')

  for (const corner of CORNERS) {
    const span = doc.createElement('span')
    span.className = `origin-corner origin-corner-${corner}`
    el.appendChild(span)
  }

  const glyph = doc.createElement('span')
  glyph.className = 'origin-glyph'
  // The same glyph the capture control uses, so the marker reads as "here is
  // the thing you are about to report" rather than as a new symbol to learn.
  glyph.textContent = '◉'
  el.appendChild(glyph)

  return el
}
