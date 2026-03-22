import { point, booleanPointInPolygon } from '@turf/turf'
import type { CouncilBoundaryWithCouncil } from '@/types'

export interface DetectedCouncil {
  council_id: string
  council_name: string
  council_slug: string
}

/**
 * Determines which council boundary contains the given coordinates
 * using Turf.js point-in-polygon.
 *
 * Returns the first matching council, or null if outside all boundaries.
 * Pure function — no side effects, no network, no storage.
 *
 * Note: GeoJSON coordinate order is [longitude, latitude].
 */
export function detectCouncil(
  lat: number,
  lng: number,
  boundaries: CouncilBoundaryWithCouncil[]
): DetectedCouncil | null {
  // GeoJSON convention: [longitude, latitude]
  const pt = point([lng, lat])

  for (const boundary of boundaries) {
    if (!boundary.polygon) continue

    try {
      if (booleanPointInPolygon(pt, boundary.polygon as unknown as GeoJSON.MultiPolygon)) {
        return {
          council_id: boundary.council_id,
          council_name: boundary.council_name,
          council_slug: boundary.council_slug,
        }
      }
    } catch {
      // Invalid polygon — skip this boundary
      continue
    }
  }

  return null
}
