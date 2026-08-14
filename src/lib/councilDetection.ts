import { point, booleanPointInPolygon, centroid, distance } from '@turf/turf'
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
 * Pure function — no side effects, no network, no storage.
 *
 * Overlap handling (PRD Q3): the seeded boundaries are approximate bounding
 * boxes and several genuinely overlap — e.g. City of Melbourne spans lng
 * 144.9400–144.9850 while City of Yarra spans 144.9700–145.0100, sharing the
 * strip 144.970–144.985. Returning the *first* match made attribution depend on
 * row order from Supabase, which is unspecified without an ORDER BY, so the same
 * coordinates could route to different councils between calls.
 *
 * We therefore collect every containing boundary and, when more than one
 * matches, return the council whose polygon centroid is closest to the point —
 * the tie-break PRD Q3 specifies. Ties beyond that are broken by council_id so
 * the result is total and stable.
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

  const matches: CouncilBoundaryWithCouncil[] = []

  for (const boundary of boundaries) {
    if (!boundary.polygon) continue

    try {
      if (booleanPointInPolygon(pt, boundary.polygon as unknown as GeoJSON.MultiPolygon)) {
        matches.push(boundary)
      }
    } catch {
      // Invalid polygon — skip this boundary
      continue
    }
  }

  if (matches.length === 0) return null
  if (matches.length === 1) return toDetected(matches[0])

  // Overlapping boundaries: nearest centroid wins (PRD Q3).
  let best = matches[0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of matches) {
    let candidateDistance: number
    try {
      candidateDistance = distance(
        pt,
        centroid(candidate.polygon as unknown as GeoJSON.MultiPolygon)
      )
    } catch {
      // Centroid failed on a malformed polygon — rank it last rather than
      // letting it win by accident.
      candidateDistance = Number.POSITIVE_INFINITY
    }

    if (
      candidateDistance < bestDistance ||
      // Total, stable ordering when distances tie exactly.
      (candidateDistance === bestDistance && candidate.council_id < best.council_id)
    ) {
      best = candidate
      bestDistance = candidateDistance
    }
  }

  return toDetected(best)
}

function toDetected(boundary: CouncilBoundaryWithCouncil): DetectedCouncil {
  return {
    council_id: boundary.council_id,
    council_name: boundary.council_name,
    council_slug: boundary.council_slug,
  }
}
