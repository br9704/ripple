import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { STATUSES } from './statuses'

/**
 * S21.13 — the palette must meet WCAG 2.1 AA, and its three copies must agree.
 *
 * PRD §10.2 requires WCAG 2.1 AA, and PRD §13 puts it more sharply: "the app
 * that helps report accessibility hazards must itself be accessible". An
 * accessibility product failing a contrast ratio is the one bug it cannot
 * afford, so this is a build failure rather than a lint warning.
 *
 * Two things went wrong, and this file exists to stop both recurring:
 *
 *  1. `#55504a` measured 2.56:1. It was found and raised for
 *     `--color-text-tertiary` in an earlier sprint — but the identical value
 *     in `status.declined` was left, so the same bug kept rendering from a
 *     different token. Lighthouse scored A11y 100 throughout, because it only
 *     grades what is painted on the route it audits, and a declined report is
 *     not on the feed's first screen.
 *
 *  2. The palette is defined three times — `tailwind.config.js` (what the
 *     `text-status-*` utilities actually compile from), `src/index.css` (the
 *     custom properties), and `statuses.ts` (literals for Mapbox paint
 *     properties, which cannot read a CSS variable). A fix applied to one file
 *     changes nothing a user sees. Reading the other two files from disk here
 *     is deliberate: this test's whole job is to catch a value that is correct
 *     in one place and stale in another, which a test importing only the
 *     module could never see.
 */

const BG = '#050505' // --color-bg
const AA_NORMAL_TEXT = 4.5

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

const root = resolve(__dirname, '../..')
const tailwindSource = readFileSync(resolve(root, 'tailwind.config.js'), 'utf8')
const cssSource = readFileSync(resolve(root, 'src/index.css'), 'utf8')

/** Reads `key: '#rrggbb'` out of the tailwind config's `status` block. */
function tailwindStatus(key: string): string | undefined {
  const block = /status:\s*\{([\s\S]*?)\}/.exec(tailwindSource)?.[1]
  return new RegExp(`['"]?${key}['"]?:\\s*'(#[0-9a-fA-F]{6})'`).exec(block ?? '')?.[1]
}

function cssToken(name: string): string | undefined {
  return new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(cssSource)?.[1]
}

describe('contrast sanity of the measurement itself', () => {
  // Without these, every assertion below could pass because the maths is
  // broken rather than because the palette is correct — the vacuous-gate
  // failure this sprint exists to stop repeating.
  it('scores white on the app background near the theoretical maximum', () => {
    expect(contrast('#ffffff', BG)).toBeGreaterThan(19)
  })

  it('scores a colour against itself as 1:1', () => {
    expect(contrast(BG, BG)).toBeCloseTo(1, 5)
  })

  it('fails the value that started this: #55504a was 2.56:1', () => {
    expect(contrast('#55504a', BG)).toBeLessThan(AA_NORMAL_TEXT)
    expect(contrast('#55504a', BG)).toBeCloseTo(2.56, 1)
  })
})

describe('status palette meets WCAG 2.1 AA (PRD §10.2)', () => {
  it.each(STATUSES.map((s) => [s.key, s.color] as const))(
    '%s (%s) is at least 4.5:1 on the app background',
    (_key, color) => {
      expect(contrast(color, BG)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    },
  )

  it('never relies on colour alone to convey status', () => {
    // PRD §10.2. Contrast is necessary but not sufficient: the marker glyph is
    // what makes status readable without colour vision at all.
    const markers = STATUSES.map((s) => s.marker)
    expect(markers.every((m) => m.length > 0)).toBe(true)
    // `declined` and `wont_fix` share a colour by design, so the glyph is not
    // required to be unique — but a status with neither a unique colour nor a
    // glyph would be invisible, and that must never ship.
    expect(new Set(markers).size).toBeGreaterThan(1)
  })
})

describe('the three copies of the palette agree', () => {
  const CSS_TOKEN_FOR: Record<string, string> = {
    reported: 'color-status-reported',
    fixed: 'color-status-fixed',
    declined: 'color-status-declined',
    wont_fix: 'color-status-declined',
  }

  it.each(
    STATUSES.filter((s) => s.key !== 'acknowledged' && s.key !== 'in_progress').map(
      (s) => [s.key, s.color] as const,
    ),
  )('%s matches the --color-status-* custom property', (key, color) => {
    // `acknowledged` and `in_progress` are excluded because they resolve
    // through the `--amber*` aliases rather than carrying their own literal.
    expect(cssToken(CSS_TOKEN_FOR[key])).toBe(color)
  })

  it.each([
    ['reported', 'reported'],
    ['acknowledged', 'acknowledged'],
    ['fixed', 'fixed'],
    ['declined', 'declined'],
  ] as const)('%s matches tailwind.config.js, which is what the utilities compile from', (statusKey, twKey) => {
    const fromModule = STATUSES.find((s) => s.key === statusKey)?.color
    expect(tailwindStatus(twKey)).toBe(fromModule)
  })

  it('the amber-dim alias behind `acknowledged` also clears AA', () => {
    const dim = cssToken('amber-dim')
    expect(dim).toBeDefined()
    expect(contrast(dim!, BG)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })

  it('no stale copy of the pre-fix values survives as a live value', () => {
    // The specific regression: a value corrected in one file and left in
    // another. Named literals rather than a general scan, because these three
    // are the ones that were actually wrong.
    //
    // Comments are stripped first. Both files deliberately record the old
    // values in prose ("was #8f6300 (3.84:1)") so the history is legible, and
    // a scan that could not tell a live value from a documented one would
    // force us to delete the explanation to make the test pass — which is the
    // wrong trade every time.
    const stripComments = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

    for (const stale of ['#55504a', '#4a7c4e', '#8f6300']) {
      expect(stripComments(tailwindSource)).not.toContain(stale)
      expect(stripComments(cssSource)).not.toContain(stale)
    }
  })
})
