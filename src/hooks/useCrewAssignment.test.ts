import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useCrewAssignment,
  normaliseTicketRef,
  validateTicketRef,
  describeCrewFailure,
  crewFailureMessage,
  MAX_CREW_TICKET_REF_LENGTH,
} from './useCrewAssignment'

// The Supabase client reads env vars at module load, so stub it rather than
// constructing a real one under test — same reason useSubmitReport.test does.
// vi.hoisted because vi.mock's factory is lifted above every import, and a
// plain const declared here would not exist yet when it runs.
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke } } }))

/** Mirrors what supabase-js hands back for a non-2xx Edge Function response. */
function functionsHttpError(status: number, body: unknown) {
  return {
    name: 'FunctionsHttpError',
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  }
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: online })
}

beforeEach(() => {
  invoke.mockReset()
  setOnline(true)
})

afterEach(() => {
  setOnline(true)
})

describe('normaliseTicketRef', () => {
  it('trims, exactly as migration 024’s trigger does', () => {
    expect(normaliseTicketRef('  WO-2026-4471  ')).toBe('WO-2026-4471')
  })

  it('turns an empty ref into null so the column has two states, not three', () => {
    expect(normaliseTicketRef('')).toBeNull()
  })

  it('turns a whitespace-only ref into null', () => {
    // 04_sprint21.sql asserts this at the database. A client that disagreed
    // would show a ticket the database has recorded as absent.
    expect(normaliseTicketRef('   ')).toBeNull()
  })

  it('leaves the council’s own format alone', () => {
    // The ref is deliberately opaque — every council numbers differently, and
    // normalising the shape would reject real ticket numbers.
    expect(normaliseTicketRef('crm/2026/WKS 88-1')).toBe('crm/2026/WKS 88-1')
  })
})

describe('validateTicketRef', () => {
  it('accepts a ref at exactly the constraint boundary', () => {
    expect(validateTicketRef('x'.repeat(MAX_CREW_TICKET_REF_LENGTH))).toBeNull()
  })

  it('rejects one character past it', () => {
    expect(validateTicketRef('x'.repeat(MAX_CREW_TICKET_REF_LENGTH + 1))).toBe('too_long')
  })

  it('measures the trimmed length, because the CHECK is on btrim()', () => {
    // A 64-character ref with padding is legal in the database, so rejecting it
    // client-side would refuse a write the server would have accepted.
    const padded = `  ${'x'.repeat(MAX_CREW_TICKET_REF_LENGTH)}  `
    expect(validateTicketRef(padded)).toBeNull()
  })

  it('accepts an empty ref — clearing is not a length violation', () => {
    expect(validateTicketRef('')).toBeNull()
  })
})

describe('describeCrewFailure', () => {
  it('reads the machine code the function returns', async () => {
    const err = functionsHttpError(403, { code: 'forbidden', error: 'Different council' })
    await expect(describeCrewFailure(err)).resolves.toBe('forbidden')
  })

  it('tells a length rejection apart from any other 400', async () => {
    const err = functionsHttpError(400, { code: 'too_long', error: 'too long' })
    await expect(describeCrewFailure(err)).resolves.toBe('too_long')
  })

  it('ignores a code it does not know rather than trusting it blindly', async () => {
    const err = functionsHttpError(500, { code: 'teapot' })
    await expect(describeCrewFailure(err)).resolves.toBe('server')
  })

  it('falls back to the status when a gateway answers instead of the function', async () => {
    const err = { context: new Response('<html>502</html>', { status: 502 }) }
    await expect(describeCrewFailure(err)).resolves.toBe('server')
  })

  it('maps a 401 body-less response to an expired session', async () => {
    const err = { context: new Response(null, { status: 401 }) }
    await expect(describeCrewFailure(err)).resolves.toBe('unauthenticated')
  })

  it('treats an error with no response at all as offline', async () => {
    // supabase-js raises FunctionsFetchError with no `context` when the request
    // never reached a server.
    await expect(describeCrewFailure(new TypeError('Failed to fetch'))).resolves.toBe('offline')
  })

  it('does not consume the caller’s response body', async () => {
    const err = functionsHttpError(404, { code: 'not_found' })
    await describeCrewFailure(err)
    await expect(err.context.json()).resolves.toEqual({ code: 'not_found' })
  })
})

