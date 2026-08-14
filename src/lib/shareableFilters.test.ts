import { describe, it, expect } from 'vitest'
import { encodeFilters, decodeFilters } from './shareableFilters'
import type { ReportCategory, ReportStatus } from '@/types'

const CATS: ReportCategory[] = ['pothole', 'tree', 'accessibility']
const STATUSES: ReportStatus[] = ['reported', 'fixed']

describe('encodeFilters', () => {
  it('omits defaults so a shared link stays short and readable', () => {
    const p = encodeFilters({ categories: [], statuses: [], dateRange: 'all', minUpvotes: 0 })
    expect(p.toString()).toBe('')
  })

  it('encodes only what was set', () => {
    const p = encodeFilters({
      categories: ['pothole', 'tree'],
      statuses: [],
      dateRange: '30d',
      minUpvotes: 5,
    })
    expect(p.get('cat')).toBe('pothole,tree')
    expect(p.get('status')).toBeNull()
    expect(p.get('since')).toBe('30d')
    expect(p.get('minup')).toBe('5')
  })
})

describe('decodeFilters', () => {
  const decode = (qs: string) => decodeFilters(new URLSearchParams(qs), CATS, STATUSES)

  it('round-trips', () => {
    const original = {
      categories: ['pothole', 'tree'] as ReportCategory[],
      statuses: ['fixed'] as ReportStatus[],
      dateRange: '7d' as const,
      minUpvotes: 10,
    }
    expect(decodeFilters(encodeFilters(original), CATS, STATUSES)).toEqual(original)
  })

  it('drops unknown categories — a shared link is untrusted input', () => {
    // Someone can hand-edit the URL; an unrecognised value must never reach a
    // Mapbox expression or a database query.
    expect(decode('cat=pothole,DROP TABLE,tree').categories).toEqual(['pothole', 'tree'])
  })

  it('drops unknown statuses', () => {
    expect(decode('status=fixed,bogus').statuses).toEqual(['fixed'])
  })

  it('falls back to "all" for an invalid range', () => {
    expect(decode('since=99y').dateRange).toBe('all')
  })

  it('rejects negative, NaN and absurd upvote thresholds', () => {
    expect(decode('minup=-5').minUpvotes).toBe(0)
    expect(decode('minup=abc').minUpvotes).toBe(0)
    expect(decode('minup=999999').minUpvotes).toBe(1000)
  })

  it('returns clean defaults for an empty query string', () => {
    expect(decode('')).toEqual({
      categories: [], statuses: [], dateRange: 'all', minUpvotes: 0,
    })
  })
})
