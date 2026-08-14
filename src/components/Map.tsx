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
const SOURCE_ID = 'reports'

// Build Mapbox match expression for category → color
function getCategoryColorExpression(): mapboxgl.ExpressionSpecification {
  const stops: (string)[] = []
  for (const [key, config] of Object.entries(CATEGORY_MAP)) {
    stops.push(key, config.color)
  }
  return ['match', ['get', 'category'], ...stops, '#8B949E'] as mapboxgl.ExpressionSpecification
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

      // Cluster circles
      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#E85D04',
          'circle-radius': [
            'step', ['get', 'point_count'],
            18, 10, 24, 50, 32,
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0D1117',
        },
      })

      // Cluster count labels
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 13,
        },
        paint: {
          'text-color': '#F0F6FC',
        },
      })

      // Unclustered report pins
      map.addLayer({
        id: UNCLUSTERED_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': getCategoryColorExpression(),
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'upvote_count'],
            0, 8,
            10, 11,
            50, 16,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0D1117',
          'circle-opacity': 0.9,
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
