import { getReporterToken } from '@/lib/reporterToken'

/**
 * Returns a stable anonymous reporter token (UUID) stored in localStorage.
 * Generated once on first use, persisted across sessions.
 * Never linked to personal identity — PRD Section 13.
 */
export function useReporterToken(): string {
  return getReporterToken()
}
