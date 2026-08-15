import { describe, it, expect } from 'vitest'
import {
  PLACEHOLDER_PREFIX,
  TERMS_REVIEW_NOTICE,
  TERMS_SECTIONS,
  isPlaceholder,
} from './terms'

const ALL_LINES = TERMS_SECTIONS.flatMap((s) => s.body)
const FULL_TEXT = [TERMS_REVIEW_NOTICE, ...ALL_LINES].join('\n').toLowerCase()

/**
 * These are not tests of prose quality — they are the enforcement mechanism for
 * two rules that are otherwise only conventions.
 *
 * The first is PRD §13.4/§15: the prohibitions must exist in writing. A future
 * edit that trims the terms for length must not be able to silently drop the
 * one clause the PRD names explicitly.
 *
 * The second is CLAUDE.md's honesty rule. The page was written by engineers,
 * not lawyers, and the legal facts it cannot know are marked rather than
 * guessed. The checks below fail if someone later fills a placeholder with an
 * invented company, address, or contact instead of a real one — the specific
 * failure mode this rule exists to prevent.
 */
describe('terms copy — PRD-mandated content', () => {
  it('prohibits photographing people', () => {
    expect(FULL_TEXT).toContain('do not photograph identifiable people')
    const section = TERMS_SECTIONS.find((s) => s.id === 'no-people')
    expect(section).toBeDefined()
    expect(section?.body.join(' ')).toMatch(/prohibited/i)
  })

  it('puts private property out of scope', () => {
    expect(TERMS_SECTIONS.map((s) => s.id)).toContain('no-private-property')
    expect(FULL_TEXT).toContain('private property')
  })

  it('states plainly that reports are public', () => {
    expect(FULL_TEXT).toContain('every report is published')
  })

  it('describes the reporter token as anonymous and not an identity', () => {
    expect(FULL_TEXT).toContain('no accounts')
    expect(FULL_TEXT).toContain('not a login')
  })

  it('describes email as opt-in and notification-only', () => {
    expect(FULL_TEXT).toContain('never asked for an email address in order to report')
    expect(FULL_TEXT).toContain('status updates')
  })

  it('describes community flagging', () => {
    expect(FULL_TEXT).toContain('flagged')
    expect(FULL_TEXT).toContain('five flags')
  })

  it('leads with a notice that the document needs legal review', () => {
    expect(TERMS_REVIEW_NOTICE.toLowerCase()).toContain('has not been reviewed by a lawyer')
    expect(TERMS_REVIEW_NOTICE.toLowerCase()).toContain('qualified adviser')
  })
})

describe('terms copy — honesty rules', () => {
  it('has every unresolved item marked in the CLAUDE.md placeholder form', () => {
    const placeholders = ALL_LINES.filter(isPlaceholder)
    expect(placeholders.length).toBeGreaterThan(0)
    for (const line of placeholders) {
      expect(line.startsWith(PLACEHOLDER_PREFIX)).toBe(true)
      expect(line.endsWith(']')).toBe(true)
      // A marker with no description is as useless as no marker: the owner has
      // to be able to tell what they are being asked for.
      expect(line.length).toBeGreaterThan(PLACEHOLDER_PREFIX.length + 10)
    }
  })

  it('leaves the legal identity, jurisdiction, contact and date unresolved', () => {
    const placeholderText = ALL_LINES.filter(isPlaceholder).join(' ').toLowerCase()
    expect(placeholderText).toContain('legal entity')
    expect(placeholderText).toContain('governing law')
    expect(placeholderText).toContain('address')
    expect(placeholderText).toContain('effective date')
  })

  it('invents no company, contact, or jurisdiction', () => {
    const shipped = ALL_LINES.filter((line) => !isPlaceholder(line)).join(' ')
    // A registered-entity suffix, an email address, an ABN/ACN, or a copyright
    // line in shipped copy would all be fabricated — none is knowable from this
    // repository.
    expect(shipped).not.toMatch(/\bPty\b|\bLtd\b|\bLLC\b|\bInc\b/i)
    expect(shipped).not.toMatch(/\S+@\S+\.\S+/)
    expect(shipped).not.toMatch(/\bABN\b|\bACN\b/i)
    expect(shipped).not.toMatch(/©|\(c\)\s*20\d\d/i)
  })

  it('gives every section an id, a heading and a body', () => {
    const ids = TERMS_SECTIONS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const section of TERMS_SECTIONS) {
      expect(section.heading.trim()).not.toBe('')
      expect(section.body.length).toBeGreaterThan(0)
      expect(section.body.every((line) => line.trim() !== '')).toBe(true)
    }
  })

  it('recognises shipped copy as not-a-placeholder', () => {
    expect(isPlaceholder('Ripple is not an emergency service.')).toBe(false)
    expect(isPlaceholder(`${PLACEHOLDER_PREFIX} effective date]`)).toBe(true)
  })
})
