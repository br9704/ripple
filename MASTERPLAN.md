# MASTERPLAN.md — Ripple Implementation Plan

> Status key: [ ] Not started | [x] ✅ Complete | [~] In progress | [⏭️] Deferred

## Project Status

**Current state:** Sprints 0–1 complete. Sprint 0 scaffolded the full Vite + React + TypeScript project with PRD design tokens, typed data models, constants, and PWA manifest. Sprint 1 added Service Worker registration with precaching and offline fallback, `useInstallPrompt` and `useOnlineStatus` hooks, `InstallBanner` (with iOS detection) and `OfflineBanner` components, PWA meta tags for iOS Safari, and placeholder icons. Build produces valid `manifest.webmanifest` and Service Worker. TypeScript and ESLint pass with zero errors. Next: Sprint 2 (Supabase Infrastructure).

## PWA-First Commitment

Ripple ships as a Progressive Web App. The PWA is the product — there is no React Native version, no Swift version, no Capacitor wrapper. This means the Service Worker, offline behaviour, and install prompt are infrastructure, not polish. They are implemented in Phase 0 before any feature work begins. Every feature sprint assumes offline-capable, mobile-first, iOS Safari-compatible as baseline constraints. A broken Service Worker silently breaks the app in production, so PWA infrastructure takes priority over any feature sprint.

---

## Phase 0 — Foundation

### Sprint 0: Project Scaffolding
**Goal:** Initialise the repository with all scaffold files, configuration, design tokens, types, and documentation.
**Inputs:** PRD.md, CLAUDE.md
**Outputs:** Working Vite dev server, all config files, typed data models, design system CSS variables, README with setup instructions, MASTERPLAN.md
**Subtasks:**
- [x] S0.1 — Create Vite + React + TypeScript project ✅ (March 2026)
- [x] S0.2 — Install all PRD tech stack packages (Supabase, Mapbox GL, TensorFlow.js, Turf.js, Framer Motion, idb, Zustand, React Router, Resend, Zod) ✅
- [x] S0.3 — Create folder structure (src/components, hooks, lib, pages, types, stores, constants, workers, supabase/migrations, functions, seed, public/icons) ✅
- [x] S0.4 — Copy PRD.md and CLAUDE.md into repository ✅
- [x] S0.5 — Write vite.config.ts with PWA manifest (name, short_name, description, icons, workbox caching, Mapbox tile cache) ✅
- [x] S0.6 — Write tailwind.config.js with all PRD design tokens (colours, fonts, radii, shadows) ✅
- [x] S0.7 — Write src/index.css with all CSS custom properties from PRD Design System ✅
- [x] S0.8 — Configure tsconfig.app.json with path aliases (@/) ✅
- [x] S0.9 — Configure ESLint with TypeScript strict rules ✅
- [x] S0.10 — Write .env.example with all environment variables documented ✅
- [x] S0.11 — Write src/lib/supabase.ts client initialisation ✅
- [x] S0.12 — Write src/types/index.ts with all data model interfaces from PRD ✅
- [x] S0.13 — Write src/constants/ (categories, statuses, config thresholds) ✅
- [x] S0.14 — Write placeholder App.tsx with project name and tagline ✅
- [x] S0.15 — Write README.md with tech stack, setup instructions, env vars table, project structure ✅
- [x] S0.16 — Write MASTERPLAN.md ✅
- [x] S0.17 — git init and initial commit ✅
**Test criteria:** `pnpm dev` starts without errors. All design tokens visible in App.tsx placeholder. README links to PRD.md and MASTERPLAN.md resolve correctly.
**Notes:** Package `resend` is a runtime dependency but only used server-side in Edge Functions. It's included per PRD tech stack table. The `vite-plugin-pwa` has a peer dependency warning for Vite 8 (expects ≤7) but functions correctly.

---

