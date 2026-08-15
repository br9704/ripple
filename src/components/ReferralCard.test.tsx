import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { getReporterToken } from '@/lib/reporterToken'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))

const { ReferralCard } = await import('./ReferralCard')

const CODE = 'K7M2PQ34'

function respond(map: Record<string, unknown>) {
  rpcMock.mockImplementation((fn: string) =>
    Promise.resolve(map[fn] ?? { data: null, error: null })
  )
}

const showCode = () => fireEvent.click(screen.getByRole('button', { name: /invite code/i }))

beforeEach(() => {
  rpcMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ReferralCard', () => {
  it('does not mint a code just because the card was rendered', async () => {
    // my_referral_code() writes a row on first call. Rendering is not consent
    // to create a record for someone who never meant to invite anyone.
    respond({ my_referral_count: { data: 0, error: null } })
    render(<ReferralCard />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite code/i })).toBeInTheDocument()
    })
    expect(rpcMock.mock.calls.map((call) => call[0])).toEqual(['my_referral_count'])
  })

  it('shows no invite tally to someone who has not asked for a code', async () => {
    // "0 invited" for a user who never opted into the mechanic reads as a
    // score they are losing — the shape PRD §13.4 rules out.
    respond({ my_referral_count: { data: 0, error: null } })
    render(<ReferralCard />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite code/i })).toBeInTheDocument()
    })
    expect(document.body.textContent).not.toMatch(/\b0 people\b/)
  })

  it('reveals the code on request', async () => {
    respond({
      my_referral_count: { data: 0, error: null },
      my_referral_code: { data: CODE, error: null },
    })
    render(<ReferralCard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite code/i })).toBeInTheDocument()
    })

    showCode()

    await waitFor(() => expect(screen.getByText(CODE)).toBeInTheDocument())
    // Spelled out for a screen reader: an eight-character code pronounced as a
    // word is unusable, and this alphabet is designed to be read aloud.
    expect(screen.getByText([...CODE].join(' '))).toBeInTheDocument()
  })

  it('shares a link carrying the code and never the reporter token', async () => {
    // The security property of the whole feature. The reporter token is a
    // bearer credential (migration 015); a link containing it would publish
    // write access to every group chat it landed in.
    const token = getReporterToken()
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })

    respond({
      my_referral_count: { data: 0, error: null },
      my_referral_code: { data: CODE, error: null },
    })
    render(<ReferralCard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite code/i })).toBeInTheDocument()
    })
    showCode()
    await waitFor(() => expect(screen.getByText(CODE)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /share invite/i }))

    await waitFor(() => expect(share).toHaveBeenCalled())
    const payload = share.mock.calls[0][0] as { url: string; text: string }
    expect(payload.url).toContain(`ref=${CODE}`)
    expect(payload.url).not.toContain(token)
    expect(JSON.stringify(payload)).not.toContain(token)
  })

  it('never puts the reporter token on screen', async () => {
    const token = getReporterToken()
    respond({
      my_referral_count: { data: 3, error: null },
      my_referral_code: { data: CODE, error: null },
    })
    render(<ReferralCard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite code/i })).toBeInTheDocument()
    })
    showCode()

    await waitFor(() => expect(screen.getByText(CODE)).toBeInTheDocument())
    expect(document.body.textContent).not.toContain(token)
    expect(document.body.innerHTML).not.toContain(token)
  })

  it('states plainly that the link is not the token', async () => {
    respond({ my_referral_count: { data: 0, error: null } })
    render(<ReferralCard />)

    await waitFor(() =>
      expect(screen.getByText(/never your reporter token/i)).toBeInTheDocument()
    )
  })

  it('reads an empty tally as a fact, not a shortfall', async () => {
    respond({
      my_referral_count: { data: 0, error: null },
      my_referral_code: { data: CODE, error: null },
    })
    render(<ReferralCard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite code/i })).toBeInTheDocument()
    })
    showCode()

    await waitFor(() => expect(screen.getByText(/nobody has used your code yet/i)).toBeInTheDocument())
  })

  it('counts real referrals, in the singular and the plural', async () => {
    respond({
      my_referral_count: { data: 1, error: null },
      my_referral_code: { data: CODE, error: null },
    })
    const { unmount } = render(<ReferralCard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite code/i })).toBeInTheDocument()
    })
    showCode()
    await waitFor(() => expect(screen.getByText(/1 person has joined/i)).toBeInTheDocument())
    unmount()

    respond({
      my_referral_count: { data: 4, error: null },
      my_referral_code: { data: CODE, error: null },
    })
    render(<ReferralCard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite code/i })).toBeInTheDocument()
    })
    showCode()
    await waitFor(() => expect(screen.getByText(/4 people have joined/i)).toBeInTheDocument())
  })

  it('gives every control a 44px touch target', async () => {
    respond({ my_referral_count: { data: 0, error: null } })
    render(<ReferralCard />)

    const button = await screen.findByRole('button', { name: /invite code/i })
    // PRD §10.2 / mobile-first at 375px. Asserted on the class because jsdom
    // has no layout, so a computed height would be 0 for everything.
    expect(button.className).toContain('min-h-[44px]')
  })

  it('surfaces a failure without pretending the code is unavailable forever', async () => {
    respond({ my_referral_count: { data: null, error: { message: 'offline' } } })
    render(<ReferralCard />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/try again/i))
  })
})
