import { describe, it, expect } from 'vitest'
import { renderBar, formatPercent, renderLoader, BAR_WIDTH } from './progressBar'

describe('renderBar', () => {
  it('renders empty at 0 and full at 1', () => {
    expect(renderBar(0)).toBe('░'.repeat(BAR_WIDTH))
    expect(renderBar(1)).toBe('█'.repeat(BAR_WIDTH))
  })

  it('always returns a constant-width bar so the readout never reflows', () => {
    for (const p of [0, 0.13, 0.5, 0.9, 1]) {
      expect([...renderBar(p)]).toHaveLength(BAR_WIDTH)
    }
  })

  it('does not reach full at the 90% hold point', () => {
    // MOTION.md: the bar fills to 90% and HOLDS there until the real result
    // arrives. If 0.9 rendered as a full bar the hold would read as completion,
    // which is precisely the dishonesty the spec forbids.
    expect(renderBar(0.9)).toContain('░')
  })

  it('clamps out-of-range input rather than throwing', () => {
    // A rounding error upstream must never break the capture flow.
    expect([...renderBar(-5)]).toHaveLength(BAR_WIDTH)
    expect([...renderBar(42)]).toHaveLength(BAR_WIDTH)
    expect(renderBar(-5)).toBe('░'.repeat(BAR_WIDTH))
    expect(renderBar(42)).toBe('█'.repeat(BAR_WIDTH))
  })

  it('treats NaN as zero progress', () => {
    expect(renderBar(Number.NaN)).toBe('░'.repeat(BAR_WIDTH))
  })

  it('honours a custom width', () => {
    expect([...renderBar(0.5, 4)]).toHaveLength(4)
  })
})

describe('formatPercent', () => {
  it('renders integers only, so the count-up cannot jitter', () => {
    expect(formatPercent(0.7234)).toBe('72%')
    expect(formatPercent(0)).toBe('0%')
    expect(formatPercent(1)).toBe('100%')
  })

  it('clamps rather than reporting impossible percentages', () => {
    expect(formatPercent(1.4)).toBe('100%')
    expect(formatPercent(-0.2)).toBe('0%')
  })
})

describe('renderLoader', () => {
  it('produces the SIGNAL readout format', () => {
    expect(renderLoader(0.5, 4)).toBe('[██░░] 50%')
  })

  it('never shows 100% while the bar still has empty cells', () => {
    // Guards the inverse dishonesty: a percentage that outruns the bar.
    for (let i = 0; i <= 100; i++) {
      const out = renderLoader(i / 100)
      if (out.includes('100%')) expect(out).not.toContain('░')
    }
  })
})
