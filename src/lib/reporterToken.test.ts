import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getReporterToken } from './reporterToken'

const STORAGE_KEY = 'ripple_reporter_token'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getReporterToken', () => {
  it('creates and persists a token on first use', () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    const token = getReporterToken()

    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(token)
  })

  it('is stable across calls — this is what makes "My Reports" work without an account', () => {
    const first = getReporterToken()
    const second = getReporterToken()
    expect(second).toBe(first)
  })

  it('returns the existing token rather than regenerating', () => {
    localStorage.setItem(STORAGE_KEY, 'pre-existing-token')
    expect(getReporterToken()).toBe('pre-existing-token')
  })

  it('degrades to an ephemeral token when storage throws', () => {
    // Private browsing / disabled storage must not take the whole app down —
    // the user simply loses cross-session history.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    expect(() => getReporterToken()).not.toThrow()
    expect(getReporterToken()).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('does not leak identity — the token is random, not derived', () => {
    // PRD §13.1: the token must not be linkable to a person or device.
    const a = getReporterToken()
    localStorage.clear()
    const b = getReporterToken()
    expect(a).not.toBe(b)
  })
})
