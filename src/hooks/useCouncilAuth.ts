import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export interface CouncilAuthState {
  session: Session | null
  councilId: string | null
  councilName: string | null
  isLoading: boolean
  error: string | null
  signInWithEmail: (email: string) => Promise<boolean>
  signOut: () => Promise<void>
}

/**
 * Council coordinator authentication (PRD §6.7).
 *
 * Magic-link only: no password to leak, phish or rotate, and no password reset
 * flow to build for an audience of a handful of coordinators. Supabase Auth
 * handles delivery.
 *
 * `council_id` is read from `app_metadata`, which only the service role can
 * write — a coordinator cannot grant themselves another council by editing
 * their own profile. `user_metadata` would be self-writable and therefore
 * worthless as an authorisation claim.
 */
export function useCouncilAuth(): CouncilAuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [councilName, setCouncilName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!cancelled) {
        setSession(data.session)
        setIsLoading(false)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const councilId =
    (session?.user?.app_metadata as Record<string, unknown> | undefined)?.council_id as
      | string
      | undefined ?? null

  useEffect(() => {
    if (!councilId) return
    let cancelled = false

    void (async () => {
      const { data } = await supabase
        .from('councils')
        .select('name')
        .eq('id', councilId)
        .maybeSingle()
      if (!cancelled) setCouncilName(data?.name ?? null)
    })()

    return () => {
      cancelled = true
    }
  }, [councilId])

  const signInWithEmail = useCallback(async (email: string): Promise<boolean> => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/council` },
    })

    if (err) {
      setError(err.message)
      return false
    }
    return true
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
  }, [])

  return { session, councilId, councilName, isLoading, error, signInWithEmail, signOut }
}
