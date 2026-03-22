import { useState, useEffect, useRef, useCallback } from 'react'
import { GPS_TIMEOUT_MS, GPS_FALLBACK_TIMEOUT_MS } from '@/constants/config'

interface GeolocationState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  isLocating: boolean
  error: string | null
  /** True when GPS_TIMEOUT_MS (5s) exceeded — show "Getting location..." hint */
  timedOut: boolean
  /** True when GPS_FALLBACK_TIMEOUT_MS (8s) exceeded — trigger map picker */
  fallbackTriggered: boolean
}

function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission denied. Please enable location access in your device settings.'
    case error.POSITION_UNAVAILABLE:
      return 'Location unavailable. Please try again or select your location on the map.'
    case error.TIMEOUT:
      return 'Location request timed out. Please select your location on the map.'
    default:
      return 'Unable to determine your location.'
  }
}

/**
 * Captures the user's GPS position using watchPosition for faster time-to-fix.
 * Stops watching after the first successful position.
 *
 * - At GPS_TIMEOUT_MS (5s): sets timedOut = true (show "Getting location..." UI)
 * - At GPS_FALLBACK_TIMEOUT_MS (8s): sets fallbackTriggered = true (show map picker)
 * - Pauses when page is hidden, resumes when visible
 */
const GEO_SUPPORTED = typeof navigator !== 'undefined' && 'geolocation' in navigator

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    isLocating: GEO_SUPPORTED,
    error: GEO_SUPPORTED ? null : 'Geolocation is not supported by your browser.',
    timedOut: false,
    fallbackTriggered: false,
  })

  const watchIdRef = useRef<number | null>(null)
  const resolvedRef = useRef(false)

  useEffect(() => {
    if (!GEO_SUPPORTED) return

    function clearWatch() {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }

    function startWatch() {
      if (resolvedRef.current) return

      const warningTimer = setTimeout(() => {
        if (!resolvedRef.current) {
          setState((prev) => ({ ...prev, timedOut: true }))
        }
      }, GPS_TIMEOUT_MS)

      const fallbackTimer = setTimeout(() => {
        if (!resolvedRef.current) {
          setState((prev) => ({
            ...prev,
            fallbackTriggered: true,
            isLocating: false,
          }))
          clearWatch()
        }
      }, GPS_FALLBACK_TIMEOUT_MS)

      const id = navigator.geolocation.watchPosition(
        (position) => {
          if (resolvedRef.current) return
          resolvedRef.current = true
          clearTimeout(warningTimer)
          clearTimeout(fallbackTimer)

          setState({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            isLocating: false,
            error: null,
            timedOut: false,
            fallbackTriggered: false,
          })

          clearWatch()
        },
        (error) => {
          if (resolvedRef.current) return
          clearTimeout(warningTimer)
          clearTimeout(fallbackTimer)

          setState((prev) => ({
            ...prev,
            isLocating: false,
            error: getErrorMessage(error),
            fallbackTriggered: true,
          }))

          clearWatch()
        },
        {
          enableHighAccuracy: true,
          timeout: GPS_FALLBACK_TIMEOUT_MS,
          maximumAge: 30000,
        }
      )

      watchIdRef.current = id

      return () => {
        clearTimeout(warningTimer)
        clearTimeout(fallbackTimer)
      }
    }

    const cleanupTimers = startWatch()

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearWatch()
      } else if (!resolvedRef.current) {
        startWatch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cleanupTimers?.()
      clearWatch()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  /** Manually set coordinates (e.g. from map picker fallback) */
  const setManualPosition = useCallback((lat: number, lng: number) => {
    resolvedRef.current = true
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setState({
      lat,
      lng,
      accuracy: null,
      isLocating: false,
      error: null,
      timedOut: false,
      fallbackTriggered: false,
    })
  }, [])

  return {
    ...state,
    setManualPosition,
  }
}
