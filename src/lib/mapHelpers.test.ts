import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { reportsToGeoJSON, timeAgo, heatWeight, recencyWeight } from './mapHelpers'
import type { MapPin } from '@/types'

function pin(overrides: Partial<MapPin> = {}): MapPin {
  return {
    id: 'r1',
    lat: -37.8136,
    lng: 144.9631,
    category: 'pothole',
    status: 'reported',
    upvote_count: 3,
    priority_score: 24.5,
    address: '123 Smith St',
    suburb: 'Fitzroy',
    submitted_at: '2026-08-01T00:00:00Z',
    photo_url: null,
    ...overrides,
  }
}

describe('reportsToGeoJSON', () => {
  it('returns an empty FeatureCollection for no reports', () => {
    expect(reportsToGeoJSON([])).toEqual({ type: 'FeatureCollection', features: [] })
  })

  it('emits coordinates as [lng, lat], not [lat, lng]', () => {
    // Mapbox rejects swapped coordinates silently by rendering pins in the
    // ocean, so this ordering is worth pinning down explicitly.
    const [feature] = reportsToGeoJSON([pin()]).features
    expect(feature.geometry).toEqual({ type: 'Point', coordinates: [144.9631, -37.8136] })
  })

  it('carries the properties the map layers read', () => {
    const [feature] = reportsToGeoJSON([pin()]).features
    expect(feature.properties).toMatchObject({
      id: 'r1',
      category: 'pothole',
      status: 'reported',
      upvote_count: 3,
      priority_score: 24.5,
    })
  })

  it('coerces null address and suburb to empty strings', () => {
    // Mapbox expressions choke on null property values.
    const [feature] = reportsToGeoJSON([pin({ address: null, suburb: null })]).features
    expect(feature.properties?.address).toBe('')
    expect(feature.properties?.suburb).toBe('')
  })

  it('preserves order and count for multiple reports', () => {
    const result = reportsToGeoJSON([pin({ id: 'a' }), pin({ id: 'b' }), pin({ id: 'c' })])
    expect(result.features).toHaveLength(3)
    expect(result.features.map((f) => f.properties?.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('timeAgo', () => {
  const NOW = new Date('2026-08-14T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function ago(ms: number): string {
    return timeAgo(new Date(NOW.getTime() - ms).toISOString())
  }

  const SECOND = 1000
  const MINUTE = 60 * SECOND
  const HOUR = 60 * MINUTE
  const DAY = 24 * HOUR

  it('reports sub-minute ages as "just now"', () => {
    expect(ago(0)).toBe('just now')
    expect(ago(59 * SECOND)).toBe('just now')
  })

  it('switches to minutes at exactly 60s', () => {
    expect(ago(60 * SECOND)).toBe('1m ago')
    expect(ago(59 * MINUTE)).toBe('59m ago')
  })

  it('switches to hours at exactly 60m', () => {
    expect(ago(HOUR)).toBe('1h ago')
    expect(ago(23 * HOUR)).toBe('23h ago')
  })

  it('switches to days at exactly 24h', () => {
    expect(ago(DAY)).toBe('1d ago')
    expect(ago(29 * DAY)).toBe('29d ago')
  })

  it('switches to months at 30d', () => {
    expect(ago(30 * DAY)).toBe('1mo ago')
    expect(ago(365 * DAY)).toBe('12mo ago')
  })
})

describe('recencyWeight (PRD §6.3 — reports > 90 days at 0.3x)', () => {
  const NOW = new Date('2026-08-14T12:00:00Z').getTime()
  const DAY = 24 * 60 * 60 * 1000
  const at = (days: number) => new Date(NOW - days * DAY).toISOString()

  it('is 1 for a brand-new report', () => {
    expect(recencyWeight(at(0), NOW)).toBeCloseTo(1)
  })

  it('reaches the 0.3 floor at exactly 90 days', () => {
    expect(recencyWeight(at(90), NOW)).toBeCloseTo(0.3)
  })

  it('stays at the floor beyond 90 days rather than going negative', () => {
    expect(recencyWeight(at(365), NOW)).toBeCloseTo(0.3)
  })

  it('decays linearly rather than stepping', () => {
    // A step would make reports visibly pop off the heatmap the morning they
    // turn 91 days old.
    const mid = recencyWeight(at(45), NOW)
    expect(mid).toBeGreaterThan(0.3)
    expect(mid).toBeLessThan(1)
    expect(mid).toBeCloseTo(0.65, 2)
  })

  it('treats an unparseable date as oldest rather than throwing', () => {
    expect(recencyWeight('not-a-date', NOW)).toBeCloseTo(0.3)
  })
})

describe('heatWeight', () => {
  const NOW = new Date('2026-08-14T12:00:00Z').getTime()
  const fresh = NOW

  it('never returns zero for an un-upvoted report', () => {
    // A brand-new hazard nobody has seen yet is exactly what a council most
    // needs to find; multiplying by zero upvotes would erase it entirely.
    const w = heatWeight(pin({ upvote_count: 0, submitted_at: new Date(fresh).toISOString() }), NOW)
    expect(w).toBeGreaterThan(0)
  })

  it('scales with upvotes', () => {
    const low = heatWeight(pin({ upvote_count: 1 }), NOW)
    const high = heatWeight(pin({ upvote_count: 20 }), NOW)
    expect(high).toBeGreaterThan(low)
  })

  it('weights a safety category above a cosmetic one at equal upvotes', () => {
    // streetlight severity 3 vs graffiti severity 1 — migration 011 agrees.
    const streetlight = heatWeight(pin({ category: 'streetlight', upvote_count: 5 }), NOW)
    const graffiti = heatWeight(pin({ category: 'graffiti', upvote_count: 5 }), NOW)
    expect(streetlight).toBeCloseTo(graffiti * 3)
  })

  it('weights a fresh report above an identical stale one', () => {
    const DAY = 24 * 60 * 60 * 1000
    const freshPin = pin({ submitted_at: new Date(NOW - DAY).toISOString() })
    const stalePin = pin({ submitted_at: new Date(NOW - 200 * DAY).toISOString() })
    expect(heatWeight(freshPin, NOW)).toBeGreaterThan(heatWeight(stalePin, NOW))
  })
})
