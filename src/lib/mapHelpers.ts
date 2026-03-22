import type { MapPin } from '@/types'

/**
 * Converts MapPin[] to a GeoJSON FeatureCollection for Mapbox GL JS sources.
 * GeoJSON coordinate order is [longitude, latitude].
 */
export function reportsToGeoJSON(reports: MapPin[]): GeoJSON.FeatureCollection {
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
