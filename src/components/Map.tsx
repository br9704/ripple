import { useEffect, useRef, useCallback, useImperativeHandle, type Ref } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_CLUSTER_RADIUS, MAP_CLUSTER_MAX_ZOOM } from '@/constants/config'
import { CATEGORY_MAP } from '@/constants/categories'
import { reportsToGeoJSON } from '@/lib/mapHelpers'
import type { MapPin } from '@/types'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

const UNCLUSTERED_LAYER = 'unclustered-reports'
const CLUSTER_LAYER = 'clusters'
const CLUSTER_COUNT_LAYER = 'cluster-count'
const GLYPH_LAYER = 'report-glyphs'
const SOURCE_ID = 'reports'

// ── SIGNAL palette (mirrors src/index.css; Mapbox paint properties cannot
//    read CSS custom properties, so these are the one sanctioned duplication) ──
const BG = '#050505'
const TEXT_PRIMARY = '#f0ece4'
const TEXT_SECONDARY = '#98928a'
const AMBER = '#ffb000'
const STEEL = '#2c2925'

/**
 * category → glyph, for the symbol layer's text-field.
 *
 * Replaces the old category → colour match expression. Under SIGNAL there is
 * one accent, so ten categories cannot be encoded by hue; identity moves to
 * shape. This also means pins survive greyscale printing, colour blindness and
 * harsh outdoor light — PRD §10.2's actual intent.
 */
function getCategoryGlyphExpression(): mapboxgl.ExpressionSpecification {
  const stops: string[] = []
  for (const [key, config] of Object.entries(CATEGORY_MAP)) {
    stops.push(key, config.glyph)
  }
  return ['match', ['get', 'category'], ...stops, '○'] as mapboxgl.ExpressionSpecification
}

/**
 * Amber is reserved for safety-critical categories — the single sanctioned
 * exception to grayscale pins, and the reason a parent scanning the map can
 * still pick out a dead streetlight near a school at a glance.
 */
function getCategoryColorExpression(): mapboxgl.ExpressionSpecification {
  const safetyKeys = Object.values(CATEGORY_MAP)
    .filter((c) => c.isSafety)
    .map((c) => c.key)

  return [
    'match',
    ['get', 'category'],
    ...safetyKeys.flatMap((k) => [k, AMBER]),
    TEXT_SECONDARY,
  ] as unknown as mapboxgl.ExpressionSpecification
}

export interface MapHandle {
  /** Centre the map on the user's current position. */
  flyToUser: () => void
}

interface MapComponentProps {
  reports: MapPin[]
  onPinClick: (reportId: string) => void
  ref?: Ref<MapHandle>
}

function MapComponent({ reports, onPinClick, ref }: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const onPinClickRef = useRef(onPinClick)

  // Latest reports, readable from the map's own 'load' callback.
  //
  // The init effect must not depend on `reports` (re-creating the map on every
  // data change would be catastrophic), but the load handler still needs the
  // *current* value rather than the one captured at mount — otherwise any
  // report that arrived during style loading is silently lost. This ref is how
  // the effect stays mount-only and correct at the same time, which also lets
  // the exhaustive-deps suppression be removed.
  //
  // Assigned in an effect rather than during render: refs may not be written
  // while rendering, and Mapbox's 'load' fires well after commit either way.
  const reportsRef = useRef(reports)

  useEffect(() => {
    reportsRef.current = reports
    onPinClickRef.current = onPinClick
  }, [reports, onPinClick])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !mapboxgl.accessToken) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: MAP_DEFAULT_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      // Add GeoJSON source with clustering
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        // Read from the ref, not the closure: reports that arrived while the
        // style was still loading must survive into the initial source data.
        data: reportsToGeoJSON(reportsRef.current),
        cluster: true,
        clusterRadius: MAP_CLUSTER_RADIUS,
        clusterMaxZoom: MAP_CLUSTER_MAX_ZOOM,
      })

      // Cluster "chips" — square, hairline-bordered, unfilled. Instrument
      // readouts rather than coloured bubbles.
      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': BG,
          'circle-radius': [
            'step', ['get', 'point_count'],
            16, 10, 21, 50, 28,
          ],
          'circle-opacity': 0.92,
          'circle-stroke-width': 1,
          'circle-stroke-color': STEEL,
        },
      })

      // Cluster count labels — monospace, tabular.
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': TEXT_PRIMARY,
        },
      })

      // Unclustered pin backing — square-ish dark disc so the glyph stays
      // legible over any basemap content.
      map.addLayer({
        id: UNCLUSTERED_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': BG,
          // Radius still scales with upvote_count (PRD §6.3, max ~2x) — social
          // proof is legible by size rather than by hue.
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'upvote_count'],
            0, 9,
            10, 12,
            50, 17,
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': getCategoryColorExpression(),
          'circle-opacity': 0.92,
        },
      })

      // The category glyph itself — this is what carries identity now.
      map.addLayer({
        id: GLYPH_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': getCategoryGlyphExpression(),
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': getCategoryColorExpression(),
        },
      })

      // Click on unclustered pin
      map.on('click', UNCLUSTERED_LAYER, (e) => {
        const id = e.features?.[0]?.properties?.id
        if (id) onPinClickRef.current(id)
      })

      // Click on cluster → zoom to expand
      map.on('click', CLUSTER_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] })
        const clusterId = features[0]?.properties?.cluster_id
        if (clusterId === undefined) return

        const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource
        source.getClusterExpansionZoom(clusterId, (err?: Error | null, zoom?: number | null) => {
          if (err || zoom == null) return
          const geometry = features[0].geometry
          if (geometry.type === 'Point') {
            map.easeTo({
              center: geometry.coordinates as [number, number],
              zoom,
            })
          }
        })
      })

      // Cursor on hover
      map.on('click', GLYPH_LAYER, (e) => {
        const id = e.features?.[0]?.properties?.id
        if (id) onPinClickRef.current(id)
      })

      map.on('mouseenter', UNCLUSTERED_LAYER, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', UNCLUSTERED_LAYER, () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = ''
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update data when reports change.
  //
  // Previously this early-returned when the style had not finished loading,
  // with no retry — so a Realtime insert arriving in that window was dropped
  // permanently and the pin simply never appeared. Now the source is only
  // missing before 'load' fires, and the load handler seeds itself from
  // reportsRef, so there is no window in which data can be lost.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (source) {
      source.setData(reportsToGeoJSON(reports))
    }
    // No source yet means 'load' has not run; it will pick up reportsRef.current.
  }, [reports])

  const flyToUser = useCallback(() => {
    if (!navigator.geolocation || !mapRef.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 15,
        })
      },
      () => {
        // GPS unavailable — stay on current view
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }, [])

  // Replaces the previous escape hatch, where MapPage reached in with
  // document.querySelector('[data-locate-me]').click() against a hidden button.
  // That worked but bypassed React entirely and would have broken the moment a
  // second map instance mounted.
  useImperativeHandle(ref, () => ({ flyToUser }), [flyToUser])

  return <div ref={containerRef} className="absolute inset-0" />
}

export { MapComponent }
