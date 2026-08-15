import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, renderHook, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))

const { useReferral, useArrivalReferral } = await import('./useReferral')

const CODE = 'K7M2PQ34'

/** Dispatches on the RPC name so a test can answer both calls independently. */
function respond(map: Record<string, unknown>) {
  rpcMock.mockImplementation((fn: string) =>
    Promise.resolve(map[fn] ?? { data: null, error: null })
  )
}

const calledFunctions = () => rpcMock.mock.calls.map((call) => call[0] as string)

beforeEach(() => {
  rpcMock.mockReset()
})

describe('useReferral', () => {
  it('reads the count on mount and does NOT mint a code', async () => {
    // Data minimisation: my_referral_code() writes a referral_codes row on
    // first call, so calling it from a mount effect would create a record for
    // every person who ever opened the page, including everyone who never
    // intended to invite anyone. my_referral_count() is a plain SELECT.
    respond({ my_referral_count: { data: 0, error: null } })
    const { result } = renderHook(() => useReferral())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(calledFunctions()).toEqual(['my_referral_count'])
    expect(result.current.code).toBeNull()
    expect(result.current.referralCount).toBe(0)
  })

  it('mints the code only when asked, and takes no token argument', async () => {
    respond({
      my_referral_count: { data: 2, error: null },
      my_referral_code: { data: CODE, error: null },
    })
    const { result } = renderHook(() => useReferral())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createCode()
    })

    expect(result.current.code).toBe(CODE)
    expect(result.current.referralCount).toBe(2)
    // No second argument — identity is the x-reporter-token header.
    const codeCall = rpcMock.mock.calls.find((call) => call[0] === 'my_referral_code')
    expect(codeCall).toEqual(['my_referral_code'])
  })

  it('surfaces a failure to read the count without inventing a number', async () => {
    respond({ my_referral_count: { data: null, error: { message: 'offline' } } })
    const { result } = renderHook(() => useReferral())

    await waitFor(() => expect(result.current.error).toBe('offline'))
    expect(result.current.referralCount).toBe(0)
  })

  it('surfaces a failure to mint and leaves the code null', async () => {
    respond({
      my_referral_count: { data: 0, error: null },
      my_referral_code: { data: null, error: { message: 'no reporter token on request' } },
    })
    const { result } = renderHook(() => useReferral())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createCode()
    })

    expect(result.current.code).toBeNull()
    expect(result.current.error).toBe('no reporter token on request')
    expect(result.current.isCreating).toBe(false)
  })
})

/** Shows both the redemption state and the live URL, so the strip is observable. */
function ArrivalProbe() {
  const state = useArrivalReferral()
  const { search } = useLocation()
  return (
    <>
      <span data-testid="state">{state}</span>
      <span data-testid="search">{search}</span>
    </>
  )
}

function arriveAt(url: string): ReactNode {
  return (
    <MemoryRouter initialEntries={[url]}>
      <ArrivalProbe />
    </MemoryRouter>
  )
}

describe('useArrivalReferral', () => {
  it('redeems a code found in the URL on arrival', async () => {
    // Immediately, not after the visitor's first report: lib/supabase.ts calls
    // getReporterToken() at module init, so a first-ever visitor already has a
    // token before any React code runs. There is nothing to wait for, and most
    // people who follow an invite link never file a report.
    respond({ redeem_referral: { data: true, error: null } })
    render(arriveAt(`/?ref=${CODE}`))

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('credited'))
    expect(rpcMock).toHaveBeenCalledWith('redeem_referral', { p_code: CODE })
  })

  it('strips the code from the URL', async () => {
    respond({ redeem_referral: { data: true, error: null } })
    render(arriveAt(`/?ref=${CODE}`))

    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''))
    expect(screen.getByTestId('search').textContent).not.toContain(CODE)
  })

  it('keeps the rest of the query string intact', async () => {
    respond({ redeem_referral: { data: true, error: null } })
    render(arriveAt(`/?category=pothole&ref=${CODE}`))

    await waitFor(() =>
      expect(screen.getByTestId('search')).toHaveTextContent('?category=pothole')
    )
  })

  it('redeems exactly once even though the strip re-runs the effect', async () => {
    respond({ redeem_referral: { data: true, error: null } })
    render(arriveAt(`/?ref=${CODE}`))

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('credited'))
    expect(calledFunctions().filter((fn) => fn === 'redeem_referral')).toHaveLength(1)
  })

  it('reports not-credited without claiming to know why', async () => {
    // FALSE covers unknown code, own code, and already-referred, and
    // redeem_referral refuses to distinguish them so it cannot be used to
    // enumerate which codes exist.
    respond({ redeem_referral: { data: false, error: null } })
    render(arriveAt(`/?ref=${CODE}`))

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('not-credited'))
  })

  it('treats a transport failure as not-credited and stays silent', async () => {
    respond({ redeem_referral: { data: null, error: { message: 'offline' } } })
    render(arriveAt(`/?ref=${CODE}`))

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('not-credited'))
  })

  it('does not call the server for a malformed code', async () => {
    respond({})
    render(arriveAt('/?ref=not-a-code'))

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'))
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('does nothing at all on an ordinary visit', async () => {
    respond({})
    render(arriveAt('/'))

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'))
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('normalises a lower-case code before sending it', async () => {
    respond({ redeem_referral: { data: true, error: null } })
    render(arriveAt('/?ref=k7m2pq34'))

    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('redeem_referral', { p_code: CODE }))
  })
})
