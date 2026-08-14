import { CATEGORY_MAP } from '@/constants/categories'
import { HEATMAP_RECENCY_DECAY_DAYS, HEATMAP_RECENCY_MIN_WEIGHT } from '@/constants/config'
import type { MapPin } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Recency multiplier for heatmap intensity.
 *
 * PRD §6.3: reports older than 90 days carry 0.3x weight. Decays linearly to
 * that floor rather than stepping, so a report does not visibly pop off the
 * heatmap the morning it turns 91 days old.
 */
export function recencyWeight(submittedAt: string, now: number = Date.now()): number {
  const submitted = new Date(submittedAt).getTime()
  if (!Number.isFinite(submitted)) return HEATMAP_RECENCY_MIN_WEIGHT

  const ageDays = Math.max(0, (now - submitted) / DAY_MS)
  if (ageDays >= HEATMAP_RECENCY_DECAY_DAYS) return HEATMAP_RECENCY_MIN_WEIGHT

  const t = ageDays / HEATMAP_RECENCY_DECAY_DAYS
  return 1 - t * (1 - HEATMAP_RECENCY_MIN_WEIGHT)
}

/**
 * Heatmap intensity for one report: `upvotes × severity × recency` (PRD §6.3).
 *
 * Computed here rather than in a Mapbox expression because expressions cannot
 * do a category → severity table lookup, and duplicating the severity table
 * into the style would give us two copies to keep in sync with migration 011.
 *
 * Uses `upvote_count + 1` so a report with zero upvotes still registers — a
 * brand-new hazard nobody has seen yet is exactly what a council most needs to
 * find, and multiplying by zero would erase it from the density view entirely.
 */
export function heatWeight(report: MapPin, now: number = Date.now()): number {
  const severity = CATEGORY_MAP[report.category]?.severityWeight ?? 1
  return (report.upvote_count + 1) * severity * recencyWeight(report.submitted_at, now)
}

/**
 * Converts MapPin[] to a GeoJSON FeatureCollection for Mapbox GL JS sources.
 * GeoJSON coordinate order is [longitude, latitude].
 */
export function reportsToGeoJSON(
  reports: MapPin[],
  now: number = Date.now()
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: reports.map((report) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [report.lng, report.lat],
      },
      properties: {
        id: report.id,
        category: report.category,
        status: report.status,
        upvote_count: report.upvote_count,
        priority_score: report.priority_score,
        address: report.address ?? '',
        suburb: report.suburb ?? '',
        submitted_at: report.submitted_at,
        heat_weight: heatWeight(report, now),
      },
    })),
  }
}

/**
 * Formats a timestamp as a relative time string.
 */
export function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
