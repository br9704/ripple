import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { reportsToGeoJSON, timeAgo } from './mapHelpers'
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
