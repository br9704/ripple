import { describe, it, expect } from 'vitest'
import {
  getConfidenceTier,
  topPredictions,
  softmax,
  looksLikeProbabilities,
  toProbabilities,
} from './classification'
import { AI_CONFIDENCE_HIGH, AI_CONFIDENCE_MEDIUM } from '@/constants/config'
import type { ReportCategory } from '@/types'

const LABELS: ReportCategory[] = [
  'pothole', 'streetlight', 'graffiti', 'signage', 'accessibility',
  'dumping', 'water', 'tree', 'footpath', 'other',
]

describe('getConfidenceTier', () => {
  it('treats the exact thresholds as belonging to the higher tier', () => {
    // PRD §6.2 writes ">= 85%" and "60-84%", so 0.85 is certain and 0.60 asks.
    // Off-by-one here changes what the user is shown, so it is pinned exactly.
    expect(getConfidenceTier(AI_CONFIDENCE_HIGH)).toBe('certain')
    expect(getConfidenceTier(AI_CONFIDENCE_MEDIUM)).toBe('asking')
  })

  it('classifies just below each threshold into the lower tier', () => {
    expect(getConfidenceTier(AI_CONFIDENCE_HIGH - 0.0001)).toBe('asking')
    expect(getConfidenceTier(AI_CONFIDENCE_MEDIUM - 0.0001)).toBe('offering')
  })

  it('covers the full range', () => {
    expect(getConfidenceTier(1)).toBe('certain')
    expect(getConfidenceTier(0.94)).toBe('certain')
    expect(getConfidenceTier(0.72)).toBe('asking')
    expect(getConfidenceTier(0.3)).toBe('offering')
    expect(getConfidenceTier(0)).toBe('offering')
  })

  it('degrades to the least assertive tier on garbage input', () => {
    // A NaN must never render as a confident verdict.
    expect(getConfidenceTier(Number.NaN)).toBe('offering')
    expect(getConfidenceTier(Number.POSITIVE_INFINITY)).toBe('offering')
  })
})

describe('topPredictions', () => {
  it('returns the highest-scoring categories, ordered', () => {
    const scores = [0.1, 0.7, 0.05, 0, 0, 0, 0, 0, 0.15, 0]
    const top = topPredictions(scores, LABELS, 2)
    expect(top.map((p) => p.category)).toEqual(['streetlight', 'footpath'])
    expect(top[0].confidence).toBeCloseTo(0.7)
  })

  it('breaks ties deterministically by label order', () => {
    // The same photo must not classify differently between runs — an unstable
    // classifier reads to the user as a broken one.
    const scores = [0.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0]
    const a = topPredictions(scores, LABELS, 2)
    const b = topPredictions(scores, LABELS, 2)
    expect(a).toEqual(b)
    expect(a[0].category).toBe('pothole')
  })

  it('respects the requested count', () => {
    const scores = LABELS.map((_, i) => i / 10)
    expect(topPredictions(scores, LABELS, 1)).toHaveLength(1)
    expect(topPredictions(scores, LABELS, 3)).toHaveLength(3)
    expect(topPredictions(scores, LABELS, 0)).toHaveLength(0)
  })

  it('skips non-finite scores instead of ranking them first', () => {
    const scores = [Number.NaN, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0]
    const top = topPredictions(scores, LABELS, 2)
    expect(top.map((p) => p.category)).toEqual(['streetlight', 'graffiti'])
  })

  it('tolerates a score/label length mismatch', () => {
    expect(() => topPredictions([0.9], LABELS, 2)).not.toThrow()
    expect(topPredictions([0.9], LABELS, 2)).toHaveLength(1)
  })

  it('returns nothing for empty input', () => {
    expect(topPredictions([], LABELS)).toEqual([])
  })
})

describe('softmax', () => {
  it('produces a distribution summing to 1', () => {
    const out = softmax([1, 2, 3])
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })

  it('preserves ranking', () => {
    const out = softmax([1, 3, 2])
    expect(out[1]).toBeGreaterThan(out[2])
    expect(out[2]).toBeGreaterThan(out[0])
  })

  it('is numerically stable for large logits', () => {
    // Without the max-subtraction this overflows to NaN.
    const out = softmax([1000, 1001, 1002])
    expect(out.every(Number.isFinite)).toBe(true)
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })

  it('handles empty input', () => {
    expect(softmax([])).toEqual([])
  })
})

describe('looksLikeProbabilities', () => {
  it('accepts a vector that already sums to ~1', () => {
    expect(looksLikeProbabilities([0.7, 0.2, 0.1])).toBe(true)
  })

  it('rejects raw logits', () => {
    expect(looksLikeProbabilities([4.2, -1.1, 0.3])).toBe(false)
  })

  it('rejects vectors that do not sum to 1', () => {
    expect(looksLikeProbabilities([0.9, 0.9])).toBe(false)
  })

  it('rejects empty and non-finite input', () => {
    expect(looksLikeProbabilities([])).toBe(false)
    expect(looksLikeProbabilities([Number.NaN, 1])).toBe(false)
  })
})

describe('toProbabilities', () => {
  it('does not double-softmax an already-normalised vector', () => {
    // This is the bug worth guarding: softmaxing probabilities a second time
    // flattens them, turning a confident 0.94 into roughly 0.31 and silently
    // demoting every result from `certain` to `offering`.
    const probs = [0.94, 0.04, 0.02]
    const out = toProbabilities(probs)
    expect(out[0]).toBeCloseTo(0.94)
    expect(getConfidenceTier(out[0])).toBe('certain')
  })

  it('softmaxes raw logits', () => {
    const out = toProbabilities([4.2, -1.1, 0.3])
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    expect(out[0]).toBeGreaterThan(out[1])
  })
})
