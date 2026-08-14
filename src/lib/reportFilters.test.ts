import { describe, it, expect } from 'vitest'
import { applyFilters, countActiveFilters, type ReportFilterCriteria } from './reportFilters'
import type { MapPin } from '@/types'

const NOW = new Date('2026-08-14T12:00:00Z').getTime()
const DAY = 24 * 60 * 60 * 1000

function pin(overrides: Partial<MapPin> = {}): MapPin {
  return {
    id: 'r1',
    lat: -37.81,
    lng: 144.96,
    category: 'pothole',
    status: 'reported',
    upvote_count: 0,
    priority_score: 0,
    address: null,
    suburb: null,
    submitted_at: new Date(NOW - DAY).toISOString(),
    photo_url: null,
    ...overrides,
  }
}

const NONE: ReportFilterCriteria = {
  categories: [],
  statuses: [],
  dateRange: 'all',
  minUpvotes: 0,
}

describe('applyFilters', () => {
  it('returns everything when nothing is filtered', () => {
    // This is the load-bearing case: empty arrays must mean "no constraint",
    // not "match nothing". The inverse renders an empty map on first open,
    // which reads as a broken app.
    const reports = [pin({ id: 'a' }), pin({ id: 'b', category: 'tree' })]
    expect(applyFilters(reports, NONE, NOW)).toHaveLength(2)
  })

  it('filters by category', () => {
    const reports = [pin({ id: 'a', category: 'pothole' }), pin({ id: 'b', category: 'tree' })]
    const out = applyFilters(reports, { ...NONE, categories: ['tree'] }, NOW)
    expect(out.map((r) => r.id)).toEqual(['b'])
  })

  it('treats multiple categories as OR, not AND', () => {
    const reports = [
      pin({ id: 'a', category: 'pothole' }),
      pin({ id: 'b', category: 'tree' }),
      pin({ id: 'c', category: 'water' }),
    ]
    const out = applyFilters(reports, { ...NONE, categories: ['pothole', 'water'] }, NOW)
    expect(out.map((r) => r.id)).toEqual(['a', 'c'])
  })

  it('filters by status', () => {
    const reports = [pin({ id: 'a', status: 'reported' }), pin({ id: 'b', status: 'fixed' })]
    const out = applyFilters(reports, { ...NONE, statuses: ['fixed'] }, NOW)
    expect(out.map((r) => r.id)).toEqual(['b'])
  })

  it('filters by minimum upvotes, inclusively', () => {
    const reports = [
      pin({ id: 'a', upvote_count: 4 }),
      pin({ id: 'b', upvote_count: 5 }),
      pin({ id: 'c', upvote_count: 6 }),
    ]
    const out = applyFilters(reports, { ...NONE, minUpvotes: 5 }, NOW)
    expect(out.map((r) => r.id)).toEqual(['b', 'c'])
  })

  it('filters by date range', () => {
    const reports = [
      pin({ id: 'recent', submitted_at: new Date(NOW - 3 * DAY).toISOString() }),
      pin({ id: 'old', submitted_at: new Date(NOW - 40 * DAY).toISOString() }),
    ]
    expect(applyFilters(reports, { ...NONE, dateRange: '7d' }, NOW).map((r) => r.id)).toEqual([
      'recent',
    ])
    expect(applyFilters(reports, { ...NONE, dateRange: '90d' }, NOW)).toHaveLength(2)
  })

  it('combines filters as AND across dimensions', () => {
    const reports = [
      pin({ id: 'match', category: 'tree', status: 'fixed', upvote_count: 9 }),
      pin({ id: 'wrong-status', category: 'tree', status: 'reported', upvote_count: 9 }),
      pin({ id: 'too-few', category: 'tree', status: 'fixed', upvote_count: 1 }),
    ]
    const out = applyFilters(
      reports,
      { categories: ['tree'], statuses: ['fixed'], dateRange: 'all', minUpvotes: 5 },
      NOW
    )
    expect(out.map((r) => r.id)).toEqual(['match'])
  })

  it('keeps a report with an unparseable timestamp rather than silently dropping it', () => {
    // A bad date should not make a citizen's report vanish from the map.
    const reports = [pin({ id: 'bad', submitted_at: 'not-a-date' })]
    expect(applyFilters(reports, { ...NONE, dateRange: '7d' }, NOW).map((r) => r.id)).toEqual([
      'bad',
    ])
  })

  it('does not mutate the input array', () => {
    const reports = [pin({ id: 'a' }), pin({ id: 'b', category: 'tree' })]
    const copy = [...reports]
    applyFilters(reports, { ...NONE, categories: ['tree'] }, NOW)
    expect(reports).toEqual(copy)
  })
})

describe('countActiveFilters', () => {
  it('counts nothing when unfiltered', () => {
    expect(countActiveFilters(NONE)).toBe(0)
  })

  it('counts each narrowing dimension once', () => {
    expect(countActiveFilters({ ...NONE, categories: ['tree', 'water'] })).toBe(1)
    expect(countActiveFilters({ ...NONE, dateRange: '30d' })).toBe(1)
    expect(countActiveFilters({ ...NONE, minUpvotes: 3 })).toBe(1)
  })

  it('sums across dimensions', () => {
    expect(
      countActiveFilters({
        categories: ['tree'],
        statuses: ['fixed'],
        dateRange: '7d',
        minUpvotes: 2,
      })
    ).toBe(4)
  })
})
