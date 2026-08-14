import { describe, it, expect } from 'vitest'
import { detectCouncil } from './councilDetection'
import type { CouncilBoundaryWithCouncil } from '@/types'

/** Builds a square boundary from a lng/lat bounding box. */
function boundary(
  id: string,
  name: string,
  slug: string,
  [minLng, minLat, maxLng, maxLat]: [number, number, number, number]
): CouncilBoundaryWithCouncil {
  return {
    id: `boundary-${id}`,
    council_id: id,
    council_name: name,
    council_slug: slug,
    source: 'test',
    updated_at: '2026-01-01T00:00:00Z',
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    },
  }
}

// Mirrors the real overlap in supabase/seed/001_melbourne_councils.sql:
// Melbourne spans 144.9400–144.9850, Yarra spans 144.9700–145.0100.
// The strip 144.970–144.985 is inside both.
const MELBOURNE = boundary('c-melbourne', 'City of Melbourne', 'city-of-melbourne', [
  144.94, -37.84, 144.985, -37.79,
])
const YARRA = boundary('a-yarra', 'City of Yarra', 'city-of-yarra', [
  144.97, -37.84, 145.01, -37.79,
])

describe('detectCouncil', () => {
  it('returns null when the point is outside every boundary', () => {
    expect(detectCouncil(-37.815, 151.2, [MELBOURNE, YARRA])).toBeNull()
  })

  it('returns null for an empty boundary list', () => {
    expect(detectCouncil(-37.815, 144.96, [])).toBeNull()
  })

  it('returns the sole containing council', () => {
    // lng 144.95 is inside Melbourne only.
    const result = detectCouncil(-37.815, 144.95, [MELBOURNE, YARRA])
    expect(result?.council_slug).toBe('city-of-melbourne')
  })

  it('returns the sole containing council regardless of array position', () => {
    // lng 145.0 is inside Yarra only.
    const result = detectCouncil(-37.815, 145.0, [MELBOURNE, YARRA])
    expect(result?.council_slug).toBe('city-of-yarra')
  })

  describe('overlapping boundaries (PRD Q3 — nearest centroid wins)', () => {
    // lng 144.9725 sits in the shared strip, but nearer Melbourne's centre
    // (144.9625) than Yarra's (144.99).
    const LNG_NEAR_MELBOURNE = 144.9725
    // lng 144.9825 is also shared, but nearer Yarra's centre.
    const LNG_NEAR_YARRA = 144.9825

    it('picks the council whose centroid is closest, not the first match', () => {
      const result = detectCouncil(-37.815, LNG_NEAR_MELBOURNE, [MELBOURNE, YARRA])
      expect(result?.council_slug).toBe('city-of-melbourne')
    })

    it('picks the other council when the point is nearer its centroid', () => {
      const result = detectCouncil(-37.815, LNG_NEAR_YARRA, [MELBOURNE, YARRA])
      expect(result?.council_slug).toBe('city-of-yarra')
    })

    it('is order-independent — this is the actual regression being guarded', () => {
      // The old implementation returned boundaries[0] and so flipped its answer
      // when Supabase returned rows in a different order.
      const forward = detectCouncil(-37.815, LNG_NEAR_MELBOURNE, [MELBOURNE, YARRA])
      const reversed = detectCouncil(-37.815, LNG_NEAR_MELBOURNE, [YARRA, MELBOURNE])
      expect(forward).toEqual(reversed)
      expect(forward?.council_slug).toBe('city-of-melbourne')
    })

    it('is order-independent for the other side of the strip too', () => {
      const forward = detectCouncil(-37.815, LNG_NEAR_YARRA, [MELBOURNE, YARRA])
      const reversed = detectCouncil(-37.815, LNG_NEAR_YARRA, [YARRA, MELBOURNE])
      expect(forward).toEqual(reversed)
      expect(forward?.council_slug).toBe('city-of-yarra')
    })
  })

  describe('malformed input', () => {
    it('skips boundaries with a null polygon', () => {
      const broken = { ...MELBOURNE, polygon: null as unknown as Record<string, unknown> }
      const result = detectCouncil(-37.815, 145.0, [broken, YARRA])
      expect(result?.council_slug).toBe('city-of-yarra')
    })

    it('skips polygons that throw inside Turf rather than propagating', () => {
      const garbage = {
        ...MELBOURNE,
        council_id: 'garbage',
        polygon: { type: 'Polygon', coordinates: 'not-an-array' } as unknown as Record<
          string,
          unknown
        >,
      }
      expect(() => detectCouncil(-37.815, 145.0, [garbage, YARRA])).not.toThrow()
      expect(detectCouncil(-37.815, 145.0, [garbage, YARRA])?.council_slug).toBe('city-of-yarra')
    })
  })

  it('treats coordinates as [lng, lat] — swapping them finds nothing', () => {
    // A latitude of -37.815 is not a valid longitude for these boxes, so if the
    // implementation ever swapped the order this would start returning a match.
    expect(detectCouncil(144.96, -37.815, [MELBOURNE, YARRA])).toBeNull()
  })
})
