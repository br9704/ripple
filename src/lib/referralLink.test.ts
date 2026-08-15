import { describe, it, expect } from 'vitest'
import {
  REFERRAL_PARAM,
  buildInviteUrl,
  normaliseReferralCode,
  readReferralCode,
  withoutReferralParam,
} from './referralLink'

const VALID = 'K7M2PQ34'

describe('normaliseReferralCode', () => {
  it('accepts a well-formed code unchanged', () => {
    expect(normaliseReferralCode(VALID)).toBe(VALID)
  })

  it('upper-cases and trims, exactly as redeem_referral does server-side', () => {
    // The SQL is `upper(btrim(p_code))`. If the client normalised differently,
    // a code this function accepted could still miss on lookup.
    expect(normaliseReferralCode('  k7m2pq34 ')).toBe(VALID)
  })

  it('rejects the characters migration 026 excludes', () => {
    // I, O, 0 and 1 are out of the alphabet so a code survives being read aloud
    // or typed off a screenshot.
    for (const bad of ['OOOOOOOO', '00000000', 'IIIIIIII', '11111111']) {
      expect(normaliseReferralCode(bad)).toBeNull()
    }
  })

  it('accepts L, which the CHECK constraint permits even though its comment says otherwise', () => {
    // Pinned deliberately. Migration 026's design note claims the alphabet
    // excludes "O/0 and I/1/L", but `[A-HJ-NP-Z2-9]` spans J-N and the
    // generator string contains L, so codes with an L really are minted. A
    // client that trusted the prose would reject valid invites. If the
    // constraint is ever tightened to match its comment, this test is the thing
    // that fails and points at the client.
    expect(normaliseReferralCode('LLLLLLLL')).toBe('LLLLLLLL')
    expect(normaliseReferralCode('llllllll')).toBe('LLLLLLLL')
  })

  it('rejects anything that is not exactly eight characters', () => {
    expect(normaliseReferralCode('K7M2PQ3')).toBeNull()
    expect(normaliseReferralCode('K7M2PQ345')).toBeNull()
    expect(normaliseReferralCode('')).toBeNull()
  })

  it('rejects a missing or non-string value rather than throwing', () => {
    expect(normaliseReferralCode(null)).toBeNull()
    expect(normaliseReferralCode(undefined)).toBeNull()
  })

  it('rejects a reporter token, which is a UUID and never a code', () => {
    // The token is a bearer credential (migration 015). If it ever reached a
    // URL, this is the last place that would notice.
    expect(normaliseReferralCode('3f0b9c2a-77d4-4a1e-9a3e-0f1c2d3e4f50')).toBeNull()
  })
})

describe('readReferralCode', () => {
  it('reads the code from a location search string', () => {
    expect(readReferralCode(`?${REFERRAL_PARAM}=${VALID}`)).toBe(VALID)
  })

  it('accepts a search string without its leading question mark', () => {
    expect(readReferralCode(`${REFERRAL_PARAM}=${VALID}`)).toBe(VALID)
  })

  it('finds the code alongside other parameters', () => {
    expect(readReferralCode(`?category=pothole&${REFERRAL_PARAM}=${VALID}`)).toBe(VALID)
  })

  it('returns null when there is no code, or a malformed one', () => {
    expect(readReferralCode('')).toBeNull()
    expect(readReferralCode('?category=pothole')).toBeNull()
    expect(readReferralCode(`?${REFERRAL_PARAM}=nope`)).toBeNull()
  })
})

describe('withoutReferralParam', () => {
  it('removes the referral parameter', () => {
    expect(withoutReferralParam(`?${REFERRAL_PARAM}=${VALID}`)).toBe('')
  })

  it('returns an empty string, not a bare question mark, when nothing is left', () => {
    // A trailing `?` in the address bar is a visible artefact of the strip.
    expect(withoutReferralParam(`?${REFERRAL_PARAM}=${VALID}`)).not.toContain('?')
  })

  it('keeps every other parameter — a shared filtered view (S20.1) must survive', () => {
    expect(withoutReferralParam(`?category=pothole&${REFERRAL_PARAM}=${VALID}&status=fixed`)).toBe(
      '?category=pothole&status=fixed'
    )
  })

  it('is a no-op on a search string that carries no code', () => {
    expect(withoutReferralParam('?category=pothole')).toBe('?category=pothole')
    expect(withoutReferralParam('')).toBe('')
  })
})

describe('buildInviteUrl', () => {
  it('builds a root link carrying the code', () => {
    expect(buildInviteUrl('https://ripple.app', VALID)).toBe(
      `https://ripple.app/?${REFERRAL_PARAM}=${VALID}`
    )
  })

  it('drops any path, query or fragment of the inviter’s own session', () => {
    // An invite must open the app, not the page the inviter happened to be on,
    // and must not smuggle their filters or fragment along.
    expect(buildInviteUrl('https://ripple.app/my-reports?debug=1#top', VALID)).toBe(
      `https://ripple.app/?${REFERRAL_PARAM}=${VALID}`
    )
  })

  it('normalises the code it is handed', () => {
    expect(buildInviteUrl('https://ripple.app', ' k7m2pq34 ')).toBe(
      `https://ripple.app/?${REFERRAL_PARAM}=${VALID}`
    )
  })

  it('returns null rather than throwing on an opaque origin', () => {
    // `window.location.origin` is the string "null" in a sandboxed iframe or a
    // file:// load. The card falls back to showing the bare code, which still
    // works — redeem_referral takes the code, not the URL.
    expect(buildInviteUrl('null', VALID)).toBeNull()
  })

  it('refuses to build a link around a value that is not a code', () => {
    expect(buildInviteUrl('https://ripple.app', '3f0b9c2a-77d4-4a1e-9a3e-0f1c2d3e4f50')).toBeNull()
  })
})
