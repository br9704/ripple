// ── Report Limits ──
export const MAX_NOTE_LENGTH = 140
export const MAX_PHOTOS_PER_REPORT = 3
export const MAX_REPORTS_PER_HOUR = 10
export const DUPLICATE_RADIUS_METERS = 50
export const DUPLICATE_LOOKBACK_DAYS = 30

// ── Photo Processing ──
export const PHOTO_MAX_WIDTH = 1920
export const PHOTO_JPEG_QUALITY = 0.8
export const TFJS_INPUT_SIZE = 224

// ── AI Confidence Thresholds ──
export const AI_CONFIDENCE_HIGH = 0.85
export const AI_CONFIDENCE_MEDIUM = 0.60

// ── Upvote Thresholds ──
export const UPVOTE_THRESHOLD_NOTIFY = 10
export const UPVOTE_THRESHOLD_HIGH_PRIORITY = 25
export const UPVOTE_THRESHOLD_COUNCIL_ALERT = 50

// ── GPS ──
export const GPS_TIMEOUT_MS = 5000
export const GPS_FALLBACK_TIMEOUT_MS = 8000

// ── Map Defaults ──
export const MAP_DEFAULT_CENTER: [number, number] = [144.9631, -37.8136] // Melbourne CBD
export const MAP_DEFAULT_ZOOM = 13
export const MAP_CLUSTER_RADIUS = 50
export const MAP_CLUSTER_MAX_ZOOM = 14

// ── Heatmap Weights ──
export const HEATMAP_RECENCY_DECAY_DAYS = 90
export const HEATMAP_RECENCY_MIN_WEIGHT = 0.3

// ── Cache / Offline ──
export const OFFLINE_RECENT_REPORTS_COUNT = 50
export const MAPBOX_TILE_CACHE_MAX_AGE_SECONDS = 604800 // 7 days

// ── Comment Moderation ──
export const COMMENT_MAX_LENGTH = 500
export const COMMENT_FLAG_HIDE_THRESHOLD = 5

// ── Search ──
export const SEARCH_RATE_LIMIT_PER_MINUTE = 60
export const SEARCH_DEFAULT_PAGE_SIZE = 20

// ── Priority Score Formula Constants ──
export const PRIORITY_UPVOTE_MULTIPLIER = 2
export const PRIORITY_SEVERITY_MULTIPLIER = 10
export const PRIORITY_AGE_MULTIPLIER = 0.5
export const PRIORITY_ACKNOWLEDGED_OFFSET = -20
export const PRIORITY_IN_PROGRESS_OFFSET = -40
