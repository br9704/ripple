// ── Report Categories ──
export type ReportCategory =
  | 'pothole'
  | 'streetlight'
  | 'graffiti'
  | 'signage'
  | 'accessibility'
  | 'dumping'
  | 'water'
  | 'tree'
  | 'footpath'
  | 'other'

// ── Report Status ──
export type ReportStatus =
  | 'reported'
  | 'acknowledged'
  | 'in_progress'
  | 'fixed'
  | 'declined'
  | 'wont_fix'

// ── Photo Type ──
export type PhotoType = 'original' | 'additional' | 'fixed_confirmation'

// ── Notification Type ──
export type NotificationType = 'email' | 'push'

// ── Status Changed By ──
export type StatusChangedBy = 'council' | 'community' | 'system'

// ── Council ──
export interface Council {
  id: string
  slug: string
  name: string
  state: string
  contact_email: string | null
  dashboard_enabled: boolean
  created_at: string
}

// ── Council Boundary ──
export interface CouncilBoundary {
  id: string
  council_id: string
  polygon: GeoJSON.MultiPolygon
  source: string
  updated_at: string
}

// ── Report ──
export interface Report {
  id: string
  reporter_token: string
  council_id: string | null
  category: ReportCategory
  ai_category: ReportCategory | null
  ai_confidence: number | null
  user_corrected_ai: boolean
  lat: number
  lng: number
  address: string | null
  suburb: string | null
  postcode: string | null
  note: string | null
  status: ReportStatus
  council_note: string | null
  priority_score: number
  upvote_count: number
  submitted_at: string
  status_updated_at: string | null
  fixed_at: string | null
}

// ── Report Photo ──
export interface ReportPhoto {
  id: string
  report_id: string
  storage_path: string
  public_url: string
  photo_type: PhotoType
  uploaded_at: string
}

// ── Upvote ──
export interface Upvote {
  id: string
  report_id: string
  reporter_token: string
  created_at: string
}

// ── Comment ──
export interface Comment {
  id: string
  report_id: string
  reporter_token: string
  is_council: boolean
  is_pinned: boolean
  body: string
  flag_count: number
  hidden: boolean
  created_at: string
}

// ── Status History ──
export interface StatusHistory {
  id: string
  report_id: string
  from_status: ReportStatus | null
  to_status: ReportStatus
  changed_by: StatusChangedBy | null
  council_note: string | null
  created_at: string
}

// ── User Notification ──
export interface UserNotification {
  id: string
  reporter_token: string
  notification_type: NotificationType
  email: string | null
  push_subscription: object | null
  report_id: string | null
  is_active: boolean
  created_at: string
}

// ── Badge ──
export type BadgeSlug =
  | 'first_report'
  | '10_reports'
  | 'fix_confirmed'
  | 'safety_spotter'
  | 'accessibility_advocate'
  | 'neighbourhood_watch'

export interface BadgeEarned {
  id: string
  reporter_token: string
  badge_slug: BadgeSlug
  earned_at: string
}

// ── Map Pin (lightweight, for map rendering) ──
export interface MapPin {
  id: string
  lat: number
  lng: number
  category: ReportCategory
  status: ReportStatus
  upvote_count: number
  priority_score: number
  address: string | null
  suburb: string | null
  submitted_at: string
}

// ── Report Detail (full report with relations) ──
export interface ReportDetail extends Report {
  photos: ReportPhoto[]
  comments: Comment[]
  status_history: StatusHistory[]
  council: Council | null
}

// ── API Request/Response Types ──

export interface SubmitReportRequest {
  category: ReportCategory
  ai_category: ReportCategory
  ai_confidence: number
  user_corrected_ai: boolean
  lat: number
  lng: number
  note?: string
  reporter_token: string
  photo_base64: string
  additional_photos?: string[]
}

export interface SubmitReportResponse {
  report_id: string
  address: string
  suburb: string
  council_name: string
  duplicate_nearby?: {
    report_id: string
    upvote_count: number
    address: string
  }
  map_pin: MapPin
}

export interface UpdateStatusRequest {
  report_id: string
  new_status: ReportStatus
  council_note?: string
}

export interface SearchReportsRequest {
  query?: string
  category?: ReportCategory[]
  status?: ReportStatus[]
  suburb?: string
  council_id?: string
  date_from?: string
  date_to?: string
  min_upvotes?: number
  geo_filter?: { lat: number; lng: number; radius_km: number }
  from?: number
  size?: number
  sort?: 'priority' | 'newest' | 'upvotes' | 'relevance'
}

// ── Report Filters (client-side) ──
export interface ReportFilters {
  categories?: ReportCategory[]
  statuses?: ReportStatus[]
  dateRange?: '7d' | '30d' | '90d' | 'all'
  minUpvotes?: number
  nearMe?: boolean
}

// ── Realtime Events ──
export interface NewReportEvent {
  type: 'INSERT'
  record: MapPin
}

export interface ReportUpdateEvent {
  type: 'UPDATE'
  record: {
    id: string
    status: ReportStatus
    upvote_count: number
    priority_score: number
  }
}
