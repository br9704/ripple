/**
 * Minimal RFC 4180 CSV serialisation (S18.6).
 *
 * Hand-rolled rather than a dependency: this is ~20 lines, and the failure
 * modes that matter are all escaping, which a library would not understand
 * better than we do.
 */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return ''

  const cols = columns ?? Object.keys(rows[0])
  const lines = [cols.map(escapeCell).join(',')]

  for (const row of rows) {
    lines.push(cols.map((c) => escapeCell(row[c])).join(','))
  }

  // CRLF per RFC 4180 — Excel on Windows mis-renders bare LF.
  return lines.join('\r\n')
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''

  const s = String(value)

  // Defuse spreadsheet formula injection: a cell starting with = + - or @ is
  // executed by Excel and Sheets on open. Councils will open these files, and a
  // report note is attacker-controlled text.
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s

  if (/[",\r\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`
  }
  return guarded
}

/** Triggers a browser download of the given CSV text. */
export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel detects UTF-8 rather than mangling non-ASCII suburb names.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}
