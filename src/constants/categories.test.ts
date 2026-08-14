import { describe, it, expect } from 'vitest'
import { CATEGORIES, CATEGORY_MAP } from './categories'

// The severity mapping in supabase/migrations/011_triggers.sql
// (calculate_priority) must agree with the client, or the priority score the
// council sorts by will disagree with what the app implies.
const MIGRATION_011_SEVERITY: Record<string, number> = {
  streetlight: 3,
  tree: 3,
  accessibility: 2.5,
  pothole: 2,
  signage: 2,
  water: 2,
  footpath: 2,
  graffiti: 1,
  dumping: 1,
  other: 1,
}

describe('CATEGORIES', () => {
  it('covers all ten PRD categories', () => {
    expect(CATEGORIES).toHaveLength(10)
  })

  it('has no duplicate keys', () => {
    const keys = CATEGORIES.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('gives every category a distinct glyph', () => {
    // The whole point of moving off colour: identity must be unambiguous.
    // The old colour scheme failed this — streetlight and signage shared
    // #F0883E, so it was never actually 10-distinguishable.
    const glyphs = CATEGORIES.map((c) => c.glyph)
    expect(new Set(glyphs).size).toBe(glyphs.length)
  })

  it('uses no emoji — SIGNAL forbids emoji in UI', () => {
    // Emoji live above U+1F000 or carry a variation selector; these glyphs are
    // BMP geometric/box-drawing characters that render in the mono face.
    for (const c of CATEGORIES) {
      expect(c.glyph).not.toMatch(/\p{Extended_Pictographic}|️/u)
      expect([...c.glyph]).toHaveLength(1)
    }
  })

  it('carries a screen-reader label for every category, since a glyph reads as nothing', () => {
    for (const c of CATEGORIES) {
      expect(c.ariaLabel.length).toBeGreaterThan(3)
    }
  })

  it('matches calculate_priority() in migration 011', () => {
    for (const c of CATEGORIES) {
      expect(c.severityWeight, `severity for ${c.key}`).toBe(MIGRATION_011_SEVERITY[c.key])
    }
  })

  it('flags exactly the safety-critical categories for amber emphasis', () => {
    const safety = CATEGORIES.filter((c) => c.isSafety).map((c) => c.key).sort()
    expect(safety).toEqual(['accessibility', 'streetlight', 'tree'])
  })
})

describe('CATEGORY_MAP', () => {
  it('indexes every category by key', () => {
    for (const c of CATEGORIES) {
      expect(CATEGORY_MAP[c.key]).toBe(c)
    }
  })
})
