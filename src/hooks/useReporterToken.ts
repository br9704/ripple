const STORAGE_KEY = 'ripple_reporter_token'

function getOrCreateToken(): string {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) return existing

  const token = crypto.randomUUID()
  localStorage.setItem(STORAGE_KEY, token)
  return token
}

/**
 * Returns a stable anonymous reporter token (UUID) stored in localStorage.
 * Generated once on first use, persisted across sessions.
 * Never linked to personal identity — PRD Section 13.
 */
export function useReporterToken(): string {
  return getOrCreateToken()
}
