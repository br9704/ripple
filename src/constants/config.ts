// ── Report Limits ──
export const MAX_NOTE_LENGTH = 140
export const MAX_PHOTOS_PER_REPORT = 3
export const MAX_REPORTS_PER_HOUR = 10
export const DUPLICATE_RADIUS_METERS = 50
export const DUPLICATE_LOOKBACK_DAYS = 30

// ── Photo Processing ──
export const PHOTO_MAX_WIDTH = 1920
export const PHOTO_JPEG_QUALITY = 0.8

// ── On-device AI (LiteRT.js) ──
/**
 * Fallback input edge. The real value is read from the model's own
 * getInputDetails() at load time — EfficientNet-Lite0 and MobileNetV3-Small
 * disagree on this, and guessing produces a tensor the runtime rejects.
 * (Renamed from TFJS_INPUT_SIZE; TensorFlow.js was retired in Sprint 7.)
 */
export const AI_INPUT_SIZE = 224

/**
 * Versioned model URL. The version lives in the filename so a new model is a
 * new URL — cache invalidation is then free, and swapping the generic backbone
 * for the fine-tuned civic classifier is a one-line change.
 */
export const AI_MODEL_VERSION = 'v1'
export const AI_MODEL_URL = `/models/ripple-classifier-${AI_MODEL_VERSION}.tflite`

/** Served from our own origin — a CDN dependency would break offline use. */
export const AI_WASM_PATH = '/litert-wasm/'

/**
 * Expected inference time, used to pace the progress bar to 90%.
 * Unproven in-browser: no published numbers exist for EfficientNet-Lite0 int8
 * under WASM/WebGPU, so this is a starting estimate to be replaced by the real
 * p50 from S7.13. The bar HOLDS at 90% rather than completing, so an estimate
 * that is too low degrades honestly instead of faking progress.
 */
export const AI_EXPECTED_INFERENCE_MS = 900

/** Hard ceiling from MOTION.md: capture → result must not exceed this. */
export const AI_BUDGET_MS = 3000

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
