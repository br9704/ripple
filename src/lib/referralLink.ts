/**
 * Invite-link plumbing for the referral flow (S21.5, PRD §5.5).
 *
 * Pure by design: every function here is a string transform with no network,
 * no storage and no DOM. The effectful half lives in `useReferral.ts`, which
 * makes the parsing rules — the part that decides what a stranger's URL is
 * allowed to mean — directly testable.
 *
 * The security property this file must preserve: a link carries the referral
 * *code*, never the reporter token. Migration 015 makes `x-reporter-token` a
 * bearer credential; migration 026's header design note spells out why the code
 * is a separate, deliberately useless-on-its-own value. Nothing in this file
 * ever reads or writes the token.
 */

/** The query parameter an invite link carries. */
export const REFERRAL_PARAM = 'ref'

/**
 * The code shape from migration 026's `referral_code_shape` CHECK, character
 * for character. Eight characters over an alphabet that omits I, O, 0 and 1, so
 * a code survives being read aloud or typed off a screenshot.
 *
 * Copied from the constraint rather than from the design note above it: that
 * note says the alphabet "excludes O/0 and I/1/L" over "a 30-symbol alphabet",
 * but `[A-HJ-NP-Z2-9]` is 32 symbols and J-N includes L, which the generator
 * string `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` also contains. The executable half
 * is the truth; a client pattern that rejected L would reject codes the server
 * really does mint. Flagged for the migration's owner, not worked around here.
 *
 * Validating client-side is not a security control — the server re-checks, and
 * `redeem_referral` deliberately refuses to say why a code failed. It is here so
 * that a truncated paste or a link mangled by a chat client is discarded before
 * it costs a round trip.
 */
const REFERRAL_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/

/**
 * Canonicalises a candidate code, or returns null if it cannot be one.
 *
 * Trims and upper-cases exactly as `redeem_referral` does (`upper(btrim(...))`),
 * so a code that this function accepts is the same string the server will look
 * up — and, just as importantly, one it rejects is one the server would reject
 * too. Doing it in a different order would let a code pass here and miss there.
 */
export function normaliseReferralCode(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const candidate = raw.trim().toUpperCase()
  return REFERRAL_CODE_PATTERN.test(candidate) ? candidate : null
}

/**
 * Extracts a referral code from a location search string, e.g. `?ref=AB2CD3EF`.
 *
 * Accepts the string with or without its leading `?` because both forms turn up:
 * `location.search` carries it, hand-assembled values often do not.
 */
export function readReferralCode(search: string): string | null {
  return normaliseReferralCode(new URLSearchParams(search).get(REFERRAL_PARAM))
}

/**
 * The same search string with the referral parameter removed, preserving every
 * other parameter and their order.
 *
 * Returns `''` rather than `'?'` when nothing is left, so the caller can hand it
 * straight to a router without producing a bare question mark in the address
 * bar. Other parameters matter: S20.1 ships shareable filtered map views, and an
 * invite link to one of those must keep the filters.
 */
export function withoutReferralParam(search: string): string {
  const params = new URLSearchParams(search)
  params.delete(REFERRAL_PARAM)
  const rest = params.toString()
  return rest ? `?${rest}` : ''
}

/**
 * Builds the URL to share, from the app origin only.
 *
 * Deliberately not from the current href: an invite should open the app, not
 * whatever page the inviter happened to be on, and building from `origin`
 * guarantees no query parameter, path segment or fragment of the inviter's own
 * session rides along.
 *
 * An unparseable origin — `"null"` is what an opaque origin reports, which a
 * sandboxed iframe or a `file://` load produces — yields null rather than
 * throwing. The caller then shows the bare code, which is still a working
 * invite: `redeem_referral` takes the code, and the URL is only a convenience.
 */
export function buildInviteUrl(origin: string, code: string): string | null {
  const normalised = normaliseReferralCode(code)
  if (!normalised) return null

  try {
    const url = new URL(origin)
    // Reset rather than trust: a caller that passes a full href instead of an
    // origin must still get a root invite link, so the guarantee above holds by
    // construction rather than by convention.
    url.pathname = '/'
    url.hash = ''
    url.search = `${REFERRAL_PARAM}=${normalised}`
    return url.toString()
  } catch {
    return null
  }
}