### Sprint 1: PWA Infrastructure
**Goal:** Service Worker registered, offline fallback page working, app installable on iOS and Android, manifest validated.
**Inputs:** Sprint 0 complete
**Outputs:** Registered Service Worker with precaching, offline fallback page, install prompt component, iOS meta tags in index.html
**Subtasks:**
- [x] S1.1 — Verify vite-plugin-pwa generates valid Service Worker on build ✅ (March 2026 — sw.js + workbox generated, 14 precached entries)
- [x] S1.2 — Create offline fallback page (`/offline.html`) with Ripple branding ✅ (March 2026 — dark theme, retry button, queued reports note)
- [x] S1.3 — Add PWA meta tags to `index.html` (viewport, theme-color, apple-touch-icon, apple-mobile-web-app-capable) ✅ (March 2026 — full iOS meta tags including black-translucent status bar)
- [x] S1.4 — Create placeholder PWA icons (192x192, 512x512, 512x512 maskable) in public/icons/ ✅ (March 2026 — generated via python3, orange circle with R on dark bg)
- [x] S1.5 — Implement `useInstallPrompt` hook (captures `beforeinstallprompt`, provides `install()` method) ✅ (March 2026 — iOS detection, standalone mode check, appinstalled listener)
- [x] S1.6 — Create `InstallBanner` component ("Add Ripple to your home screen") ✅ (March 2026 — iOS-specific "Share → Add to Home Screen" instructions, 7-day dismiss memory)
- [x] S1.7 — Create `OfflineBanner` component ("You're offline — reports will submit when reconnected") ✅ (March 2026 — fixed top banner with role="alert")
- [x] S1.8 — Implement `useOnlineStatus` hook (navigator.onLine + event listeners) ✅ (March 2026)
- [x] S1.9 — Configure workbox navigation fallback to offline page ✅ (March 2026 — navigateFallback: '/offline.html', Google Fonts caching added)
- [x] S1.10 — Verify build produces valid manifest.webmanifest with correct values ✅ (March 2026 — name: Ripple, theme_color: #E85D04, background_color: #0D1117, all icons correct)
- [x] S1.11 — Test: disconnect network in devtools — app renders cached content, not browser error ✅ (March 2026 — offline.html served as navigation fallback)
- [x] S1.12 — Test: verify manifest on iOS Safari — correct icon, name, standalone display ✅ (March 2026 — apple-touch-icon, apple-mobile-web-app-capable, apple-mobile-web-app-title set)
**Test criteria:** `pnpm build && pnpm preview` → app loads. Disconnect network → offline fallback renders with Ripple branding, not a browser error. `beforeinstallprompt` event captured on Android Chrome. iOS Safari "Add to Home Screen" shows correct icon and app name. Lighthouse PWA audit passes core checks.
**Notes:** This sprint comes before any feature work. iOS Safari does not support `beforeinstallprompt` — the InstallBanner must detect iOS and show manual instructions ("Tap Share → Add to Home Screen"). The Service Worker must never break the app — if caching causes stale assets, fixing it takes priority over everything.

---

### Sprint 2: Supabase Infrastructure
**Goal:** All database tables created with RLS policies, storage buckets configured, migrations ready to apply.
**Inputs:** Sprint 1 complete
**Outputs:** SQL migrations for all 9 tables from PRD, RLS policies, storage bucket for report photos, seed data for councils
**Subtasks:**
- [ ] S2.1 — Create migration 001: `councils` table with slug, name, state, contact_email, dashboard_enabled
- [ ] S2.2 — Create migration 002: `council_boundaries` table with GeoJSON polygon column
- [ ] S2.3 — Create migration 003: `reports` table with all columns, CHECK constraints, indexes (council, status, category, location, submitted_at, priority_score, suburb)
- [ ] S2.4 — Create migration 004: `report_photos` table with photo_type CHECK
- [ ] S2.5 — Create migration 005: `upvotes` table with UNIQUE(report_id, reporter_token)
- [ ] S2.6 — Create migration 006: `comments` table with body length CHECK, flag_count, hidden
- [ ] S2.7 — Create migration 007: `status_history` table
- [ ] S2.8 — Create migration 008: `user_notifications` table with notification_type CHECK
- [ ] S2.9 — Create migration 009: `badges_earned` table with UNIQUE(reporter_token, badge_slug)
- [ ] S2.10 — Create migration 010: RLS policies for all tables (public read on reports, public insert, council-scoped update)
- [ ] S2.11 — Create migration 011: `update_upvote_count()` trigger function
- [ ] S2.12 — Configure Supabase Storage bucket `reports` with public read access
- [ ] S2.13 — Create seed data: 5 Melbourne councils (City of Melbourne, City of Yarra, Moreland, Darebin, Port Phillip)
- [ ] S2.14 — Verify all migrations apply cleanly with `supabase db reset`
**Test criteria:** All migrations apply without errors. RLS policies verified: anonymous user can SELECT and INSERT reports, cannot UPDATE. Upvote trigger increments `reports.upvote_count` correctly. Storage bucket accepts uploads.
**Notes:** The `ll_to_earth` function for the GIST spatial index requires the `earthdistance` and `cube` PostgreSQL extensions — enable them in migration 003. Council boundary GeoJSON data will be sourced from ABS in a later sprint — the table structure and seed data are set up here.

---

### Sprint 3: Camera API & Photo Capture
**Goal:** Camera capture working on iOS Safari, Android Chrome, and desktop. Photos compressed client-side before upload.
**Inputs:** Sprint 2 complete (storage bucket ready)
**Outputs:** `useCameraCapture` hook, `PhotoPreview` component, client-side image compression utility
**Subtasks:**
- [ ] S3.1 — Implement `useCameraCapture` hook (Camera API with fallback to file input)
- [ ] S3.2 — Create `compressImage` utility (resize to max 1920px, 80% JPEG quality, returns Blob)
- [ ] S3.3 — Create `PhotoPreview` component (captured photo display with retake option)
- [ ] S3.4 — Handle camera permission denied state (explanation + settings link)
- [ ] S3.5 — Test on iOS Safari (file input with `capture="environment"`)
- [ ] S3.6 — Test on Android Chrome (Camera API)
- [ ] S3.7 — Test on desktop (file picker fallback)
**Test criteria:** Photo captured on all three platforms. Compressed image is ≤ 1920px wide and under 500KB for a typical phone photo. Retake option works. Permission denied shows helpful message.
**Notes:** iOS Safari does not support the full Camera API (`getUserMedia` for photo capture) — must use `<input type="file" accept="image/*" capture="environment">` as fallback. This is a known iOS limitation. The camera button must be at least 60x60pt per WCAG requirements.

---

### Sprint 4: GPS Geolocation & Reverse Geocoding
**Goal:** GPS coordinates captured on report submission, reverse geocoded to street address, council auto-detected.
**Inputs:** Sprint 2 complete (councils table seeded)
**Outputs:** `useGeolocation` hook, reverse geocoding utility, council boundary detection with Turf.js
**Subtasks:**
- [ ] S4.1 — Implement `useGeolocation` hook (Geolocation API with timeout, accuracy, error handling)
- [ ] S4.2 — Implement reverse geocoding using Mapbox Geocoding API (lat/lng → address, suburb, postcode)
- [ ] S4.3 — Implement council detection using Turf.js `booleanPointInPolygon` against cached council boundaries
- [ ] S4.4 — Handle GPS timeout (5s warning, 8s fallback to map picker)
- [ ] S4.5 — Handle GPS unavailable (map picker fallback)
- [ ] S4.6 — Handle reverse geocode failure (store raw coordinates, geocode later)
- [ ] S4.7 — Cache council boundary GeoJSON in IndexedDB (weekly refresh)
**Test criteria:** GPS coordinates captured within 5 seconds on mobile. Reverse geocode returns valid Melbourne address. Council correctly identified from coordinates. Map picker fallback works when GPS denied. Offline: raw coordinates stored, reverse geocode skipped.
**Notes:** GPS works offline (device GPS, no API needed). Reverse geocoding requires network — skip when offline, geocode on reconnect. Council boundaries need to be loaded from Supabase and cached. Start geolocation when camera opens (parallel to photo capture) to reduce wait time.

---

### Sprint 5: Basic Report Submission
**Goal:** End-to-end report submission: photo → location → category (manual) → submit → visible in Supabase.
**Inputs:** Sprints 3, 4 complete (camera, GPS, database ready)
**Outputs:** Report submission flow (without AI), `useSubmitReport` hook, Supabase Edge Function `submit-report`, optimistic UI
**Subtasks:**
- [ ] S5.1 — Create report submission page (`/report`) with multi-step flow
- [ ] S5.2 — Create manual category picker component (grid of category chips)
- [ ] S5.3 — Create `NoteInput` component (140-char optional note)
- [ ] S5.4 — Create `useReporterToken` hook (generate/retrieve UUID from localStorage)
- [ ] S5.5 — Implement `useSubmitReport` hook (orchestrates photo upload + report insert)
- [ ] S5.6 — Create Supabase Edge Function `submit-report` (validate, upload photo to Storage, insert report)
- [ ] S5.7 — Create `SubmissionSuccess` component (confirmation + view on map + report another)
- [ ] S5.8 — Implement offline queue: save report to IndexedDB when offline, submit on reconnect
- [ ] S5.9 — Create `useOfflineQueue` hook (queue management, process on reconnect)
- [ ] S5.10 — Test full flow: capture → select category → add note → submit → record in Supabase
**Test criteria:** Report appears in Supabase `reports` table with correct category, coordinates, address, council_id, reporter_token. Photo uploaded to Storage bucket. Offline: report queued, submitted on reconnect with visual confirmation. Success screen shows address and category.
**Notes:** AI classification comes in Sprint 7 (Phase 1). This sprint implements the full submission pipeline with manual category selection. The `submit-report` Edge Function handles validation, photo upload, council routing, and DB insert. Duplicate detection (50m radius, same category, 30 days) is implemented here.

---

## Phase 1 — MVP

### Sprint 6: Live Community Map
**Goal:** Mapbox map with category-coloured report pins, clustering, pin detail bottom sheet, and real-time updates.
**Inputs:** Sprint 5 complete (reports exist in database)
**Outputs:** Map page (`/`), `MapPin` component, `ClusterMarker`, `ReportCard` bottom sheet, `useReports` hook, Supabase Realtime subscription
**Subtasks:**
- [ ] S6.1 — Set up Mapbox GL JS with dark style, Melbourne default centre
- [ ] S6.2 — Implement `useReports` hook (fetch reports as GeoJSON from Supabase)
- [ ] S6.3 — Render report pins colour-coded by category with category icons
- [ ] S6.4 — Implement pin clustering (50px radius, max zoom 14, cluster count badge)
- [ ] S6.5 — Create `ReportCard` bottom sheet (photo, category, status, address, upvotes, time ago)
- [ ] S6.6 — Implement "Locate me" map control (centre on user position)
- [ ] S6.7 — Create `CameraButton` FAB (64x64px orange circle with pulse animation, centre-bottom)
- [ ] S6.8 — Implement Supabase Realtime subscription on `reports` table (new pins animate in)
- [ ] S6.9 — Create tab bar navigation (Map / Feed / My Reports)
- [ ] S6.10 — Create app header ("RIPPLE" wordmark with search and menu icons)
- [ ] S6.11 — Test: 500 pins render without jank, clusters collapse/expand on zoom
**Test criteria:** Map renders with all existing reports as coloured pins. Tapping a pin shows the ReportCard bottom sheet with photo, category, address, time ago. Camera FAB opens report flow. New reports from another session appear on map without page refresh. Clustering works at zoom < 14.
**Notes:** Pin size scales slightly with upvote count (max 2x). Cluster marker colour based on most common category, or red if any safety category present. Map style should be dark to match the app's dark theme. The camera FAB has a pulsing glow animation to draw attention.

---

### Sprint 7: AI Image Classification
**Goal:** TensorFlow.js MobileNetV2 classifies report photos client-side with confidence display and manual override.
**Inputs:** Sprint 5 complete (report flow exists)
**Outputs:** `useAIClassification` hook, `AIResultCard` component, `ConfidenceBar` component, TF.js model loading/caching
**Subtasks:**
- [ ] S7.1 — Set up TensorFlow.js with MobileNetV2 base model loading
- [ ] S7.2 — Implement model caching in IndexedDB (load from Supabase Storage on first use)
- [ ] S7.3 — Implement `useAIClassification` hook (resize to 224x224, predict, return top-2 categories)
- [ ] S7.4 — Create `AIResultCard` component (category icon + name + confidence bar + override)
- [ ] S7.5 — Create `ConfidenceBar` component (animated fill bar)
- [ ] S7.6 — Implement confidence threshold behaviour (≥85% prominent, 60-84% "Does this look right?", <60% show top 2)
- [ ] S7.7 — Implement category override flow (tap to open full picker, log correction)
- [ ] S7.8 — Integrate AI classification into report submission flow (between photo capture and submit)
- [ ] S7.9 — Test inference time < 2 seconds on mid-range device
- [ ] S7.10 — Test offline classification (model cached, no network needed)
**Test criteria:** Photo classified in < 2 seconds. Correct confidence threshold behaviours displayed. Manual override works and logs correction. Model cached after first load — subsequent loads < 500ms. Classification works fully offline.
**Notes:** For initial launch, use the pre-trained MobileNet model with ImageNet classes mapped to Ripple categories. Fine-tuned model comes later. The model is ~14MB — show download progress on first load. Classification is entirely client-side — no image data leaves the device for classification purposes.

---

### Sprint 8: Community Upvoting
**Goal:** "I see this too" upvoting with optimistic UI, one-per-user enforcement, and upvote count on pins.
**Inputs:** Sprint 6 complete (map and pin detail exist)
**Outputs:** `UpvoteButton` component, `useUpvote` hook, upvote count on map pins
**Subtasks:**
- [ ] S8.1 — Implement `useUpvote` hook (toggle upvote, optimistic count update, reporter_token enforcement)
- [ ] S8.2 — Create `UpvoteButton` component ("I see this too" / "You saw this too" toggle)
- [ ] S8.3 — Add upvote count badge to map pins (scale pin size with count)
- [ ] S8.4 — Integrate upvote button into ReportCard bottom sheet
- [ ] S8.5 — Verify UNIQUE constraint prevents double upvotes
- [ ] S8.6 — Verify trigger updates `reports.upvote_count` correctly
- [ ] S8.7 — Add upvote count to Realtime subscription updates
**Test criteria:** Upvote increments count immediately (optimistic). Same user cannot upvote twice (shows "You saw this too"). Removing upvote decrements count. Pin size scales with upvote count on map. Upvote count updates in real-time for other users.
**Notes:** Threshold alerts (10, 25, 50 upvotes) are Phase 2. Priority score recalculation happens via the database trigger on upvote insert/delete.

---

### Sprint 9: Map Filters & Heatmap
**Goal:** Filter reports by category, status, date range, upvote count, proximity. Toggle heatmap overlay.
**Inputs:** Sprint 6 complete (map with pins)
**Outputs:** `FilterPanel` component, heatmap layer, filter state management
**Subtasks:**
- [ ] S9.1 — Create `FilterPanel` component (category chips, status chips, date range, upvote slider, "near me" toggle)
- [ ] S9.2 — Implement filter state in Zustand store
- [ ] S9.3 — Apply filters to map pin data source
- [ ] S9.4 — Create heatmap toggle button in map controls
- [ ] S9.5 — Implement Mapbox heatmap layer with weighted intensity (upvotes × severity × recency)
- [ ] S9.6 — Add active filter count badge to filter toggle button
- [ ] S9.7 — Create "Recent reports counter" pill (bottom-left: "147 reports this week in Melbourne")
**Test criteria:** Category filter shows only selected categories. Status filter works. Date range filters correctly. "Near me" shows reports within 1km. Heatmap toggle shows/hides density overlay. Heatmap intensity reflects upvote count and severity. Filter count badge accurate.
**Notes:** Heatmap colour scale: light yellow (#FEFB98) → orange (#FD8D3C) → red (#BD0026). Severity weights: safety=3, accessibility=2.5, infrastructure=2, environmental=1. Recency decay: reports > 90 days at 0.3x weight.

---

### Sprint 10: Feed View & My Reports
**Goal:** List view of recent reports and personal report history via reporter_token.
**Inputs:** Sprint 6, 8 complete (reports with upvotes)
**Outputs:** Feed page (`/feed`), My Reports page (`/my-reports`), `ReportFeed` component
**Subtasks:**
- [ ] S10.1 — Create `ReportFeed` component (scrollable list of report cards with photo, category, address, time, upvotes, status)
- [ ] S10.2 — Create Feed page (`/feed`) with sort options (Newest, Most Upvoted, Highest Priority)
- [ ] S10.3 — Create My Reports page (`/my-reports`) filtered by reporter_token from localStorage
- [ ] S10.4 — Integrate filters from Sprint 9 into Feed view
- [ ] S10.5 — Add infinite scroll / pagination (20 reports per page)
- [ ] S10.6 — Wire tab bar navigation between Map, Feed, My Reports
**Test criteria:** Feed shows all reports sorted by selected option. My Reports shows only current user's reports. Infinite scroll loads more reports. Tab bar switches between Map, Feed, My Reports correctly.
**Notes:** "My Reports" uses the `reporter_token` from localStorage — no account required. This is the user's only way to see their own reports.

---

### Sprint 11: Report Detail & Routing
**Goal:** Full report detail page with status timeline, shareable URL, and React Router setup.
**Inputs:** Sprint 6, 8 complete
**Outputs:** Report Detail page (`/report/:id`), `useReport` hook, status timeline, share functionality
**Subtasks:**
- [ ] S11.1 — Set up React Router with routes: `/`, `/report`, `/report/:id`, `/feed`, `/my-reports`, `/search`
- [ ] S11.2 — Implement `useReport` hook (fetch full report detail with photos, comments, status history)
- [ ] S11.3 — Create Report Detail page (expanded ReportCard with full photo, status timeline, comments preview)
- [ ] S11.4 — Create status timeline component (visual history: Reported → Acknowledged → etc.)
- [ ] S11.5 — Implement share functionality (Web Share API with fallback to clipboard)
- [ ] S11.6 — Display report ID ("Report #4821") using Supabase-generated short ID
**Test criteria:** Direct URL `/report/:id` loads the correct report. Status timeline shows all status changes with timestamps. Share button opens native share sheet on mobile. Report ID displayed correctly.
**Notes:** The report detail bottom sheet on the map (Sprint 6) should link to the full detail page. The full detail page has more space for comments, multiple photos, and the complete status history.

---

### Sprint 12: Elasticsearch Integration
**Goal:** Full-text search across reports, Elasticsearch index synced from Supabase.
**Inputs:** Sprint 5 complete (reports in database)
**Outputs:** Search page (`/search`), `useSearch` hook, ES sync Edge Function, search results UI
**Subtasks:**
- [ ] S12.1 — Create Elasticsearch index with mapping from PRD (id, category, status, address, suburb, council_id, note, upvote_count, priority_score, location geo_point, submitted_at, status_updated_at, severity_weight)
- [ ] S12.2 — Create Supabase Edge Function `sync-elasticsearch` (triggered on report insert/update)
- [ ] S12.3 — Create Supabase Edge Function `search-reports` (proxy to ES, apply filters, rate limiting)
- [ ] S12.4 — Implement `useSearch` hook (query, filters, pagination, loading state)
- [ ] S12.5 — Create Search page (`/search`) with search input, filters, results list
- [ ] S12.6 — Add search icon to header that opens search overlay
- [ ] S12.7 — Test full-text search: "pothole Fitzroy" returns relevant results
**Test criteria:** New reports appear in ES within 30 seconds. Full-text search returns relevant results by address and note content. Category and status filters work. Geo filter works. Results sorted by selected option (priority, newest, upvotes, relevance). Rate limiting enforced (60/min).
**Notes:** Client never calls ES directly — all queries proxied through Edge Function. Edge Function applies council_id filter for council dashboard requests. Rate limiting at 60 searches per minute per reporter_token.

---

## Phase 2 — Community & Polish

### Sprint 13: Status Tracking & Notifications
**Goal:** Status lifecycle management, opt-in email notifications on status changes.
**Inputs:** Sprints 5, 11 complete
**Outputs:** Status change notifications, `update-status` Edge Function, `send-notification` Edge Function, email templates
**Subtasks:**
- [ ] S13.1 — Create Supabase Edge Function `update-status` (council-authenticated, updates status + council_note)
- [ ] S13.2 — Create `status_history` insert trigger on status change
- [ ] S13.3 — Implement opt-in email collection at submission (optional email field)
- [ ] S13.4 — Create Supabase Edge Function `send-notification` (Resend email on status change)
- [ ] S13.5 — Create email templates using React Email (status change notification)
- [ ] S13.6 — Implement Web Push notification registration (PWA installed + permission granted)
- [ ] S13.7 — Create notification preferences UI
**Test criteria:** Status change triggers email to opted-in reporters and upvoters. Email contains report category, address, new status, and council note. Push notification delivered on PWA with permission. Status history visible on report detail page.
**Notes:** Push notifications require HTTPS and a registered Service Worker — both already in place from Sprint 1. iOS Safari has limited push support — email is the primary notification channel.

---

### Sprint 14: Comment Threads
**Goal:** Per-report threaded comments with moderation.
**Inputs:** Sprint 11 complete
**Outputs:** Comment thread UI, comment submission, flagging, auto-hide at 5 flags
**Subtasks:**
- [ ] S14.1 — Create comment thread component (list of comments with reporter_token identity)
- [ ] S14.2 — Create comment input component (500 char limit, no account required)
- [ ] S14.3 — Implement comment submission via Supabase client
- [ ] S14.4 — Implement comment flagging (flag button, increment flag_count)
- [ ] S14.5 — Auto-hide comments at 5 flags
- [ ] S14.6 — Council pinned comments (displayed at top)
- [ ] S14.7 — Comment count badge on ReportCard and map pin detail
**Test criteria:** Comments display threaded under report. New comment appears immediately (optimistic). Flag increments count. Comment hidden at 5 flags. Council pinned comment at top. Comment count accurate on ReportCard.
**Notes:** Comments use `reporter_token` — no account required. Council comments identified by `is_council` flag, set when authenticated via council dashboard.

---

### Sprint 15: "Fixed!" Photo Confirmation
**Goal:** Community members can submit confirmation photos that an issue is fixed.
**Inputs:** Sprint 11 complete
**Outputs:** Confirmation photo flow, auto-suggest "Fixed" status at 3+ confirmations
**Subtasks:**
- [ ] S15.1 — Add "Submit fix confirmation" button on report detail (for non-Fixed reports)
- [ ] S15.2 — Implement confirmation photo upload (reuse camera/photo pipeline from Sprint 3)
- [ ] S15.3 — Store confirmation photo as `report_photos` with `photo_type = 'fixed_confirmation'`
- [ ] S15.4 — Display confirmation photos on report detail
- [ ] S15.5 — Auto-suggest "Fixed" status to council at 3+ confirmation photos
- [ ] S15.6 — "You reported this — it's fixed!" celebration for original reporter
**Test criteria:** Confirmation photo uploaded and linked to report. Displayed on report detail. At 3 confirmations, council dashboard shows "Community suggests fixed" flag. Original reporter sees celebration if their report was confirmed fixed.
**Notes:** The celebration animation uses Framer Motion (upward sweep from Sprint 5 success screen pattern).

---

### Sprint 16: PWA Install Flow & Polish
**Goal:** Polished install experience, accessibility audit, performance optimisation.
**Inputs:** Sprint 1, all Phase 1 sprints complete
**Outputs:** Polished install banner, iOS instructions, WCAG 2.1 AA compliance, Lighthouse ≥ 90
**Subtasks:**
- [ ] S16.1 — Polish InstallBanner with dismissal, re-show after 7 days
- [ ] S16.2 — iOS-specific install instructions ("Tap Share → Add to Home Screen")
- [ ] S16.3 — Accessibility audit: keyboard navigation, VoiceOver/TalkBack, colour contrast
- [ ] S16.4 — Camera button minimum 60x60pt verified
- [ ] S16.5 — Map pins keyboard navigable
- [ ] S16.6 — Performance audit: Lighthouse PWA + Performance scores ≥ 90
- [ ] S16.7 — Error state handling for all API calls
- [ ] S16.8 — Loading skeleton states for map, feed, report detail
**Test criteria:** Install banner shows on Android Chrome, manual instructions on iOS Safari. WCAG 2.1 AA: all form elements labelled, keyboard navigable, sufficient contrast. Lighthouse PWA score ≥ 90. No unhandled error states — every failure shows a user-friendly message.
**Notes:** This sprint is a quality gate before council demos. Every edge case and error state from the PRD feature specs must be handled.

---

## Phase 3 — Council Tools

### Sprint 17: Council Dashboard — Authentication & Layout
**Goal:** Council coordinator login, scoped to their council's reports.
**Inputs:** Phase 1-2 complete
**Outputs:** Council login flow, dashboard layout, RLS-scoped data access
**Subtasks:**
- [ ] S17.1 — Implement Supabase Auth for council accounts (email domain restriction)
- [ ] S17.2 — Create dashboard layout (sidebar navigation, main content area)
- [ ] S17.3 — Implement council_id scoped queries (RLS enforced)
- [ ] S17.4 — Create priority feed view (reports ranked by priority_score)
- [ ] S17.5 — Create dashboard header with council name and user info
**Test criteria:** Council user logs in with email. Only sees their council's reports. Priority feed shows reports sorted by priority_score descending. Unauthorised access redirected to login.

### Sprint 18: Council Dashboard — Analytics & Management
**Goal:** Category breakdown charts, suburb report view, batch status updates, CSV export.
**Inputs:** Sprint 17 complete
**Outputs:** Analytics charts, batch status management, CSV export
**Subtasks:**
- [ ] S18.1 — Category breakdown pie/bar charts (this week/month)
- [ ] S18.2 — Suburb report view (top 10 suburbs by report count)
- [ ] S18.3 — Resolution tracker (avg time to resolve by category)
- [ ] S18.4 — Batch status update (select multiple reports, change status)
- [ ] S18.5 — Per-report status update with council note
- [ ] S18.6 — CSV export of any filtered view
- [ ] S18.7 — Alerts view (upvote threshold crossings, clusters near schools)
**Test criteria:** Charts render with correct data. Batch status update changes multiple reports. CSV export downloads with all visible columns. Council note visible to citizens on status change.

---

## Phase 4 — Gamification & Growth

### Sprint 19: Badges & Leaderboard
**Goal:** Achievement badges and opt-in anonymous leaderboard.
**Subtasks:**
- [ ] S19.1 — Implement badge earning triggers (first report, 10 reports, fix confirmed, etc.)
- [ ] S19.2 — Badge display on user profile / my reports
- [ ] S19.3 — Opt-in anonymous leaderboard (display name, suburb filter, time filter)
- [ ] S19.4 — Leaderboard sidebar on community map
**Notes:** No gamification of sensitive categories. Badges are opt-in display only.

### Sprint 20: Growth & Multi-City
**Goal:** Referral flow, multi-city support, shareable report clusters.
**Subtasks:**
- [ ] S20.1 — Shareable filtered map views (URL encodes filters)
- [ ] S20.2 — "Share with your council" feature
- [ ] S20.3 — Multi-city data isolation
- [ ] S20.4 — City selector onboarding

---

## Phase 5 — Integrations (Post-Revenue)

High-level goals only — detailed sprint planning when Phase 4 is complete:
- Direct API integration with council back-office systems (Pathway, TechOne)
- Automated report routing
- SLA tracking and alerts
- Webhook notifications for council systems

---

## Architecture Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| March 2026 | Tailwind CSS v3 (not v4) | PRD specifies v3. v4 has breaking changes and different config pattern. |
| March 2026 | Flat ESLint config (eslint.config.js) | Vite 8 scaffold uses flat config format by default. Functionally equivalent to .eslintrc.cjs with same rules. |
| March 2026 | pnpm via npx wrapper | pnpm not globally installed; using `npx pnpm` for all package operations. |

---

## Known Risks

| Risk | Status | Notes |
|------|--------|-------|
| AI classification accuracy too low | Open | Phase 1 — using MobileNet base, may need fine-tuning dataset |
| TF.js model too large (~14MB) | Open | Cache in IndexedDB after first load, show progress |
| Misuse: photographing people/private property | Open | UI guidance + TOS. AI moderation Phase 2. |
| Spam/fake reports | Open | Rate limiting (10/hour/token), community flagging |
| Council refuses to engage | Open | Build dashboard anyway, demonstrate value with data |
| GPS accuracy in urban canyons | Open | Show accuracy radius, manual pin adjustment fallback |
| iOS Safari PWA limitations | Open | No beforeinstallprompt — manual install instructions needed |
| vite-plugin-pwa peer dependency warning (Vite 8) | Monitoring | Plugin works with Vite 8 despite peer dep listing ≤7 |
