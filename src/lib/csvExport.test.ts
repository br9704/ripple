import { describe, it, expect } from 'vitest'
import { toCsv } from './csvExport'

describe('toCsv', () => {
  it('returns empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header row from the keys', () => {
    expect(toCsv([{ a: 1, b: 2 }])).toBe('a,b\r\n1,2')
  })

  it('uses CRLF, which Excel on Windows requires', () => {
    expect(toCsv([{ a: 1 }, { a: 2 }])).toContain('\r\n')
  })

  it('quotes and escapes cells containing commas, quotes or newlines', () => {
    const out = toCsv([{ note: 'Huge pothole, "dangerous"\nnear the tram stop' }])
    expect(out).toContain('"Huge pothole, ""dangerous""\nnear the tram stop"')
  })

  it('neutralises spreadsheet formula injection', () => {
    // Report notes are attacker-controlled text and councils open these files
    // in Excel, where a leading = is executed.
    for (const payload of ['=1+1', '+1', '-1', '@SUM(A1)']) {
      expect(toCsv([{ note: payload }])).toContain(`'${payload}`)
    }
  })

  it('renders null and undefined as empty, not as the strings', () => {
    expect(toCsv([{ a: null, b: undefined }])).toBe('a,b\r\n,')
  })

  it('honours an explicit column order', () => {
    expect(toCsv([{ b: 2, a: 1 }], ['a', 'b'])).toBe('a,b\r\n1,2')
  })
})
