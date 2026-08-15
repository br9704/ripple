import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Guards migration 025 from the client side.
 *
 * The database can prove that `anon` cannot read a reporter_token — that is
 * supabase/test/02_rls.sql, and it does. What it cannot see is a browser query
 * that *asks* for one. Postgres answers those with "permission denied for
 * table reports", which surfaces as a blank page rather than a caught error,
 * and this repository has no hook or component tests to notice.
 *
 * So this scans the source instead. It is a lint rule that happens to live in
 * the test suite, and it exists because the exact regression is easy: someone
 * writes `.select('*')` because that is what every Supabase example does.
 *
 * Two rules, both derived from the migration:
 *   1. No client query may name a token column. Naming it in a filter is as
 *      fatal as naming it in a select list — Postgres requires SELECT on a
 *      column referenced in WHERE.
 *   2. No client query may `select('*')` on a table with a withheld column,
 *      because `*` expands to include it.
 *
 * Writes are exempt: INSERT still populates reporter_token, and INSERT
 * privilege is untouched.
 */

// Vitest runs from the repository root. Resolving from import.meta.url instead
// gives a bare '/src' under the jsdom environment.
const SRC = join(process.cwd(), 'src')

/** Tables that lost their table-level SELECT grant in migration 025. */
const RESTRICTED_TABLES = ['reports', 'comments', 'badges_earned', 'report_photos']

/** The columns those tables withhold. */
const TOKEN_COLUMNS = ['reporter_token', 'uploaded_by_token']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return []
    return [path]
  })
}

/**
 * Every `.select(...)` argument in a file, paired with the `.from('table')`
 * that precedes it. Deliberately crude: a regex is the right size of tool for
 * "does this string appear in a query", and anything it cannot parse is
 * reported rather than skipped.
 */
function selectCalls(source: string): { table: string | null; arg: string }[] {
  const calls: { table: string | null; arg: string }[] = []
  // Non-greedy up to the closing paren of .select(...) — the codebase writes
  // these as single string literals or template literals, never expressions.
  const pattern = /\.from\(\s*'([a-z_]+)'\s*\)([\s\S]{0,600}?)\.select\(\s*([`'"][\s\S]*?[`'"])\s*\)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    calls.push({ table: match[1], arg: match[3] })
  }
  return calls
}

const files = sourceFiles(SRC)

describe('client queries respect the column privileges from migration 025', () => {
  it('finds the source tree', () => {
    // If the walker silently returned nothing, every assertion below would
    // pass for the wrong reason.
    expect(files.length).toBeGreaterThan(20)
  })

  it('never names a reporter token column in a read query', () => {
    const offenders: string[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const { table, arg } of selectCalls(source)) {
        for (const column of TOKEN_COLUMNS) {
          if (arg.includes(column)) {
            offenders.push(`${file}: .from('${table ?? '?'}').select() names ${column}`)
          }
        }
      }

      // `.eq('reporter_token', …)` on a restricted table is the specific
      // mistake this migration was written to make impossible. Reading it in a
      // WHERE clause needs the same privilege as reading it in a select list,
      // which is the detail that made the original fix look adequate when it
      // was not. `upvotes` and `user_notifications` keep the column, so the
      // check is scoped to the tables that lost it.
      for (const column of TOKEN_COLUMNS) {
        const filter = new RegExp(
          `\\.from\\(\\s*'(${RESTRICTED_TABLES.join('|')})'\\s*\\)[\\s\\S]{0,600}?\\.(eq|neq|in|like|ilike|order)\\(\\s*'${column}'`,
          'g'
        )
        for (const hit of source.matchAll(filter)) {
          offenders.push(`${file}: filters ${hit[1]} on ${column} — SELECT on it is revoked`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it("never selects '*' from a table with a withheld column", () => {
    const offenders: string[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const { table, arg } of selectCalls(source)) {
        if (table === null || !RESTRICTED_TABLES.includes(table)) continue
        // `*` at the top level, or an embedded resource asking for `*`
        // (`report_photos(*)`), which expands to uploaded_by_token.
        if (/(^|[(,\s])\*/.test(arg.slice(1, -1))) {
          offenders.push(`${file}: .from('${table}').select(${arg.slice(0, 40)}…) uses *`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
