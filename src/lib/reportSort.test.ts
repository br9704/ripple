import { describe, it, expect } from 'vitest'
import { sortReports } from './reportSort'
import type { MapPin } from '@/types'

function pin(o: Partial<MapPin> = {}): MapPin {
  return {
    id: 'a', lat: 0, lng: 0, category: 'pothole', status: 'reported',
    upvote_count: 0, priority_score: 0, address: null, suburb: null,
    submitted_at: '2026-08-01T00:00:00Z', photo_url: null, ...o,
  }
}

describe('sortReports', () => {
  it('does not mutate the input', () => {
    // The input is shared useReports state; sorting in place would mutate it
    // and produce update loops that are miserable to trace.
    const reports = [pin({ id: 'a', upvote_count: 1 }), pin({ id: 'b', upvote_count: 9 })]
    const before = reports.map((r) => r.id)
    sortReports(reports, 'upvotes')
    expect(reports.map((r) => r.id)).toEqual(before)
  })

  it('sorts newest first', () => {
    const out = sortReports([
      pin({ id: 'old', submitted_at: '2026-01-01T00:00:00Z' }),
      pin({ id: 'new', submitted_at: '2026-08-01T00:00:00Z' }),
    ], 'newest')
    expect(out.map((r) => r.id)).toEqual(['new', 'old'])
  })

  it('sorts by upvotes descending', () => {
    const out = sortReports([
      pin({ id: 'low', upvote_count: 2 }),
      pin({ id: 'high', upvote_count: 30 }),
    ], 'upvotes')
    expect(out.map((r) => r.id)).toEqual(['high', 'low'])
  })

  it('sorts by priority descending', () => {
    const out = sortReports([
      pin({ id: 'low', priority_score: 5 }),
      pin({ id: 'high', priority_score: 88 }),
    ], 'priority')
    expect(out.map((r) => r.id)).toEqual(['high', 'low'])
  })

  it('breaks ties by id so ordering is total and stable', () => {
    // Two reports tied on upvotes must not swap places between renders.
    const reports = [pin({ id: 'b', upvote_count: 5 }), pin({ id: 'a', upvote_count: 5 })]
    expect(sortReports(reports, 'upvotes').map((r) => r.id)).toEqual(['a', 'b'])
    expect(sortReports([...reports].reverse(), 'upvotes').map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('treats an unparseable date as oldest rather than throwing', () => {
    const out = sortReports([
      pin({ id: 'bad', submitted_at: 'nope' }),
      pin({ id: 'good', submitted_at: '2026-08-01T00:00:00Z' }),
    ], 'newest')
    expect(out.map((r) => r.id)).toEqual(['good', 'bad'])
  })

  it('handles an empty list', () => {
    expect(sortReports([], 'newest')).toEqual([])
  })
})
