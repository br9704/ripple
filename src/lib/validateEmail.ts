/**
 * Pragmatic email validation.
 *
 * Deliberately permissive. Email is optional here (PRD §13.1) and its only
 * consequence is whether a status notification arrives, so the cost of a false
 * *rejection* — telling a real person their real address is invalid — is much
 * higher than the cost of accepting something that later bounces. RFC 5322 in a
 * regex is a famous mistake; this checks structure, not legitimacy.
 */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 254) return false
  if (/\s/.test(trimmed)) return false

  const parts = trimmed.split('@')
  if (parts.length !== 2) return false

  const [local, domain] = parts
  if (local.length === 0 || local.length > 64) return false
  if (domain.length === 0) return false

  // Domain needs at least one dot with something either side.
  if (!/^[^.]+(\.[^.]+)+$/.test(domain)) return false
  if (domain.startsWith('-') || domain.endsWith('-')) return false

  return true
}
