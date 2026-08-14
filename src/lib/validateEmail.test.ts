import { describe, it, expect } from 'vitest'
import { isValidEmail } from './validateEmail'

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    for (const v of ['a@b.co', 'bruno.jaamaa@example.com', 'user+tag@sub.example.org']) {
      expect(isValidEmail(v), v).toBe(true)
    }
  })

  it('accepts addresses that naive regexes wrongly reject', () => {
    // Rejecting a real person's real address is a worse failure than accepting
    // one that later bounces — email is optional and only gates a notification.
    for (const v of ["o'brien@example.com", 'user_name@example.co.uk', '123@example.io']) {
      expect(isValidEmail(v), v).toBe(true)
    }
  })

  it('rejects structurally impossible values', () => {
    for (const v of ['', '   ', 'nope', '@example.com', 'user@', 'user@@example.com',
                     'user@example', 'a b@example.com', 'user@-example.com']) {
      expect(isValidEmail(v), v).toBe(false)
    }
  })

  it('trims surrounding whitespace before judging', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true)
  })

  it('rejects absurd lengths rather than passing them to the mail provider', () => {
    expect(isValidEmail('a'.repeat(65) + '@example.com')).toBe(false)
    expect(isValidEmail('a@' + 'b'.repeat(300) + '.com')).toBe(false)
  })
})
