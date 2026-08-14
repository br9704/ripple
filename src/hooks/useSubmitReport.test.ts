import { describe, it, expect, vi } from 'vitest'
import { extractFunctionError } from './useSubmitReport'

// The Supabase client is imported transitively; it reads env vars at module
// load, so stub it out rather than constructing a real client under test.
vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }))

const GENERIC = 'Report submission failed. Please try again.'

/** Mirrors what supabase-js hands back for a non-2xx Edge Function response. */
function functionsHttpError(status: number, body: unknown) {
  return {
    name: 'FunctionsHttpError',
    // This is the only message supabase-js ever sets — it never reads the body.
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  }
}

describe('extractFunctionError', () => {
  it('recovers the real validation message from the response body', async () => {
    // This is the regression: without reading `context`, the user saw
    // "Edge Function returned a non-2xx status code" for every failure.
    const err = functionsHttpError(400, { error: 'Note exceeds 140 character limit' })
    await expect(extractFunctionError(err)).resolves.toBe('Note exceeds 140 character limit')
  })

  it('accepts `message` as well as `error` as the body key', async () => {
    const err = functionsHttpError(400, { message: 'Coordinates out of valid range' })
    await expect(extractFunctionError(err)).resolves.toBe('Coordinates out of valid range')
  })

  it('never surfaces the useless supabase-js placeholder', async () => {
    const err = functionsHttpError(500, {})
    await expect(extractFunctionError(err)).resolves.toBe(GENERIC)
  })

  it('falls back cleanly when the body is not JSON', async () => {
    const err = {
      message: 'Edge Function returned a non-2xx status code',
      context: new Response('<html>502 Bad Gateway</html>', { status: 502 }),
    }
    await expect(extractFunctionError(err)).resolves.toBe(GENERIC)
  })

  it('does not consume the caller’s response body', async () => {
    // We clone before reading; if we didn't, any retry/logging path that also
    // reads the body would throw "Body has already been read".
    const err = functionsHttpError(400, { error: 'Invalid category' })
    await extractFunctionError(err)
    await expect(err.context.json()).resolves.toEqual({ error: 'Invalid category' })
  })

  it('passes through a genuine non-placeholder message when there is no context', async () => {
    await expect(extractFunctionError(new TypeError('Failed to fetch'))).resolves.toBe(
      'Failed to fetch'
    )
  })

  it('returns the generic message for null/undefined errors', async () => {
    await expect(extractFunctionError(null)).resolves.toBe(GENERIC)
    await expect(extractFunctionError(undefined)).resolves.toBe(GENERIC)
  })

  it('ignores a blank body message', async () => {
    const err = functionsHttpError(400, { error: '   ' })
    await expect(extractFunctionError(err)).resolves.toBe(GENERIC)
  })
})
