import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// The real client reads env vars at module load and attaches the
// x-reporter-token header, neither of which exists under test.
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))

const { useStreak } = await import('./useStreak')

function row(current: number, longest: number, active: number, last: string | null = null) {
  return {
    current_weeks: current,
    longest_weeks: longest,
    weeks_active: active,
    last_report_at: last,
  }
}

beforeEach(() => {
  rpcMock.mockReset()
})

describe('useStreak', () => {
  it('starts in a loading state with no streak', () => {
    rpcMock.mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useStreak())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.streak).toBeNull()
  })

  it('calls my_streak with no arguments at all', async () => {
    // The security property, not a style preference. Identity comes from the
    // x-reporter-token header; a token argument would make the function an
    // oracle returning any user's history to anyone who could name their token.
    rpcMock.mockResolvedValue({ data: [row(3, 3, 3)], error: null })
    renderHook(() => useStreak())

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledTimes(1)
    })
    expect(rpcMock.mock.calls[0]).toEqual(['my_streak'])
  })

  it('maps the row into the camelCase summary', async () => {
    rpcMock.mockResolvedValue({
      data: [row(3, 5, 9, '2026-08-10T02:00:00Z')],
      error: null,
    })
    const { result } = renderHook(() => useStreak())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.streak).toEqual({
      currentWeeks: 3,
      longestWeeks: 5,
      weeksActive: 9,
      lastReportAt: '2026-08-10T02:00:00Z',
    })
  })

  it('reads a lapsed user as zero current weeks with their longest remembered', async () => {
    rpcMock.mockResolvedValue({ data: [row(0, 4, 4)], error: null })
    const { result } = renderHook(() => useStreak())

    await waitFor(() => expect(result.current.streak).not.toBeNull())
    expect(result.current.streak?.currentWeeks).toBe(0)
    expect(result.current.streak?.longestWeeks).toBe(4)
  })

  it('treats an empty result set as a zeroed streak rather than crashing', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useStreak())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.streak).toEqual({
      currentWeeks: 0,
      longestWeeks: 0,
      weeksActive: 0,
      lastReportAt: null,
    })
  })

  it('leaves the streak null on failure instead of showing a zeroed one', async () => {
    // A zeroed streak on a failed request would tell a user their run had ended
    // when it had not — a lie the UI cannot detect.
    rpcMock.mockResolvedValue({ data: null, error: { message: 'network down' } })
    const { result } = renderHook(() => useStreak())

    await waitFor(() => expect(result.current.error).toBe('network down'))
    expect(result.current.streak).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('does not update state after unmount', async () => {
    let settle: ((value: unknown) => void) | undefined
    rpcMock.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve
      })
    )

    const { result, unmount } = renderHook(() => useStreak())
    unmount()
    settle?.({ data: [row(3, 3, 3)], error: null })
    await Promise.resolve()

    // The cleanup flag is what keeps this null; without it React logs an update
    // on an unmounted component and the last-mounted hook wins the race.
    expect(result.current.streak).toBeNull()
  })
})
