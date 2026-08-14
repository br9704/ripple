import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@/constants/config'

// Map.tsx sets this too, but this component can mount without Map.tsx ever
// having rendered (GPS can fail before the user reaches the map).
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

interface LocationPickerProps {
  /** Starting centre, when a coarse fix exists. Falls back to the city default. */
  initialLat?: number | null
  initialLng?: number | null
  onConfirm: (lat: number, lng: number) => void
  onCancel: () => void
}

/**
 * Manual location fallback for when GPS is denied, unavailable, or too slow.
 *
 * PRD §6.1 specifies this ("If GPS unavailable: map picker fallback") and
 * MASTERPLAN S4.4/S4.5 marked it complete in March, but no such component
 * existed: `fallbackTriggered` was set and never read, and `setManualPosition`
 * was exported and never called. The practical effect was that any user whose
 * GPS failed reached a screen where the submit button stayed disabled forever
 * with no explanation and no route forward.
 */
export function LocationPicker({
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  // Frozen at mount via a lazy initialiser. The map is uncontrolled once
  // created — the user is panning it — so these must not be reactive. State
  // rather than a ref because refs may not be read during render.
  const [initialView] = useState(() => ({
    lat: initialLat ?? MAP_DEFAULT_CENTER[1],
    lng: initialLng ?? MAP_DEFAULT_CENTER[0],
    // A coarse fix is worth zooming into; a bare city default is not.
    zoom: initialLat != null ? MAP_DEFAULT_ZOOM + 2 : MAP_DEFAULT_ZOOM,
  }))

  const [centre, setCentre] = useState<{ lat: number; lng: number }>({
    lat: initialView.lat,
    lng: initialView.lng,
  })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [initialView.lng, initialView.lat],
      zoom: initialView.zoom,
      attributionControl: false,
    })

    // Reading the centre rather than placing a draggable marker keeps the whole
    // interaction one-handed: pan the map under a fixed crosshair.
    const syncCentre = () => {
      const c = map.getCenter()
      setCentre({ lat: c.lat, lng: c.lng })
    }
    map.on('move', syncCentre)

    mapRef.current = map

    return () => {
      map.off('move', syncCentre)
      map.remove()
      mapRef.current = null
    }
    // `initialView` is set once by a lazy initialiser and never updated, so
    // listing it is truthful and the effect still runs exactly once.
  }, [initialView])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-text-secondary transition-colors hover:text-text-primary"
          aria-label="Cancel choosing a location"
        >
          ✕
        </button>
        <h1 className="font-mono text-sm text-text-primary">Set the location</h1>
      </div>

      <p className="px-4 py-2 font-mono text-xs text-text-secondary">
        &gt; drag the map to place the pin
      </p>

      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Fixed crosshair — the map moves beneath it. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="h-6 w-px bg-action" />
          <div className="absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-action" />
        </div>
      </div>

      <div className="border-t border-border px-4 py-4">
        <p className="mb-3 font-mono text-xs text-text-secondary" aria-live="polite">
          {centre.lat.toFixed(5)}, {centre.lng.toFixed(5)}
        </p>
        <button
          type="button"
          onClick={() => onConfirm(centre.lat, centre.lng)}
          className="w-full bg-action px-4 py-3.5 font-mono text-sm font-semibold text-bg-primary transition-colors hover:bg-action-hover"
        >
          [ use this location ]
        </button>
      </div>
    </div>
  )
}
