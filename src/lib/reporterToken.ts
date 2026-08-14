const STORAGE_KEY = 'ripple_reporter_token'

/**
 * Returns a stable anonymous reporter token (UUID), creating it on first use.
 *
 * PRD §13.1: this is a convenience token, never an identity. It is not linked
 * to a person and is not derived from any device characteristic.
 *
 * Lives in `lib/` rather than inside the hook because the Supabase client needs
 * it at module-init time to attach the `x-reporter-token` header that RLS reads
 * (see supabase/migrations/015_rls_scope_reporter_token.sql).
 */
export function getReporterToken(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing) return existing

    const token = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, token)
    return token
  } catch {
    // Private browsing or storage disabled: fall back to an ephemeral token so
    // the app still works. The user simply won't see their history across
    // sessions — degraded, not broken.
    return crypto.randomUUID()
  }
}