describe('crewFailureMessage', () => {
  it('has readable wording for every failure in the union', () => {
    const reasons = [
      'offline',
      'invalid',
      'too_long',
      'unauthenticated',
      'forbidden',
      'not_found',
      'server',
    ] as const

    for (const reason of reasons) {
      expect(crewFailureMessage(reason)).toMatch(/\S/)
    }
  })

  it('names the real limit rather than a hardcoded number that can drift', () => {
    expect(crewFailureMessage('too_long')).toContain(String(MAX_CREW_TICKET_REF_LENGTH))
  })
})

describe('useCrewAssignment().assign', () => {
  it('sends the trimmed ref and returns the server’s own row', async () => {
    invoke.mockResolvedValue({
      data: { crew_ticket_ref: 'WO-2026-4471', crew_assigned_at: '2026-08-15T02:00:00Z' },
      error: null,
    })

    const { result } = renderHook(() => useCrewAssignment())
    const outcome = await result.current.assign('r1', '  WO-2026-4471 ')

    expect(invoke).toHaveBeenCalledWith('assign-crew', {
      body: { report_id: 'r1', crew_ticket_ref: 'WO-2026-4471' },
    })
    expect(outcome).toEqual({
      ok: true,
      value: { crew_ticket_ref: 'WO-2026-4471', crew_assigned_at: '2026-08-15T02:00:00Z' },
    })
  })

  it('never sends crew_assigned_at — the trigger owns that column', async () => {
    invoke.mockResolvedValue({ data: { crew_ticket_ref: 'A', crew_assigned_at: 'x' }, error: null })

    const { result } = renderHook(() => useCrewAssignment())
    await result.current.assign('r1', 'A')

    const body = invoke.mock.calls[0][1].body as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['crew_ticket_ref', 'report_id'])
  })

  it('sends null to clear, so an unassign is not mistaken for a no-change', async () => {
    invoke.mockResolvedValue({
      data: { crew_ticket_ref: null, crew_assigned_at: null },
      error: null,
    })

    const { result } = renderHook(() => useCrewAssignment())
    const outcome = await result.current.assign('r1', '   ')

    expect(invoke.mock.calls[0][1].body.crew_ticket_ref).toBeNull()
    expect(outcome).toEqual({ ok: true, value: { crew_ticket_ref: null, crew_assigned_at: null } })
  })

  it('refuses an over-long ref without spending a round trip', async () => {
    const { result } = renderHook(() => useCrewAssignment())
    const outcome = await result.current.assign('r1', 'x'.repeat(MAX_CREW_TICKET_REF_LENGTH + 1))

    expect(invoke).not.toHaveBeenCalled()
    expect(outcome).toEqual({
      ok: false,
      reason: 'too_long',
      message: crewFailureMessage('too_long'),
    })
  })

  it('refuses to write while offline rather than queueing it', async () => {
    // A queued crew ref replayed later would stamp crew_assigned_at at replay
    // time and misreport when the work was actually dispatched.
    setOnline(false)

    const { result } = renderHook(() => useCrewAssignment())
    const outcome = await result.current.assign('r1', 'WO-1')

    expect(invoke).not.toHaveBeenCalled()
    expect(outcome).toEqual({ ok: false, reason: 'offline', message: crewFailureMessage('offline') })
  })

  it('surfaces an RLS rejection as a council mismatch, not a silent success', async () => {
    invoke.mockResolvedValue({ data: null, error: functionsHttpError(403, { code: 'forbidden' }) })

    const { result } = renderHook(() => useCrewAssignment())
    const outcome = await result.current.assign('r1', 'WO-1')

    expect(outcome).toEqual({
      ok: false,
      reason: 'forbidden',
      message: crewFailureMessage('forbidden'),
    })
  })

  it('treats a 200 with no body as a failure rather than an empty assignment', async () => {
    // Reporting `{ok: true, crew_ticket_ref: null}` here would tell the
    // coordinator their ticket had been cleared when nothing was written.
    invoke.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useCrewAssignment())
    const outcome = await result.current.assign('r1', 'WO-1')

    expect(outcome).toEqual({ ok: false, reason: 'server', message: crewFailureMessage('server') })
  })
})
