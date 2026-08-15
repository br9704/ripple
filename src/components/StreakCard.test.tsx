import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))

const { StreakCard } = await import('./StreakCard')

function streak(current: number, longest: number, active: number, last: string | null = null) {
  rpcMock.mockResolvedValue({
    data: [
      {
        current_weeks: current,
        longest_weeks: longest,
        weeks_active: active,
        last_report_at: last,
      },
    ],
    error: null,
  })
}

beforeEach(() => {
  rpcMock.mockReset()
})

describe('StreakCard', () => {
  it('is a labelled landmark', async () => {
    streak(0, 0, 0)
    render(<StreakCard />)
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /reporting streak/i })).toBeInTheDocument()
    })
  })

  it('shows no number at all to someone who has never reported', async () => {
    // PRD §13.4: a "0" in the slot the streak later occupies frames an empty
    // history as a failed one, and pressures someone into reporting things that
    // are not there. The honest empty state has no counter in it.
    streak(0, 0, 0)
    render(<StreakCard />)

    await waitFor(() => expect(screen.getByText(/nothing counted yet/i)).toBeInTheDocument())
    expect(screen.getByText(/not a target/i)).toBeInTheDocument()
    expect(screen.queryByText('00')).not.toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows the run, with words carrying the meaning as well as the accent colour', async () => {
    // PRD §10.2 — colour is never the only differentiator.
    streak(3, 5, 9)
    render(<StreakCard />)

    await waitFor(() => expect(screen.getByText('03')).toBeInTheDocument())
    expect(screen.getByText('weeks in a row')).toBeInTheDocument()
    expect(screen.getByText('5 weeks')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('says "week" in the singular for a one-week run', async () => {
    streak(1, 1, 1)
    render(<StreakCard />)

    await waitFor(() => expect(screen.getByText('week in a row')).toBeInTheDocument())
    expect(screen.getByText('1 week')).toBeInTheDocument()
  })

  it('tells a lapsed user their run paused, without displaying a zero', async () => {
    streak(0, 4, 4)
    render(<StreakCard />)

    await waitFor(() => expect(screen.getByText(/no run in progress/i)).toBeInTheDocument())
    expect(screen.getByText(/intended behaviour, not a lapse/i)).toBeInTheDocument()
    // The longest run is still theirs to keep.
    expect(screen.getByText('4 weeks')).toBeInTheDocument()
    expect(screen.queryByText('00')).not.toBeInTheDocument()
  })

  it('states the unit, so nobody reads it as a count of reports', async () => {
    // Migration 026's design note: the mechanic must never reward volume,
    // because a fabricated report costs a council a real truck roll.
    streak(2, 2, 2)
    render(<StreakCard />)

    await waitFor(() =>
      expect(screen.getByText(/a week counts once, however many reports/i)).toBeInTheDocument()
    )
  })

  it('does not claim a broken streak when the request failed', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'offline' } })
    render(<StreakCard />)

    await waitFor(() => expect(screen.getByText(/could not read your streak/i)).toBeInTheDocument())
    expect(screen.queryByText(/no run in progress/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/nothing counted yet/i)).not.toBeInTheDocument()
  })
})
