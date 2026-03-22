# Ripple — Product Requirements Document

> **Version:** 1.0.0  
> **Author:** Bruno Jaamaa  
> **Status:** Active  
> **Last Updated:** March 2026  

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Problem Statement](#2-problem-statement)
3. [Target Users & Personas](#3-target-users--personas)
4. [Goals & Success Metrics](#4-goals--success-metrics)
5. [Scope & Phasing](#5-scope--phasing)
6. [Feature Specifications](#6-feature-specifications)
7. [Technical Architecture](#7-technical-architecture)
8. [Data Models](#8-data-models)
9. [API Contracts](#9-api-contracts)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Design System](#11-design-system)
12. [UI Screen Specifications](#12-ui-screen-specifications)
13. [Privacy & Ethics](#13-privacy--ethics)
14. [Out of Scope](#14-out-of-scope)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Open Questions & Resolved Decisions](#16-open-questions--resolved-decisions)

---

## 1. Product Vision

### 1.1 One-Line Pitch
**Ripple is the civic reporting tool every city needs and no city has: snap a problem, AI classifies it, the community upvotes it, and the council fixes it — in three seconds, anonymously.**

### 1.2 Vision Statement
Cities are full of broken things that everyone can see and nobody reports. The barrier isn't civic indifference — it's friction. The current process takes fifteen minutes, demands personal information, and routes through a website built for compliance rather than use. So problems stay broken. Communities that suffer most from deteriorating infrastructure are the least likely to navigate a government portal designed for someone else.

Ripple eliminates the friction entirely. A photograph is all it takes. AI classifies the problem. GPS captures the location. The report appears on a live community map where neighbours can upvote it, comment on it, and confirm when it's fixed. Councils see a prioritised, geolocated, categorised feed of everything that needs attention — not a pile of unstructured emails and angry phone calls.

This is not another civic tech project that dies because nobody uses it. Ripple is designed for the person standing next to the broken thing, phone already in hand. Three seconds. Done.

### 1.3 Product Positioning
- **Category:** Civic tech / community infrastructure reporting
- **Deployment model:** Progressive Web App (PWA) — no App Store required
- **Business model (long-term):** B2G — free for citizens, licensed council dashboard to local governments
- **Differentiator:** Client-side AI classification (no server cost, works offline), anonymous by default, community upvoting creates social proof, Elasticsearch-powered analytics for councils

### 1.4 North Star Metric
**Weekly reports submitted that transition to "Acknowledged" or "In Progress" status within 7 days.**

This captures both citizen engagement and actual government action — the only outcome that matters.

---

## 2. Problem Statement

### 2.1 The Core Problem
Citizens can see infrastructure problems in their communities. Councils have the budget and mandate to fix them. There is no effective bridge between seeing and fixing.

The current bridge — council reporting portals — fails because:
- Average report time: 15 minutes
- Requires full name, address, phone number
- No social proof (one person reporting a pothole reads as noise)
- No feedback loop (citizens never learn if anything happened)
- Portal discoverability is poor (buried on council websites)
- Not mobile-optimised (designed for desktop, used via phone)
- Language-inaccessible (English-only, dense form language)

The result: Melbourne City Council receives approximately 47,000 reports per year through official channels. An estimated 150,000-200,000 issues are never reported.

### 2.2 The Inequality Dimension
Infrastructure deterioration is not equally distributed. Lower-income suburbs receive less maintenance investment and generate fewer formal reports. This is partly because the communities most affected — renters, non-native English speakers, recent immigrants, people without cars who depend on footpaths and bike lanes — are least likely to navigate a government portal.

Ripple is deliberately designed to be accessible to these users: no English required (AI classifies from the photo), no personal information required (anonymous by default), no knowledge of council boundaries required (GPS auto-routes), no time required (three seconds).

### 2.3 The Council Perspective
Councils don't currently have a consolidated view of community-reported infrastructure issues. They receive reports through multiple fragmented channels (phone, email, portal, social media, councillor offices) with no standardisation, no deduplication, no priority ranking. Maintenance crews are dispatched based on political pressure and schedule, not actual community need.

Ripple's council dashboard changes this with a prioritised, categorised, geolocated view of everything the community has flagged — ranked by upvotes, severity, and time outstanding.

---

## 3. Target Users & Personas

### 3.1 Primary Persona: The Reluctant Reporter
**Name:** Chris, 34, daily bike commuter  
**Context:** Rides past the same pothole every morning. Has thought about reporting it 30 times. Has reported it zero times.  
**Pain:** By the time he's at work, he's forgotten. When he remembers, the council website is too slow. He doesn't want to give his name. He doesn't know which council covers that street.  
**Ripple use case:** Stops at the pothole. Opens Ripple. Taps camera. Snaps. AI says "Pothole (94%)". He taps submit. Done in 3 seconds. He didn't give his name. GPS handled the location. He didn't know what council it was — Ripple does.  
**Key requirement:** Zero-friction reporting. No account required. Report flow completable in under 10 seconds.

### 3.2 Secondary Persona: The Safety-Concerned Parent
**Name:** Mei, 42, primary school mum  
**Context:** Walks her kids to school past broken glass, a dead streetlight, and an overgrown footpath. Reported it by phone once. Was told to "submit it online." Glass is still there three months later.  
**Pain:** She feels unheard. One person's complaint reads as noise. She wants other parents to see this and agree it's a problem.  
**Ripple use case:** Reports the streetlight. Fifteen other parents see the pin near the school and upvote it. The cluster of safety reports near a school with 20+ upvotes triggers a priority alert in the council dashboard. The crew comes within a week.  
**Key requirement:** Upvoting creates social proof and visible urgency. Geographic clustering near schools/hospitals automatically elevates priority.

### 3.3 Tertiary Persona: The International Student / New Arrival
**Name:** Hana, 22, international student from Japan  
**Context:** New to Melbourne. Doesn't know which council covers Brunswick. Doesn't know the English word for the cracked paving that caught her wheel. Doesn't feel confident calling a government number.  
**Pain:** Language and navigation barriers make the existing system inaccessible. She has a phone and can see the problem but has no pathway to report it.  
**Ripple use case:** Opens Ripple. Takes a photo of the cracked footpath. AI classifies: "Damaged Footpath (89%)". She doesn't need to type anything. GPS submits to the right council. She's contributed to the community without needing English.  
**Key requirement:** Language-agnostic. Photo + one tap submits. AI classification eliminates the need to describe the problem in words.

### 3.4 Tertiary Persona: The Wheelchair User / Disability Advocate
**Name:** Jordan, 29, uses a wheelchair  
**Context:** Has reported every broken curb cut, crumbling footpath, and missing tactile indicator in their suburb. Has heard nothing back. Doesn't know if their reports went anywhere.  
**Pain:** Single reports are ignored. They want the community to see what they see every day. They want accountability.  
**Ripple use case:** Reports an accessibility hazard. Tags it "accessibility." It's visible on the map. Other people upvote it. The council dashboard shows a cluster of accessibility reports in this area. Status updates notify Jordan when something moves.  
**Key requirement:** Accessibility category is first-class. Status notifications keep reporters informed. Accessibility reports must meet WCAG within the app itself.

### 3.5 Tertiary Persona: The Active Community Member
**Name:** Deb, 58, neighbourhood association president  
**Context:** Advocates for her area. Wants data, not anecdotes, when she talks to councillors.  
**Pain:** Can't easily aggregate what the community is experiencing. Councillors dismiss individual complaints.  
**Ripple use case:** Points councillors to a Ripple report cluster: "47 reports in Fitzroy North in the past 30 days, 18 of them accessibility issues." That's not an anecdote. That's evidence.  
**Key requirement:** Public shareable links to report clusters / filtered views. Data is legible to non-technical users.

### 3.6 B2G Persona: Council Maintenance Coordinator
**Name:** Paul, 51, City of Melbourne maintenance coordinator  
**Context:** Receives reports via phone, email, portal, and councillor forwards. No way to prioritise or see patterns. Dispatches crews on gut feel.  
**Pain:** Unstructured input, no analytics, no deduplication, no way to see geographic concentration.  
**Ripple use case:** Opens council dashboard. Sees a heatmap of report density. Filters by "Safety" category this week. Sees 12 reports clustered around one intersection. Assigns a crew. Marks reports "In Progress." Citizens get notified. Dashboard tracks resolution times.  
**Key requirement:** Prioritised, categorised, geolocated feed. Status management. Export to CSV for council systems.

---

## 4. Goals & Success Metrics

### 4.1 Product Goals

| Goal | Description |
|------|-------------|
| G1 | Citizens can submit a meaningful report in under 10 seconds |
| G2 | AI classification is accurate enough to be trusted without manual correction > 70% of the time |
| G3 | Community upvoting creates visible social proof that drives council action |
| G4 | Councils can triage and prioritise reports from a single dashboard |
| G5 | The product is usable without an account and without English proficiency |
| G6 | Anonymous by default — zero personal information required to report |

### 4.2 Launch Metrics (Month 1)

| Metric | Target |
|--------|--------|
| Daily Active Users | 100+ (Melbourne pilot) |
| Reports submitted per day | 50+ |
| Average report completion time | < 10 seconds |
| AI classification accuracy (correct category, no correction needed) | > 70% |
| Upvote engagement rate (% of reports with at least 1 upvote) | > 30% |
| Reports acknowledged by council within 7 days | > 15% (requires council partnership) |

### 4.3 Growth Metrics (Month 3)

| Metric | Target |
|--------|--------|
| Councils onboarded | 3+ Melbourne area councils |
| Reports submitted total | 2,000+ |
| Report-to-acknowledgement rate | > 40% |
| WAU | 500+ |
| AI classification accuracy | > 80% (with fine-tuning) |

### 4.4 North Star Metric Definition
A report counts toward the North Star if: submitted → status changes to "Acknowledged" or "In Progress" within 7 days. This is tracked as a percentage of total reports submitted in a rolling 7-day window.

---

## 5. Scope & Phasing

### 5.1 Phase 0 — Foundation (Weeks 1-2)
Project scaffolding, PWA infrastructure, Supabase setup (auth, DB, storage), Camera API integration, GPS geolocation + reverse geocoding, basic report submission. End state: a user can take a photo and submit a report with a location.

### 5.2 Phase 1 — MVP (Weeks 3-6)
AI image classification (TensorFlow.js + MobileNet fine-tuned), live community map (Mapbox with pins, clustering, heatmap), upvoting, status tracking, council auto-routing, Elasticsearch integration. End state: full reporting flow from snap to council dashboard.

### 5.3 Phase 2 — Community & Polish (Weeks 7-9)
Push notifications on status changes, comment threads, "Fixed!" photo confirmation, PWA install flow, accessibility compliance, performance optimisation, error states. End state: a product confident enough to demo to a council.

### 5.4 Phase 3 — Council Tools (Weeks 10-14)
Full council dashboard, priority scoring algorithm, weekly auto-generated summary reports, CSV export, batch status updates, council boundary management. End state: a B2G product with a paying council customer.

### 5.5 Phase 4 — Gamification & Growth (Weeks 15-20)
Badges, neighbourhood leaderboard, community streaks, "Fixed!" celebrations, referral flow, multi-city expansion.

### 5.6 Phase 5 — Integrations (Post-revenue)
Direct API integration with council back-office systems (e.g. Pathway, TechOne). Automated report routing. SLA tracking and alerts.

---

## 6. Feature Specifications

### 6.1 F001 — Instant Photo Reporting

**Priority:** P0 | **Phase:** 0

**Description:** The core interaction. Open app → tap camera → snap → submit. The entire flow must complete in under 10 seconds. No account required.

**Report Flow:**
```
Step 1: User opens Ripple PWA
Step 2: Taps large camera button (primary CTA, centre of home screen)
Step 3: Native camera opens (or file picker on desktop)
Step 4: User takes photo
Step 5: Photo previewed. AI classification begins (client-side, TensorFlow.js)
Step 6: GPS coordinates captured simultaneously (already started when camera opened)
Step 7: AI result displayed: "[Category] ([confidence]%)"
Step 8: User confirms or corrects category
Step 9: User optionally adds a one-line note (not required)
Step 10: Tap "Submit Report"
Step 11: Report appears on map immediately (optimistic UI)
Step 12: Success confirmation + share option
```

**GPS & Location:**
- Geolocation starts when camera opens (reduces wait time)
- Reverse geocoded to street address: `{street_number} {street_name}, {suburb}, {state}`
- Council/municipality auto-detected from coordinates using polygon boundary lookup (seeded in Supabase from ABS Mesh Block data)
- If GPS unavailable: map picker fallback (user taps location on map)
- If reverse geocode fails: display raw coordinates, report still submits

**Anonymous Reporting:**
- No account required for basic reporting
- No name, email, phone, or address collected
- Anonymous reporter assigned a random `reporter_token` (UUID, stored in localStorage, never linked to identity)
- `reporter_token` allows the same user to see their own reports history and receive status notifications without an account

**Photo Handling:**
- Compressed client-side to max 1920px and 80% JPEG quality before upload (reduce bandwidth and storage)
- Uploaded to Supabase Storage in `reports/{year}/{month}/` path
- Original filename replaced with UUID to prevent fingerprinting
- Public read URL stored in report record (photos are publicly viewable — they show public infrastructure)

**Optional Fields:**
- Short note (max 140 chars): "This has been here for 3 months"
- Additional photos (up to 3 total)

**Edge Cases:**
- No camera permission: show explanation + link to device settings
- Photo too dark / blurry: warn user, allow submission anyway (human judgement > AI rejection)
- GPS timeout > 5 seconds: show "Getting location..." with map picker fallback at 8 seconds
- Offline: queue report locally, submit when connection restores (show "Queued — will submit when online")
- Duplicate detection: if a report with same category exists within 50m in last 30 days, show "Similar report nearby" — let user choose to add their upvote to existing report instead

---

### 6.2 F002 — AI Image Classification

**Priority:** P0 | **Phase:** 1

**Description:** Client-side image classification using TensorFlow.js with a fine-tuned MobileNet model. Classifies the submitted photo into a predefined infrastructure category with a confidence score. No server cost, works offline.

**Categories:**
| Category | Display Name | Map Colour | Examples |
|----------|-------------|------------|---------|
| `pothole` | Pothole / Road Damage | Red | Potholes, cracked asphalt, sunken manhole covers |
| `streetlight` | Broken Streetlight | Orange | Dead streetlights, damaged poles |
| `graffiti` | Graffiti / Vandalism | Purple | Graffiti on public property (not private buildings) |
| `signage` | Damaged Signage | Orange | Broken/graffiti-covered road signs, missing signs |
| `accessibility` | Accessibility Hazard | Blue | Broken curb cuts, missing tactile indicators, blocked ramps |
| `dumping` | Illegal Dumping | Brown | Abandoned furniture, rubbish piles on public land |
| `water` | Water / Drainage Issue | Teal | Leaking hydrants, blocked drains, standing water |
| `tree` | Dangerous Tree | Green-dark | Fallen branches, dangerously leaning trees on public land |
| `footpath` | Damaged Footpath | Red-orange | Cracked/uneven footpath, trip hazards |
| `other` | Other Infrastructure | Grey | Anything not fitting above categories |

**TensorFlow.js Implementation:**
- Base model: MobileNetV2 (pre-trained on ImageNet, ~14MB)
- Transfer learning: fine-tuned final layers on a curated dataset of ~500 images per category
- Model loaded from Supabase Storage on first use, cached in browser via IndexedDB
- Classification runs entirely in the browser — no image data ever sent to a classification server
- Input: resized to 224x224px before inference (standard MobileNet input)
- Output: category label + confidence score (0-1)
- Inference time target: < 2 seconds on a mid-range Android phone

**Confidence Thresholds:**
| Confidence | Behaviour |
|------------|-----------|
| >= 85% | Display result prominently, "Submit" is primary CTA |
| 60-84% | Display result with "Does this look right?" prompt |
| < 60% | Display top 2 results, ask user to confirm which is correct |
| Any | User can always override — category selector is always accessible |

**Manual Override:**
- User can tap the category chip to open a full category picker at any confidence level
- If user overrides AI suggestion: log the correction (used for future model fine-tuning)
- Manual category selection is always available as fallback

**Model Updates:**
- Phase 1: Bundled model, updated with app deployments
- Phase 2: Model served from Supabase Storage, independently updatable without app redeployment
- Phase 3: Retraining pipeline using corrected classifications as training data

**Privacy Note:** Images are classified entirely on-device. The raw photo never leaves the device for classification purposes. Only the final compressed image is uploaded to Supabase Storage after the user taps "Submit."

---

### 6.3 F003 — Live Community Map

**Priority:** P0 | **Phase:** 1

**Description:** A Mapbox GL JS map showing all reports as colour-coded pins. The primary "browse" experience. Supports clustering, heatmap overlay, and pin detail cards.

**Map Modes:**
1. **Pin mode (default):** Individual report markers, clustered at low zoom
2. **Heatmap mode (toggle):** Density overlay showing concentration of reports

**Pin Appearance:**
- Colour by category (see F002 category table)
- Icon: category-specific SVG icon inside the coloured circle
- Size: scales slightly with upvote count (more upvotes = slightly larger pin, max 2x)
- Clustering: pins within 50px radius cluster at zoom < 14. Cluster marker shows count.
- Cluster colour: based on most common category in cluster, or red if any Safety category present

**Pin Detail Card (on tap):**
- Photo thumbnail (tap to full-screen)
- Category badge + label
- Street address
- Time since reported: "3 hours ago", "2 days ago"
- Upvote count + "I see this too" button
- Status badge: Reported / Acknowledged / In Progress / Fixed
- Short note (if provided)
- Comment count + "View discussion" link
- Report ID (for reference: "Report #4821")

**Heatmap Mode:**
- Toggle button in map controls
- Intensity weighted by: `upvote_count * severity_weight * recency_weight`
- `severity_weight`: safety=3, accessibility=2.5, infrastructure=2, environmental=1
- `recency_weight`: decays over time, reports > 90 days old at 0.3x weight
- Colour scale: light yellow (low density) -> orange -> red (high density)

**Map Filters (filter panel):**
- By category (multi-select chips)
- By status (Reported / Acknowledged / In Progress / Fixed)
- By date range (last 7d / 30d / 90d / all time)
- By min upvote count (slider: 0 to 50+)
- "Show only near me" (within 1km of current location)

**Map Controls:**
- Locate me (centres on user position)
- Heatmap toggle
- Filter toggle
- Zoom +/-
- "Report an issue" FAB (floating action button, always visible)

**Real-time Updates:**
- Supabase Realtime subscription on `reports` table
- New reports appear on map without page refresh (marker animates in)
- Status changes update pin appearance in real-time

---

### 6.4 F004 — Community Upvoting

**Priority:** P0 | **Phase:** 1

**Description:** "I see this too" mechanism. Allows citizens to add weight to existing reports without submitting a duplicate. Core to the social proof model.

**Behaviour:**
- Tap "I see this too" on any report pin card
- Upvote count increments immediately (optimistic UI)
- `reporter_token` stored — same user cannot upvote the same report twice
- If user has already upvoted: button shows "You saw this too" (filled), tap again to remove
- Upvote count visible on pin (badge) and pin detail card
- Upvote count drives priority scoring in council dashboard

**Threshold Alerts:**
- When a report crosses 10 upvotes: notify all previous upvoters ("This issue now has 10+ people who've seen it")
- When a report crosses 25 upvotes: auto-elevate to "High Priority" tag, flag in council dashboard
- When a report crosses 50 upvotes: council dashboard sends email alert to relevant coordinator (Phase 2)

**Priority Score Formula:**
```
priority_score = (upvote_count * 2) 
              + (severity_weight * 10)    // safety=3, accessibility=2.5, infra=2, enviro=1
              + (days_outstanding * 0.5)  // age penalty
              - (status_progress * 20)   // acknowledged=-20, in_progress=-40
```

Higher score = more urgent in council dashboard.

---

### 6.5 F005 — Status Tracking & Notifications

**Priority:** P1 | **Phase:** 2

**Description:** Every report moves through a defined status lifecycle. Citizens can opt-in to notifications on status changes for their reports and upvoted reports.

**Status Lifecycle:**
```
Reported -> Acknowledged -> In Progress -> Fixed
               |                |
               v                v
           Declined          Won't Fix
```

| Status | Who sets it | Meaning |
|--------|------------|---------|
| Reported | System | Report submitted, not yet seen by council |
| Acknowledged | Council | Council has seen the report and logged it |
| In Progress | Council | Crew assigned or scheduled |
| Fixed | Council or Community | Issue resolved |
| Declined | Council | Not council's responsibility (e.g. private property) |
| Won't Fix | Council | Acknowledged but not actioned (with reason) |

**Status Change Notifications (opt-in):**
- User provides email at submission (optional) or in account settings
- Notification triggers: Acknowledged, In Progress, Fixed, Declined
- Email template: "Your report of [Category] at [Address] has been [Status]. [Optional: Council note]"
- Push notification (if PWA installed + permission granted): same content
- No notification sent for Ripple-internal status updates (e.g. upvote threshold crossing)

**"Fixed!" Community Confirmation:**
- Any user can submit a photo confirming an issue is fixed (no account required)
- Submitted as a "confirmation photo" linked to the original report
- If original reporter's `reporter_token` matches: triggers "You reported this — it's fixed!" celebration
- Report auto-suggests "Fixed" status to council if 3+ confirmation photos submitted

---

### 6.6 F006 — Elasticsearch Integration

**Priority:** P1 | **Phase:** 1

**Description:** Elasticsearch provides full-text search across all reports, analytics for the council dashboard, and powers the trending/search features in the community feed.

**Use Cases:**
1. **Full-text search:** Search report notes and addresses — "pothole Fitzroy North"
2. **Category analytics:** Count of reports by category per suburb per week
3. **Trending issues:** Most reported category in the last 7 days by suburb
4. **Resolution time analytics:** Average time from Reported to Fixed, by category and council
5. **Council dashboard priority feed:** Pre-sorted, pre-filtered reports for council coordinators

**Index Schema:**
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "category": { "type": "keyword" },
      "status": { "type": "keyword" },
      "address": { "type": "text", "analyzer": "standard" },
      "suburb": { "type": "keyword" },
      "council_id": { "type": "keyword" },
      "note": { "type": "text", "analyzer": "standard" },
      "upvote_count": { "type": "integer" },
      "priority_score": { "type": "float" },
      "location": { "type": "geo_point" },
      "submitted_at": { "type": "date" },
      "status_updated_at": { "type": "date" },
      "severity_weight": { "type": "float" }
    }
  }
}
```

**Sync Strategy:**
- Supabase -> Elasticsearch sync via Edge Function triggered on report insert/update
- Near real-time: < 30 second lag from Supabase to ES index
- Full re-index nightly as safety net (handles any missed updates)

**Search API (via Supabase Edge Function proxy):**
- Client never calls Elasticsearch directly — all queries proxied through Edge Function
- Edge Function applies council_id filter for council dashboard queries (RLS equivalent)
- Rate limiting: 60 search requests per minute per reporter_token

---

### 6.7 F007 — Council Dashboard

**Priority:** P1 (speculative build) | **Phase:** 3

**Description:** Authenticated dashboard for council maintenance coordinators. Separate subdomain `admin.ripple.app`.

**Views:**
| View | Description |
|------|-------------|
| Priority Feed | Reports ranked by `priority_score`, filterable by category/suburb/date |
| Heatmap | Geographic density of reports by category |
| Category Breakdown | Pie/bar charts: report distribution by type this week/month |
| Suburb Report | Top 10 suburbs by report count and unresolved reports |
| Resolution Tracker | Avg time to resolve by category. SLA tracking. |
| Search | Elasticsearch-powered full-text search with geo filter |
| Export | CSV export of any filtered view |
| Alerts | Reports crossing upvote thresholds, clusters near schools/hospitals |

**Status Management:**
- Batch status update: select multiple reports, update status at once
- Per-report status + optional council note (displayed to citizens)
- "Assign to crew" (Phase 3): link report to internal crew ticket number

**Access Control:**
- Council email domain restricted login (Supabase Auth)
- Coordinator sees only their council's reports (RLS on `council_id`)
- Read-only analyst role (can view, cannot update status)
- Admin role (can manage user accounts for the council)

---

### 6.8 F008 — Gamification & Community Features

**Priority:** P2 | **Phase:** 4

**Description:** Opt-in community layer adding recognition and engagement for active reporters.

**Badges:**
| Badge | Trigger |
|-------|---------|
| First Report | Submit first report |
| 10 Reports | 10 total submissions |
| Fix Confirmed | One of your reports marked Fixed |
| Safety Spotter | 5 safety category reports |
| Accessibility Advocate | 5 accessibility reports |
| Neighbourhood Watch | 25 reports in the same suburb |

**Leaderboard:**
- Opt-in anonymous leaderboard (display name chosen by user, not real name)
- Ranked by: reports submitted, upvotes given, fixes confirmed
- Filtered by suburb and time period
- Shown on community map sidebar

**Comment Threads:**
- Per-report comment thread (no account required, uses `reporter_token`)
- Threaded replies
- Moderated: reports can flag comments, auto-hide after 5 flags
- Council can pin official comments to reports ("We've scheduled this for repair on 14 April")

---

### 6.9 F009 — PWA Install Flow

**Priority:** P0 | **Phase:** 0

**Description:** Ripple is a PWA. No App Store required. Install to home screen for near-native experience.

**PWA Manifest:**
```json
{
  "name": "Ripple",
  "short_name": "Ripple",
  "description": "See a problem. Snap it. We'll fix it.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0D1117",
  "theme_color": "#E85D04",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Offline Behaviour:**
- App shell cached by Service Worker
- Last-seen map tiles cached (Mapbox)
- Reports queued locally (IndexedDB) when offline, submitted on reconnect
- Cached feed of recent reports visible offline
- "You're offline — reports will submit when you reconnect" banner

---

## 7. Technical Architecture

### 7.1 High-Level Architecture

```
[User's Phone]
    |
    +-- PWA (React 18 + TypeScript + Vite)
    |       +-- Camera API (photo capture)
    |       +-- TensorFlow.js + MobileNetV2 (client-side classification)
    |       +-- Turf.js (council boundary point-in-polygon)
    |       +-- Mapbox GL JS (community map, pins, clustering, heatmap)
    |       +-- Supabase JS Client (realtime, storage, auth)
    |       +-- Service Worker (offline queue, asset caching)
    |
    v
[Supabase]
    +-- Auth (anonymous sessions + optional email accounts)
    +-- Postgres
    |       +-- reports (core table)
    |       +-- upvotes
    |       +-- comments
    |       +-- report_photos
    |       +-- councils (boundaries + contact info)
    |       +-- council_boundaries (GeoJSON polygon per council)
    |       +-- status_history
    |       +-- user_notifications (opt-in emails)
    |       +-- badges_earned
    +-- Storage
    |       +-- reports/{year}/{month}/{uuid}.jpg
    |       +-- ml-models/mobilenet-ripple-v1.bin (TF.js model)
    +-- Edge Functions (Deno)
    |       +-- submit-report (validation, council routing, ES sync)
    |       +-- update-status (council auth, status change, notifications)
    |       +-- send-notification (email via Resend)
    |       +-- sync-elasticsearch (triggered on report changes)
    +-- Realtime
            +-- reports:{suburb_slug} (new report pins on map)
            +-- report:{id} (status updates for a specific report)

[Elasticsearch]
    +-- reports index (full-text search + analytics)
    +-- Synced from Supabase via Edge Function

[Vercel]
    +-- Frontend deployment (CDN)
    +-- admin.ripple.app (council dashboard)

[Mapbox]
    +-- Vector tiles, clustering, heatmap layer, geocoding API

[Nominatim / Google Geocoding API]
    +-- Reverse geocoding (lat/lng -> street address + suburb)

[Resend]
    +-- Transactional email (status notification emails)
```

### 7.2 Report Submission Pipeline

```
Step 1: User captures photo (Camera API)
Step 2: TensorFlow.js classifies image (client-side, < 2 sec)
Step 3: Geolocation API captures coordinates (parallel to Step 2)
Step 4: Council determined via Turf.js point-in-polygon against council_boundaries
Step 5: Reverse geocode lat/lng -> street address (Mapbox Geocoding API)
Step 6: User confirms/corrects category, optionally adds note
Step 7: Client compresses image (max 1920px, 80% JPEG)
Step 8: POST to Supabase Edge Function submit-report:
        - Validates required fields
        - Checks duplicate (same category within 50m in last 30 days)
        - Uploads photo to Supabase Storage
        - Inserts report record to Postgres
        - Triggers Elasticsearch sync (async, non-blocking)
        - Returns report_id + map pin data
Step 9: Report appears on map (optimistic UI update via Realtime)
Step 10: Success confirmation shown to user
```

### 7.3 AI Classification Pipeline

```
App init:
  Check IndexedDB for cached TF.js model
  If not cached: fetch from Supabase Storage (ml-models/mobilenet-ripple-v1/)
  Load model into TensorFlow.js

On photo capture:
  Resize image to 224x224 (MobileNet standard input)
  Run model.predict() in browser
  Get top-2 predictions with confidence scores
  Display result to user
  Record prediction + confidence for potential fine-tuning data
```

### 7.4 Council Routing

```
On submission, client determines council via:
  Load council_boundaries GeoJSON (cached from Supabase, updated weekly)
  Turf.js booleanPointInPolygon(userLocation, councilPolygon)
  Match to council record in councils table
  council_id attached to report record
  Council dashboard query filters by council_id (RLS enforced)
```

### 7.5 Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | React 18 + TypeScript (strict) | Type safety, component model |
| Build | Vite + vite-plugin-pwa | PWA manifest, Service Worker |
| Styling | Tailwind CSS v3 | Utility-first, responsive |
| Map | Mapbox GL JS v3 | Clustering, heatmap, geocoding |
| AI/ML | TensorFlow.js + MobileNetV2 | Client-side, no server cost, offline capable |
| Search | Elasticsearch | Full-text search, analytics, aggregations |
| Backend | Supabase (Auth + Postgres + Storage + Realtime) | All-in-one, RLS, Edge Functions |
| Edge Functions | Deno (Supabase) | Validation, ES sync, notifications |
| Email | Resend | Status notification transactional email |
| Geocoding | Mapbox Geocoding API | Reverse geocode lat/lng to address |
| Geo utilities | Turf.js | Point-in-polygon (council boundary detection) |
| Animations | Framer Motion | Report submission flow, pin animations |
| Offline queue | IndexedDB (idb library) | Queue reports when offline |
| Deployment | Vercel | CDN, preview URLs, Edge middleware |
| Package manager | pnpm | Fast, efficient |

---

## 8. Data Models

### 8.1 `councils`
```sql
CREATE TABLE councils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,              -- 'city-of-melbourne'
  name TEXT NOT NULL,                    -- 'City of Melbourne'
  state TEXT NOT NULL DEFAULT 'VIC',
  contact_email TEXT,                    -- dashboard notification email
  dashboard_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 `council_boundaries`
```sql
CREATE TABLE council_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  council_id UUID REFERENCES councils(id),
  polygon JSONB NOT NULL,                -- GeoJSON MultiPolygon
  source TEXT DEFAULT 'ABS',            -- data source
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.3 `reports` (core table)
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_token TEXT NOT NULL,          -- anon UUID from localStorage, never an identity
  council_id UUID REFERENCES councils(id),
  category TEXT NOT NULL CHECK (category IN (
    'pothole', 'streetlight', 'graffiti', 'signage',
    'accessibility', 'dumping', 'water', 'tree', 'footpath', 'other'
  )),
  -- AI Classification
  ai_category TEXT,                      -- what AI predicted (may differ from final category)
  ai_confidence NUMERIC(4,3),            -- 0-1
  user_corrected_ai BOOLEAN DEFAULT FALSE,
  -- Location
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,                          -- reverse geocoded street address
  suburb TEXT,
  postcode TEXT,
  -- Content
  note TEXT CHECK (char_length(note) <= 140),
  -- Status
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN (
    'reported', 'acknowledged', 'in_progress', 'fixed', 'declined', 'wont_fix'
  )),
  council_note TEXT,                     -- council's public note on status change
  priority_score NUMERIC(8,2) DEFAULT 0,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status_updated_at TIMESTAMPTZ,
  fixed_at TIMESTAMPTZ,
  CONSTRAINT valid_coordinates CHECK (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);

-- Indexes
CREATE INDEX idx_reports_council ON reports(council_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_location ON reports USING GIST(ll_to_earth(lat, lng));
CREATE INDEX idx_reports_submitted ON reports(submitted_at DESC);
CREATE INDEX idx_reports_priority ON reports(priority_score DESC);
CREATE INDEX idx_reports_suburb ON reports(suburb);

-- Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
-- Public read: all reports (photos are on public infrastructure)
CREATE POLICY "Public read" ON reports FOR SELECT USING (true);
-- Public insert: anyone can submit
CREATE POLICY "Public insert" ON reports FOR INSERT WITH CHECK (true);
-- Council update: only council staff can update status fields
CREATE POLICY "Council update" ON reports FOR UPDATE
  USING (auth.jwt() ->> 'council_id' = council_id::text)
  WITH CHECK (auth.jwt() ->> 'council_id' = council_id::text);
```

### 8.4 `report_photos`
```sql
CREATE TABLE report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,            -- Supabase Storage path
  public_url TEXT NOT NULL,
  photo_type TEXT DEFAULT 'original' CHECK (photo_type IN ('original', 'additional', 'fixed_confirmation')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.5 `upvotes`
```sql
CREATE TABLE upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  reporter_token TEXT NOT NULL,          -- anon identifier
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, reporter_token)      -- one upvote per person per report
);

-- Trigger: update reports.upvote_count and priority_score on upvote insert/delete
CREATE OR REPLACE FUNCTION update_upvote_count() RETURNS TRIGGER AS $$
BEGIN
  UPDATE reports SET
    upvote_count = (SELECT COUNT(*) FROM upvotes WHERE report_id = NEW.report_id),
    priority_score = calculate_priority(report_id)
  WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 8.6 `comments`
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  reporter_token TEXT NOT NULL,
  is_council BOOLEAN DEFAULT FALSE,      -- council staff comment
  is_pinned BOOLEAN DEFAULT FALSE,       -- council can pin their comments
  body TEXT NOT NULL CHECK (char_length(body) <= 500),
  flag_count INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT FALSE,          -- auto-hidden at 5 flags
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.7 `status_history`
```sql
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT,                       -- 'council' | 'community' | 'system'
  council_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.8 `user_notifications`
```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_token TEXT NOT NULL,
  notification_type TEXT CHECK (notification_type IN ('email', 'push')),
  email TEXT,                            -- only for email type
  push_subscription JSONB,              -- Web Push subscription
  report_id UUID REFERENCES reports(id),-- which report to notify about
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.9 `badges_earned`
```sql
CREATE TABLE badges_earned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_token TEXT NOT NULL,
  badge_slug TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reporter_token, badge_slug)
);
```

---

## 9. API Contracts

### 9.1 Edge Function: `POST /functions/v1/submit-report`

**Request:**
```typescript
interface SubmitReportRequest {
  category: ReportCategory;
  ai_category: ReportCategory;
  ai_confidence: number;
  user_corrected_ai: boolean;
  lat: number;
  lng: number;
  note?: string;
  reporter_token: string;
  photo_base64: string;      // compressed client-side before sending
  additional_photos?: string[];
}
```

**Response:**
```typescript
interface SubmitReportResponse {
  report_id: string;
  address: string;
  suburb: string;
  council_name: string;
  duplicate_nearby?: {       // populated if similar report within 50m exists
    report_id: string;
    upvote_count: number;
    address: string;
  };
  map_pin: MapPin;
}
```

### 9.2 Edge Function: `POST /functions/v1/update-status`

Council-authenticated. Updates report status with optional note.

```typescript
interface UpdateStatusRequest {
  report_id: string;
  new_status: ReportStatus;
  council_note?: string;
}
```

### 9.3 Edge Function: `POST /functions/v1/search-reports`

Proxies to Elasticsearch. Applies council_id filter for council users.

```typescript
interface SearchReportsRequest {
  query?: string;
  category?: ReportCategory[];
  status?: ReportStatus[];
  suburb?: string;
  council_id?: string;       // auto-applied for council dashboard requests
  date_from?: string;
  date_to?: string;
  min_upvotes?: number;
  geo_filter?: { lat: number; lng: number; radius_km: number; };
  from?: number;             // pagination offset
  size?: number;             // page size, default 20
  sort?: 'priority' | 'newest' | 'upvotes' | 'relevance';
}
```

### 9.4 Supabase Realtime Channels

**`reports:{suburb_slug}`** (Server -> Client)
```typescript
interface NewReportEvent {
  type: 'INSERT';
  record: MapPin;           // lightweight pin data, not full report
}
```

**`report:{report_id}`** (Server -> Client)
```typescript
interface ReportUpdateEvent {
  type: 'UPDATE';
  record: { id: string; status: ReportStatus; upvote_count: number; priority_score: number; };
}
```

### 9.5 Frontend Hooks
```typescript
useCameraCapture(): { photo, capture, reset, error }
useAIClassification(photo: File | null): { category, confidence, isClassifying, override }
useGeolocation(): { lat, lng, address, suburb, council, isLocating, error }
useSubmitReport(): { submit, isSubmitting, result, error }
useReports(filters: ReportFilters): Report[]
useReport(id: string): ReportDetail
useUpvote(reportId: string): { upvoteCount, hasUpvoted, toggle }
useSearch(query: SearchReportsRequest): { results, total, isSearching }
useRealtimeReports(suburbSlug: string): void  // subscribes and updates map
useOfflineQueue(): { queue, processQueue, queueLength }
```

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Metric | Target |
|--------|--------|
| App load (4G mobile) | < 3 seconds |
| Time from camera open to AI result | < 3 seconds |
| Report submission (photo upload) | < 5 seconds on 4G |
| Map render with 500 pins | < 2 seconds |
| Elasticsearch search response | < 500ms |
| TF.js model load (first time) | < 5 seconds on 4G (cached after) |
| TF.js model load (cached) | < 500ms |

### 10.2 Accessibility (WCAG 2.1 AA)
- Camera button minimum 60x60pt (primary action, oversized target)
- All form elements labelled
- Category picker usable with VoiceOver / TalkBack
- Map pins keyboard navigable (tab through markers)
- Colour never the only differentiator — all pins have category icons
- Report submission flow fully completable via keyboard
- Status notifications available via email (not only push)

### 10.3 Security
- Reporter tokens: UUID stored in localStorage, never linked to identity
- Photo storage: public read URLs (infrastructure photos are public), private write
- Council dashboard: Supabase Auth + JWT, council_id scoped via RLS
- Elasticsearch proxy: Edge Function applies access control, clients never query ES directly
- Rate limiting: 10 reports per reporter_token per hour (anti-spam)
- NSFW detection: Phase 2 — flag potentially inappropriate photos before public display

### 10.4 Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 100+ Android | Full (primary target) |
| Safari 15+ iOS | Full (camera API, PWA with limitations) |
| Firefox 100+ | Full |
| Samsung Internet | Full |

### 10.5 Offline Capability
- Service Worker caches: app shell, TF.js model, council boundary GeoJSON, recent map tiles
- IndexedDB queue: reports submitted while offline, uploaded on reconnect
- Cached feed: last 50 reports visible offline
- AI classification: fully offline (model cached client-side)
- GPS: works offline (device GPS, no API needed)
- Reverse geocoding: skipped if offline, raw coordinates stored, geocoded on reconnect

---

## 11. Design System

### 11.1 Visual Identity
Ripple is urgent, civic, and human. It lives in the real world — on footpaths, at intersections, in the moment of noticing something wrong. The aesthetic is high-contrast, action-forward, and legible in harsh outdoor lighting conditions. The camera is the hero of the interface. Everything else gets out of the way.

Dark base (outdoor legibility, reduces glare). A singular urgent orange as the action colour (reporting, submitting, CTA). Category colours for map pins are vivid and distinguishable by people with common forms of colour blindness (supplemented by icons).

### 11.2 Colour Palette

```css
/* ── Base ── */
--color-bg-primary: #0D1117;        /* GitHub-dark black — main background */
--color-bg-secondary: #161B22;      /* Card backgrounds */
--color-bg-elevated: #21262D;       /* Bottom sheets, elevated panels */
--color-bg-overlay: rgba(13,17,23,0.90);
--color-border: #30363D;
--color-border-bright: #484F58;

/* ── Text ── */
--color-text-primary: #F0F6FC;      /* High-contrast white */
--color-text-secondary: #8B949E;    /* Muted labels */
--color-text-tertiary: #484F58;     /* Placeholders */

/* ── Brand / Action ── */
--color-action: #E85D04;            /* Urgent orange — primary CTA */
--color-action-hover: #F48C06;      /* Lighter orange on hover */
--color-action-glow: rgba(232,93,4,0.3);

/* ── Status ── */
--color-status-reported: #8B949E;   /* Grey */
--color-status-acknowledged: #388BFD; /* Blue */
--color-status-in-progress: #F0883E; /* Orange */
--color-status-fixed: #3FB950;      /* Green */
--color-status-declined: #F85149;   /* Red */

/* ── Category Colours (map pins) ── */
--color-cat-pothole: #F85149;       /* Red */
--color-cat-streetlight: #F0883E;   /* Orange */
--color-cat-graffiti: #BC8CFF;      /* Purple */
--color-cat-signage: #F0883E;       /* Orange */
--color-cat-accessibility: #388BFD; /* Blue */
--color-cat-dumping: #986B4A;       /* Brown */
--color-cat-water: #39D0D8;         /* Teal */
--color-cat-tree: #3FB950;          /* Green */
--color-cat-footpath: #E3B341;      /* Amber */
--color-cat-other: #8B949E;         /* Grey */

/* ── Upvote ── */
--color-upvote: #F0883E;            /* Orange — matches action colour */
--color-upvote-active: #E85D04;

/* ── Heatmap ── */
/* CSS custom props not used for Mapbox heatmap — configured via GL JS paint properties */
/* Low density: #FEFB98, mid: #FD8D3C, high: #BD0026 */
```

### 11.3 Typography

```css
--font-display: 'Syne', 'Inter', sans-serif;   /* Headers, report counts, big numbers */
--font-body: 'Inter', sans-serif;              /* Body copy, labels, notes */
--font-mono: 'JetBrains Mono', monospace;      /* Report IDs, coordinates */

/* Scale */
--text-xs: 0.6875rem;    /* 11px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.375rem;     /* 22px */
--text-2xl: 1.75rem;     /* 28px */
--text-4xl: 2.5rem;      /* 40px */
```

### 11.4 Component Inventory

| Component | Description |
|-----------|-------------|
| `CameraButton` | Large circular orange FAB — primary CTA on home screen |
| `CategoryBadge` | Coloured pill with icon: "🚧 Pothole", "♿ Accessibility Hazard" |
| `StatusBadge` | Status pill with dot: "● Reported", "● In Progress" |
| `AIResultCard` | Classification result: category + confidence bar + override option |
| `ConfidenceBar` | Visual fill bar for AI confidence % |
| `MapPin` | Category-coloured marker with icon |
| `ClusterMarker` | Count badge cluster with dominant-category colour |
| `ReportCard` | Pin detail bottom sheet: photo, category, upvotes, status, address |
| `UpvoteButton` | "I see this too" — tap to upvote, shows count |
| `FilterPanel` | Category/status/date filters as chips and toggles |
| `ReportFeed` | Scrollable list of recent reports (alternative to map) |
| `StatusBadge` | Reported / Acknowledged / In Progress / Fixed |
| `SubmissionSuccess` | Post-submit celebration + share options |
| `DuplicateAlert` | "Similar report nearby — want to upvote instead?" |
| `OfflineBanner` | "You're offline — reports will submit when reconnected" |
| `InstallBanner` | "Add Ripple to your home screen" |
| `NoteInput` | 140-char optional note field |
| `PhotoPreview` | Captured photo preview with retake option |

### 11.5 Motion
- Camera button: pulse animation (draws attention, 2s loop)
- Report submission: upward sweep animation on success
- Map pins: drop-in animation on appearance (bounce, spring physics)
- AI result reveal: slide up from below, staggered confidence bar fill
- Upvote button: tap scale + count increment animation
- Bottom sheets: spring up from bottom
- Status change: colour transition on badge

---

## 12. UI Screen Specifications

### 12.1 Screen Inventory

| Screen | Route | Description |
|--------|-------|-------------|
| Home / Map | `/` | Community map + camera FAB |
| Report Flow | `/report` | Camera -> classify -> confirm -> submit |
| Report Detail | `/report/[id]` | Full report view with comments |
| Feed | `/feed` | List view of recent reports |
| Search | `/search` | Elasticsearch-powered search |
| My Reports | `/my-reports` | Reporter's own submissions (via reporter_token) |
| Council Dashboard | `admin.ripple.app` | Council coordinator view |
| Filter Panel | Overlay | Map filter controls |

---

### 12.2 Home / Map Screen

```
+-----------------------------+
| [Header 52px]               |
| RIPPLE        [search] [≡]  |
+-----------------------------+
|                             |
|       MAPBOX MAP            |
|   (full viewport)           |
|                             |
|  [pins by category colour]  |
|  [clusters where dense]     |
|                             |
|              [heatmap] [filter]  <- map controls, right side
|              [locate me  ]
|                             |
|         [   📷   ]          |  <- FAB, centre-bottom, large orange circle
+-----------------------------+
| [Map] [Feed] [My Reports]   |  <- tab bar 56px
+-----------------------------+
```

**Header:**
- Left: "RIPPLE" wordmark — Syne, 18px, `--color-action`, bold
- Right: search icon (opens search overlay) + hamburger (settings)
- Background: `--color-bg-primary` at 85% opacity + `backdrop-filter: blur(12px)`

**Camera FAB:**
- 64x64px circle, `--color-action` fill, white camera icon
- Subtle pulse animation (scale 1.0 -> 1.05, 2s ease loop)
- `box-shadow: 0 0 20px rgba(232,93,4,0.5)` glow
- Positioned centre-bottom, 16px above tab bar
- Tap -> opens Report Flow

**Map Controls (right side, stacked vertically):**
- Heatmap toggle (fire icon)
- Filter toggle (sliders icon) — badge shows active filter count
- Locate me (crosshair icon)
- All: `--color-bg-elevated`, 44x44px, `--radius-md`, `--shadow-card`

**Recent Reports Counter (bottom-left, above tab bar):**
- Small pill: "147 reports this week in Melbourne"
- `--text-xs`, `--color-bg-elevated`

---

### 12.3 Report Flow — Step 1: Camera

```
+-----------------------------+
| [x Close]                   |
|                             |
|                             |
|   [CAMERA VIEWFINDER]       |
|   full screen               |
|                             |
|   [AI is ready]             |  <- subtle pill, appears after model loaded
|                             |
|                             |
|      [ ● SNAP ]             |  <- large shutter button, centre-bottom
+-----------------------------+
```

- Full-screen camera viewfinder (native camera API)
- Close button top-left (returns to map)
- TF.js model loads in background immediately on screen open
- "AI is ready" indicator once model loaded
- Tap shutter: captures photo, proceeds to Step 2

---

### 12.4 Report Flow — Step 2: AI Classification

```
+-----------------------------+
| [< Back]   What did you see?|
+-----------------------------+
|                             |
|   [PHOTO PREVIEW]           |
|   (captured photo, 200px)   |
|                             |
+-- AI Result ---------------+|
| 🚧  Pothole                 ||
|     [████████████░░] 94%    ||
|     Road damage detected    ||
|                  [Change?] -+|
|                             |
| --- Or select manually -----+
| [🚧 Pothole] [💡 Streetlight]|
| [✏️ Graffiti] [♿ Accessible] |
| [🗑️ Dumping] [💧 Water]      |
| [🌳 Tree]    [🚶 Footpath]   |
|                             |
| [Add a note... (optional)]  |
|                             |
|   [    Submit Report    ]   |  <- orange, full-width
+-----------------------------+
```

- Photo preview (non-editable, tap to retake)
- AI result card: category icon + name + confidence bar
- "Change?" link opens full category grid picker
- Category grid always visible below as manual fallback
- Note field: 140 char, placeholder "Add a note... (optional)"
- GPS capture running in background — shown as "📍 Getting location..." if still resolving
- Submit button: active only when category selected and GPS resolved (or fallback map picked)

**If confidence < 60%:**
```
+-- AI Result (uncertain) ---+
| We detected 2 possibilities:|
| [🚧 Pothole      68%]       |
| [🚶 Footpath     24%]       |
| Which one is it?            |
+----------------------------+
```

---

### 12.5 Report Flow — Step 3: Confirm Location

Appears between classification and submit if GPS is still resolving, or if user wants to adjust.

```
+-----------------------------+
| [< Back]   Confirm location |
+-----------------------------+
|                             |
|   [MINI MAP]                |
|   showing pin at GPS coord  |
|   (tap to move pin)         |
|                             |
| 📍 123 Smith St, Fitzroy    |
|    City of Yarra            |
|                             |
| [This is correct]           |
| [Move the pin]              |
+-----------------------------+
```

---

### 12.6 Report Flow — Step 4: Submission Success

```
+-----------------------------+
|                             |
|         ✓                  |  <- large green checkmark, animated
|                             |
|   Report submitted!         |
|   📍 123 Smith St, Fitzroy  |
|   Category: Pothole         |
|   Routed to City of Yarra   |
|                             |
|   [View on map]             |
|   [Share this report]       |
|   [Report another issue]    |
|                             |
|   Your report is now        |
|   visible to the community. |
|                             |
+-----------------------------+
```

---

### 12.7 Duplicate Alert (inline, replaces submit button)

```
+-- Similar report nearby ----+
| 🚧 Pothole                  |
| 43m away · 12 upvotes       |
| "This has been here 2 months"|
|                             |
| [👍 I see this too]         |  <- upvote existing
| [Submit as new report]      |  <- still allow separate submission
+----------------------------+
```

---

### 12.8 Report Detail (Pin Tapped)

Bottom sheet, snaps to two states (collapsed ~200px, expanded ~80vh).

```
+-----------------------------+
| [── drag handle ──]         |
|                             |
| [PHOTO]     🚧 Pothole      |
|             ● Reported      |
|             📍 Smith St     |
|             2 hours ago     |
|                             |
| [👍 I see this too] (14)    |
|                             |
| "Huge pothole near the      |
|  tram stop - dangerous"     |
|                             |
| --- Updates ----------------+
| ● Reported  — 2 hours ago   |
|                             |
| --- Comments (3) ----------+
| [View discussion]           |
|                             |
| [Share] [Report #4821]      |
+-----------------------------+
```

---

### 12.9 Feed Screen (List View Alternative)

```
+-----------------------------+
| [Header]  Recent Reports    |
| [Sort: Newest] [Filter]     |
+-----------------------------+
| +-- Report Card ------------+
| | [photo] 🚧 Pothole         |
| |         Smith St, Fitzroy  |
| |         2h ago · 14 👍     |
| |         ● Reported         |
| +---------------------------+
| +-- Report Card ------------+
| | [photo] ♿ Access Hazard   |
| |         Park St, Collingwood|
| |         1d ago · 8 👍      |
| |         ● Acknowledged     |
| +---------------------------+
+-----------------------------+
```

---

### 12.10 Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| < 640px (mobile) | Full viewport map, camera FAB, bottom sheets |
| 640-1024px (tablet) | Map 60%, report detail sidebar right |
| > 1024px (desktop) | Map 65%, left sidebar: search + feed, right: report detail |

---

## 13. Privacy & Ethics

### 13.1 Privacy Principles
1. **Anonymous by default.** No name, email, address, or phone required to report.
2. **Reporter token is not an identity.** The UUID in localStorage cannot be linked to a person. It is a session-level convenience token only.
3. **Photos show public infrastructure only.** Ripple's submission flow UI instructs users not to photograph people. AI moderation (Phase 2) flags faces in photos.
4. **No location tracking between sessions.** GPS captured at moment of report, not continuously tracked.
5. **Email is opt-in only.** Notification email only requested if user wants status updates.
6. **No data sold to third parties.** Report data is used for civic purposes only.

### 13.2 What Data Is Collected

| Data | Collected | Stored | Notes |
|------|-----------|--------|-------|
| GPS coordinates | Yes | Yes | Attached to report record permanently |
| Street address | Yes (reverse geocoded) | Yes | Public infrastructure address |
| Photo | Yes | Yes (Supabase Storage) | Public read URL — shows public infrastructure |
| Reporter token | Yes | Yes | UUID, not linked to identity |
| Email | Only if user opts in | Yes | For status notifications only |
| Device info | No | Never | |
| IP address | Briefly (Vercel/Supabase) | Not stored | Standard infrastructure logging only |

### 13.3 Content Moderation
- Phase 1: User flagging (flag comment button), threshold auto-hide
- Phase 2: AI face/NSFW detection on submitted photos before public display
- Phase 3: Council moderation tools (can hide reports outside their remit)

### 13.4 Ethical Considerations
- **Not a surveillance tool.** Ripple is for infrastructure, not people. The submission UI must make this clear. TOS explicitly prohibits photographing individuals.
- **Not a council bypass.** Ripple routes reports to the correct council — it works with local government, not around it.
- **Accessibility of the tool itself.** The app that helps report accessibility hazards must itself be accessible (WCAG 2.1 AA).
- **No gamification of sensitive categories.** Badges are not awarded for reporting deaths, violence, or personal injury scenes.

---

## 14. Out of Scope

| Item | Reason |
|------|--------|
| Native iOS / Android apps | PWA sufficient |
| Reporting on private property | Legal liability; out of council remit |
| Identifying individuals in photos | Privacy violation; actively prevented |
| Real-time traffic or incident reporting | Different product category |
| Emergency reporting (police/fire/ambulance) | Life-safety requires dedicated systems |
| Direct council back-office API integration | Phase 5 future work |
| Automated crew dispatch | Requires council ERP access |
| Monetising report data | Never in scope |
| Facial recognition or CCTV integration | Privacy violation |

---

## 15. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| AI classification accuracy too low | Medium | High | Show confidence clearly; easy manual override; log corrections for retraining |
| TF.js model too large, slow to load | Medium | Medium | MobileNetV2 is ~14MB; cache in IndexedDB after first load; show progress indicator |
| Misuse: reporting private property, people | Medium | High | Clear UI guidance; TOS; community flagging; AI moderation Phase 2 |
| Spam / fake reports | Medium | Medium | Rate limiting (10/hour per token); community flagging; council moderation |
| Council refuses to engage | High | High | Build council dashboard anyway; show councils value with data before asking them to participate |
| GPS accuracy poor in urban canyons | Medium | Medium | Show accuracy radius; allow manual pin adjustment; street address confirms location |
| Supabase Storage costs at scale | Low | Medium | Image compression before upload; lifecycle rules (archive old photos after 1 year) |
| Elasticsearch operational overhead | Medium | Medium | Use Elastic Cloud managed service; monitor index size; set up lifecycle policies |
| Photo privacy: capturing people | Medium | High | In-app guidance; AI face detection Phase 2; community reporting; clear TOS |
| Council data breach (dashboard access) | Low | Very High | Supabase Auth + RLS; MFA for council accounts Phase 2; penetration testing before council onboarding |

---

## 16. Open Questions & Resolved Decisions

| # | Question | Status | Decision |
|---|----------|--------|---------|
| Q1 | Which Melbourne councils to seed boundary data for? | Open | Prioritise: City of Melbourne, City of Yarra, Moreland, Darebin, Port Phillip — these cover inner Melbourne where initial users likely are |
| Q2 | What reverse geocoding API to use? | Open | Mapbox Geocoding API (already a dependency) — use `mapbox.places` for reverse geocode. Fallback: Nominatim (free, self-hosted alternative) |
| Q3 | How to handle reports that cross council boundaries? | Open | Assign to council whose centroid is closest to the report coordinates. Add "Wrong council?" flag option on report. |
| Q4 | Should the TF.js model be trained before launch or use MobileNet zero-shot? | Open | Use fine-tuned model. Begin training dataset curation in parallel with Phase 0 scaffolding. |
| Q5 | Elasticsearch hosting: self-managed vs Elastic Cloud vs alternative? | Open | Elastic Cloud (managed). Start on smallest tier ($16/month). Evaluate if Typesense or Meilisearch is sufficient and cheaper. |
| Q6 | What email provider for status notifications? | Open | Resend — simple API, generous free tier (100 emails/day), React Email for templates. |
| Q7 | Should AI classification corrections be used to retrain the model? | Open | Yes — log corrections in `ai_correction_log` table. Use for periodic fine-tuning. |
| Q8 | NSFW / face detection: build vs buy? | Open | Phase 2 decision. Evaluate: AWS Rekognition, Google Vision API SafeSearch, open-source NSFW.js. |

---

*This document is a living artifact. Update it as decisions are made and features evolve. All agents working on this codebase treat this PRD as the source of truth for product intent.*
