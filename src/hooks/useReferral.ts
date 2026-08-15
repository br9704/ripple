import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { readReferralCode, withoutReferralParam } from '@/lib/referralLink'

export interface UseReferralResult {
  /** The caller's own code, once they have asked for it. Null until then. */
  code: string | null
  /** How many people have been referred by the caller. */
  referralCount: number
  /** True while the initial count is being read. */
  isLoading: boolean
  /** True while a code is being minted or fetched. */
  isCreating: boolean
  error: string | null
  /** Mints the caller's code on first call, returns the existing one after. */
  createCode: () => Promise<void>
}

/**
 * The caller's own invite code and referral count (S21.5, PRD §5.5).
 *
 * The code is fetched on intent rather than on mount, and that is a deliberate
 * data-minimisation choice rather than a UX accident. `my_referral_code()`
 * *mints* a row on first call, so calling it from a mount effect would create a
 * `referral_codes` record for every person who ever opened the page, including
 * everyone who never intended to invite anyone. The button costs one tap; the
 * eager version costs a stored record nobody asked for. The call is idempotent,
 * so a returning user who taps again sees the same code rather than a new one —
 * which is why the control reads "show", not "create".
 *
 * The count is safe to read on mount: `my_referral_count()` is a plain SELECT
 * and creates nothing. It returns 0 for a user with no code at all.
 *
 * Neither RPC takes a token argument. Identity is the `x-reporter-token` header
 * from `lib/supabase.ts`, and a code is not that token — see migration 026's
 * first design note. Nothing in this hook may ever put the token in a URL.
 */
export function useReferral(): UseReferralResult {
  const [code, setCode] = useState<string | null>(null)
  const [referralCount, setReferralCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // `createCode` is user-triggered, so its response can land after the card has
  // been unmounted. A ref rather than an effect-local flag, because the flag
  // would be scoped to the mount effect and this call is not.
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const { data, error: err } = await supabase.rpc('my_referral_count')
      if (cancelled) return

      if (err) {
        setError(err.message)
        setIsLoading(false)
        return
      }

      setReferralCount(typeof data === 'number' ? data : 0)
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const createCode = useCallback(async () => {
    setIsCreating(true)
    setError(null)

    const { data, error: err } = await supabase.rpc('my_referral_code')
    if (!isMounted.current) return

    setIsCreating(false)
    if (err) {
      setError(err.message)
      return
    }
    setCode(typeof data === 'string' ? data : null)
  }, [])

  return { code, referralCount, isLoading, isCreating, error, createCode }
}

/**
 * What became of a referral code found in the arriving URL.
 *
 * `credited` is the only state that asserts anything, because TRUE from
 * `redeem_referral` means a row was written and nothing else. FALSE covers an
 * unknown code, the user's own code, and an already-referred user, and the
 * function refuses to distinguish them on purpose — telling them apart would
 * make it an oracle for which codes exist, and existence maps one-to-one onto
 * people. So `not-credited` must never be rendered as a reason.
 */
export type ArrivalReferralState = 'idle' | 'redeeming' | 'credited' | 'not-credited'

/**
 * Redeems an invite code carried in the URL (`?ref=CODE`) on arrival.
 *
 * ── When this fires, and why then ──
 * On mount of whatever route the visitor landed on, immediately — not after
 * they submit a report, and not behind a confirmation.
 *
 * `redeem_referral` needs the caller to already have a reporter token, so the
 * question is when one exists. `lib/reporterToken.ts` creates it lazily inside
 * `getReporterToken()`, and `lib/supabase.ts` calls that at module-init time to
 * build the client's `x-reporter-token` header. So the token is minted before
 * any React code runs at all: a first-ever visitor already has one on their
 * first paint, and there is nothing to wait for.
 *
 * Deferring to "after their first report" was the alternative and it is wrong
 * on the schema's own terms. `referrals` records that someone was referred, not
 * that they went on to be productive; most people who follow an invite link
 * never file anything, and crediting only the ones who do would under-count
 * real referrals while quietly turning the mechanic into an engagement target.
 * It would also mean parking someone else's code in storage indefinitely,
 * waiting for an event that usually never comes.
 *
 * This hook must be mounted once, app-wide (App.tsx), not on a single page: an
 * invite link opens the map at `/`, and a shared filtered view (S20.1) or a
 * report permalink can carry `?ref=` too.
 *
 * ── Why the parameter is stripped first ──
 * The code is captured and removed from the URL before the request is made, so
 * it is gone from the address bar the moment it has been read. That keeps a
 * bookmark, a screenshot or a re-share of the visitor's own URL from carrying
 * someone else's code around under the visitor's name, and it makes a repeat
 * pass a no-op — there is no longer a code to find.
 *
 * Stripping first means a redemption attempted with no network is simply lost.
 * That is the right trade: the original invite still exists in the message it
 * arrived in, so reopening it retries, and `redeem_referral` is idempotent so
 * retrying is free. Nothing is permanently forfeited by discarding the code.
 *
 * ── Why the request is not cancelled by the effect's own cleanup ──
 * The obvious shape — read, strip, redeem, abort on cleanup — cancels its own
 * request. Stripping changes `location.search`, which the effect depends on, so
 * React tears the effect down and the cleanup aborts the in-flight redemption
 * that same run had just started. Whether the response won that race was pure
 * timing: it did against a resolved promise in a test, and would not against a
 * real network. The first version of this hook had that bug and the test for a
 * failed redemption is what caught it.
 *
 * So the request is scoped to the component's lifetime rather than to the
 * effect's, via `hasRun` and `isMounted`. `hasRun` also makes the StrictMode
 * double-invoke a single request rather than two.
 *
 * Failures are silent by design. Being credited is the referrer's business, not
 * a task the arriving visitor took on, and an error toast for a background
 * request they never made would be noise about something they cannot fix.
 */
export function useArrivalReferral(): ArrivalReferralState {
  const [state, setState] = useState<ArrivalReferralState>('idle')
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()

  // A code is redeemable once per person, ever (migration 026's
  // `one_referral_per_invitee`), so one attempt per app load is the whole
  // budget. Refs survive StrictMode's simulated remount, which is the point.
  const hasRun = useRef(false)
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (hasRun.current) return
    const code = readReferralCode(search)
    if (!code) return
    hasRun.current = true

    // Strip before the request. Replace rather than push, so the back button
    // does not walk the visitor into the invite URL again.
    void navigate({ pathname, search: withoutReferralParam(search), hash }, { replace: true })

    // Inside the async body rather than the effect body: a synchronous setState
    // in an effect is a cascading render, and the lint rule is right to object.
    void (async () => {
      setState('redeeming')
      const { data, error } = await supabase.rpc('redeem_referral', { p_code: code })
      if (!isMounted.current) return
      setState(!error && data === true ? 'credited' : 'not-credited')
    })()
  }, [pathname, search, hash, navigate])

  return state
}
