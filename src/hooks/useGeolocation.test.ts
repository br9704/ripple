import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { GPS_TIMEOUT_MS, GPS_FALLBACK_TIMEOUT_MS } from '@/constants/config'

/**
 * `GEO_SUPPORTED` is evaluated at MODULE LOAD in useGeolocation.ts, so
 * geolocation has to exist on `navigator` before the module is imported —
 * stubbing it in beforeEach is too late and the hook short-circuits to
 * "not supported". Hence the definition here and the dynamic import below.
 */
let watchCallbacks: { success?: PositionCallback; error?: PositionErrorCallback } = {}
const clearWatchSpy = vi.fn()
const watchPositionSpy = vi.fn(
  (success: PositionCallback, error: PositionErrorCallback) => {
    watchCallbacks = { success, error }
    return 42
  }
)

Object.defineProperty(globalThis.navigator, 'geolocation', {
  configurable: true,
  value: {
    watchPosition: watchPositionSpy,
    clearWatch: clearWatchSpy,
    getCurrentPosition: vi.fn(),
  },
})

const { useGeolocation } = await import('./useGeolocation')

beforeEach(() => {
  watchCallbacks = {}
  clearWatchSpy.mockClear()
  watchPositionSpy.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

function fix(lat: number, lng: number, accuracy = 10) {
  return { coords: { latitude: lat, longitude: lng, accuracy }, timestamp: Date.now() } as GeolocationPosition
}

describe('useGeolocation', () => {
  it('starts in a locating state', () => {
    const { result } = renderHook(() => useGeolocation())
    expect(result.current.isLocating).toBe(true)
    expect(result.current.lat).toBeNull()
  })

  it('resolves on the first fix and stops watching', async () => {
    const { result } = renderHook(() => useGeolocation())

    act(() => {
      watchCallbacks.success?.(fix(-37.81, 144.96))
    })

    await waitFor(() => expect(result.current.isLocating).toBe(false))
    expect(result.current.lat).toBeCloseTo(-37.81)
    expect(result.current.lng).toBeCloseTo(144.96)
    // First-fix-then-stop: continuing to watch would drain battery for no gain,
    // and PRD §13.1 forbids tracking location between moments.
    expect(clearWatchSpy).toHaveBeenCalled()
  })

  it('flags a timeout at 5s without giving up', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useGeolocation())

    act(() => {
      vi.advanceTimersByTime(GPS_TIMEOUT_MS)
    })

    expect(result.current.timedOut).toBe(true)
    // Still trying — the 5s mark is a warning, not a surrender.
    expect(result.current.isLocating).toBe(true)
  })

  it('triggers the manual fallback at 8s', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useGeolocation())

    act(() => {
      vi.advanceTimersByTime(GPS_FALLBACK_TIMEOUT_MS)
    })

    // This flag is what makes LocationPicker appear. Before S6.5.4 it was set
    // and read by nobody, which is why GPS failure was a dead end.
    expect(result.current.fallbackTriggered).toBe(true)
  })

  it('surfaces a permission denial as an error', async () => {
    const { result } = renderHook(() => useGeolocation())

    act(() => {
      watchCallbacks.error?.({ code: 1, message: 'denied' } as GeolocationPositionError)
    })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.isLocating).toBe(false)
  })

  it('accepts a manual position and clears the error state', async () => {
    const { result } = renderHook(() => useGeolocation())

    act(() => {
      watchCallbacks.error?.({ code: 1, message: 'denied' } as GeolocationPositionError)
    })
    await waitFor(() => expect(result.current.error).toBeTruthy())

    act(() => {
      result.current.setManualPosition(-37.9, 145.1)
    })

    await waitFor(() => expect(result.current.lat).toBeCloseTo(-37.9))
    expect(result.current.lng).toBeCloseTo(145.1)
    expect(result.current.error).toBeNull()
    expect(result.current.isLocating).toBe(false)
  })

  it('clears its watch on unmount', () => {
    const { unmount } = renderHook(() => useGeolocation())
    unmount()
    expect(clearWatchSpy).toHaveBeenCalled()
  })
})
