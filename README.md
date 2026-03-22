<p align="center">
  <img src="public/favicon.svg" width="80" alt="Ripple logo" />
</p>

<h1 align="center">Ripple</h1>

<p align="center">
  <strong>Snap a problem. AI classifies it. The community upvotes it. The council fixes it.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-in%20development-orange" alt="Status: In Development" />
  <img src="https://img.shields.io/badge/phase-0%20|%20sprint%204%20done-blue" alt="Phase: 0, Sprint 4 Done" />
  <img src="https://img.shields.io/badge/pilot-Melbourne-E85D04" alt="Pilot: Melbourne" />
  <img src="https://img.shields.io/badge/license-All%20Rights%20Reserved-lightgrey" alt="License" />
</p>

<p align="center">
  <a href="#the-problem">Problem</a> &middot;
  <a href="#how-ripple-works">How It Works</a> &middot;
  <a href="#tech-stack">Tech Stack</a> &middot;
  <a href="#local-setup">Setup</a> &middot;
  <a href="#documentation">Docs</a> &middot;
  <a href="#current-status">Status</a>
</p>

---

> **This project is under active development.** PWA infrastructure is in place — features are being built sprint-by-sprint. See the [roadmap](#roadmap) below for what's done and what's next.

---

## What is Ripple?

Ripple is the civic reporting tool every city needs and no city has. It turns any smartphone into a three-second infrastructure reporter: photograph a pothole, broken streetlight, or accessibility hazard — AI classifies it, GPS captures the location, and the report appears on a live community map where neighbours can upvote it. Councils get a prioritised, geolocated, categorised dashboard of everything that needs attention.

No accounts. No personal information. No council website. Just open the app, snap, and submit.

## The Problem

Citizens can see infrastructure problems. Councils have the budget to fix them. There is no effective bridge between seeing and fixing.

Current council reporting portals fail because:
- **15 minutes** average report time
- Requires full name, address, phone number
- No social proof — one person's complaint reads as noise
- No feedback loop — citizens never learn if anything happened
- Not mobile-optimised, language-inaccessible, buried on council websites

The result: Melbourne receives ~47,000 reports per year through official channels. An estimated **150,000–200,000 issues are never reported.**

## How Ripple Works

1. **Open the app** — no account required. A full-viewport map shows every reported issue in your area.
2. **Tap the camera** — large orange FAB, centre of screen. Snap a photo of the problem.
3. **AI classifies it** — TensorFlow.js runs entirely on your phone. "Pothole (94%)" appears in under 2 seconds.
4. **GPS captures location** — reverse geocoded to a street address, council auto-detected from coordinates.
5. **Submit** — the report appears on the community map immediately. Done in 3 seconds.
6. **Community upvotes** — neighbours see the pin, tap "I see this too." Social proof drives council action.
7. **Council fixes it** — prioritised dashboard shows what matters most. Status updates notify reporters.

### Privacy by Design

Privacy is a core architectural constraint, not an afterthought:

- **Anonymous by default.** No name, email, address, or phone required. A random `reporter_token` (UUID in localStorage) is the only identifier — never linked to identity.
- **AI runs on-device.** Photos are classified entirely client-side via TensorFlow.js. No image data leaves the device for classification.
- **GPS captured at report time only.** No continuous location tracking between sessions.
- **No analytics or tracking libraries.** Zero third-party telemetry.
- **No PII in logs.** Email addresses, names, and device identifiers are never logged.

> For the full privacy specification, see [`PRD.md` Section 13](PRD.md).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript (strict), Vite (PWA) |
| **Styling** | Tailwind CSS v3 |
| **Map** | Mapbox GL JS v3 (clustering, heatmap, geocoding) |
| **AI/ML** | TensorFlow.js + MobileNetV2 (client-side classification) |
| **Search** | Elasticsearch (full-text search + analytics) |
| **Backend** | Supabase — Postgres, Auth, Storage, Realtime, Edge Functions (Deno) |
| **Email** | Resend (status notification transactional email) |
| **Geocoding** | Mapbox Geocoding API (reverse geocode lat/lng → address) |
| **Geo Utilities** | Turf.js (point-in-polygon council boundary detection) |
| **Animations** | Framer Motion |
| **Offline Queue** | IndexedDB (idb library) |
| **State** | Zustand (where needed) |
| **Deployment** | Vercel (CDN, preview URLs) |

---

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Supabase CLI (for local development and migrations)
- A Supabase project (free tier works)
- A Mapbox account (free tier sufficient)

### Quick Start

```bash
# 1. Clone
git clone <repo-url>
cd ripple

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase URL, anon key, and Mapbox token

# 4. Apply database migrations (requires Supabase CLI)
supabase db push

# 5. Start dev server
pnpm dev
```

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `.env.local` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` | Supabase anonymous/public key |
| `VITE_MAPBOX_TOKEN` | `.env.local` | Mapbox GL JS access token |
| `ELASTICSEARCH_URL` | Supabase secrets | Elasticsearch endpoint (server-side only) |
| `ELASTICSEARCH_API_KEY` | Supabase secrets | Elasticsearch API key (server-side only) |
| `RESEND_API_KEY` | Supabase secrets | Resend email API key (server-side only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secrets | Supabase admin key (server-side only) |

> **Never commit secrets.** All client-side env vars use the `VITE_` prefix. Server-side secrets are set in the Supabase dashboard only.

---

## Project Structure

```
ripple/
├── src/
│   ├── components/       # Reusable UI components
│   ├── hooks/            # Custom React hooks (camera, GPS, AI, offline queue)
│   ├── lib/              # Supabase client, Mapbox helpers, utilities
│   ├── pages/            # Top-level route components
│   ├── types/            # Shared TypeScript interfaces and type aliases
│   ├── stores/           # Zustand state stores
│   ├── constants/        # App constants (categories, thresholds, config)
│   └── workers/          # Web Workers (offload heavy computation)
├── supabase/
│   ├── migrations/       # SQL migrations (001–011), applied sequentially
│   ├── functions/        # Deno Edge Functions
│   └── seed/             # Seed data scripts (Melbourne councils)
├── PRD.md                # Product requirements document
├── MASTERPLAN.md         # Sprint plan and progress tracker
├── CLAUDE.md             # Development agent instructions
└── README.md             # You are here
```

---

## Database Schema

```
councils ──< council_boundaries
    │
    └──< reports ──< report_photos
            │──< upvotes
            │──< comments
            │──< status_history
            └──< user_notifications

badges_earned (keyed by reporter_token)
```

| Table | Purpose |
|-------|---------|
| `councils` | Council metadata — name, slug, contact email, dashboard status |
| `council_boundaries` | GeoJSON polygons for council area detection (Turf.js) |
| `reports` | **Core table** — category, location, status, priority score, upvote count |
| `report_photos` | Photos linked to reports (original, additional, fix confirmation) |
| `upvotes` | "I see this too" — one per user per report, enforced by UNIQUE constraint |
| `comments` | Per-report discussion threads, flagging, auto-hide at 5 flags |
| `status_history` | Audit trail: who changed what status, when, with notes |
| `user_notifications` | Opt-in email/push notification subscriptions |
| `badges_earned` | Achievement badges (keyed by reporter_token, no account required) |

All tables have **Row Level Security** enabled. Anonymous users can read and submit reports; only council staff (authenticated via JWT) can update report status.

---

## Report Categories

| Category | Colour | Severity | Examples |
|----------|--------|:--------:|---------|
| Pothole / Road Damage | 🔴 Red | 2 | Potholes, cracked asphalt, sunken covers |
| Broken Streetlight | 🟠 Orange | 3 | Dead streetlights, damaged poles |
| Graffiti / Vandalism | 🟣 Purple | 1 | Graffiti on public property |
| Damaged Signage | 🟠 Orange | 2 | Broken/graffiti-covered road signs |
| Accessibility Hazard | 🔵 Blue | 2.5 | Broken curb cuts, missing tactile indicators |
| Illegal Dumping | 🟤 Brown | 1 | Abandoned furniture, rubbish piles |
| Water / Drainage | 🩵 Teal | 2 | Leaking hydrants, blocked drains |
| Dangerous Tree | 🟢 Green | 3 | Fallen branches, leaning trees |
| Damaged Footpath | 🟡 Amber | 2 | Cracked/uneven footpath, trip hazards |
| Other Infrastructure | ⚪ Grey | 1 | Anything not fitting above |

---

## Documentation

| Document | Description | Link |
|----------|-------------|------|
| **Product Requirements** | Full feature specs, data models, personas, design system, privacy rules, UI screen specs | [`PRD.md`](PRD.md) |
| **Implementation Plan** | Sprint-by-sprint breakdown with progress tracking, architecture decisions, and risk log | [`MASTERPLAN.md`](MASTERPLAN.md) |
| **Agent Instructions** | Coding standards, privacy rules, commit conventions, sprint protocol | [`CLAUDE.md`](CLAUDE.md) |
| **Environment Template** | Required environment variables with descriptions | [`.env.example`](.env.example) |

---

## Pilot City

**Melbourne, Australia**

| Council | Area |
|---------|------|
| City of Melbourne | CBD, Southbank, Carlton |
| City of Yarra | Fitzroy, Collingwood, Richmond |
| Moreland (Merri-bek) | Brunswick, Coburg |
| Darebin | Northcote, Preston, Fairfield |
| Port Phillip | St Kilda, South Melbourne, Albert Park |

> Council boundary data sourced from ABS Mesh Block data. Boundary GeoJSON will be loaded in Sprint 2.

---

## Roadmap

### Phase 0 — Foundation
- [x] **Sprint 0:** Project scaffolding (Vite + React + TypeScript + Tailwind + PWA config)
- [x] **Sprint 1:** PWA infrastructure (Service Worker, offline fallback, install prompt)
- [x] **Sprint 2:** Supabase infrastructure (schema, migrations, RLS, seed data)
- [x] **Sprint 3:** Camera API & photo capture
- [x] **Sprint 4:** GPS geolocation & reverse geocoding
- [ ] **Sprint 5:** Basic report submission (end-to-end flow)

### Phase 1 — MVP
- [ ] **Sprint 6:** Live community map (Mapbox, pins, clustering, real-time)
- [ ] **Sprint 7:** AI image classification (TensorFlow.js + MobileNetV2)
- [ ] **Sprint 8:** Community upvoting ("I see this too")
- [ ] **Sprint 9:** Map filters & heatmap
- [ ] **Sprint 10:** Feed view & My Reports
- [ ] **Sprint 11:** Report detail & routing
- [ ] **Sprint 12:** Elasticsearch integration (search + analytics)

### Phase 2 — Community & Polish
- [ ] **Sprint 13:** Status tracking & notifications
- [ ] **Sprint 14:** Comment threads
- [ ] **Sprint 15:** "Fixed!" photo confirmation
- [ ] **Sprint 16:** PWA install flow polish & accessibility audit

### Phase 3 — Council Tools
- [ ] **Sprint 17:** Council dashboard — authentication & layout
- [ ] **Sprint 18:** Council dashboard — analytics & management

### Phase 4+ — Gamification & Growth
- [ ] Badges, leaderboard, referral flow, multi-city expansion

> Full sprint details with subtasks in [`MASTERPLAN.md`](MASTERPLAN.md)

---

## Current Status

**Sprint 4 complete.** GPS geolocation with 5s warning / 8s fallback timers via `useGeolocation` hook. Mapbox Geocoding API reverse geocoding with offline graceful degradation. Turf.js council boundary detection (`booleanPointInPolygon`). IndexedDB boundary cache with 7-day refresh via `idb` library. Manual position override for map picker fallback. Next: Sprint 5 (basic report submission).

---

## Contributing

This project is under active development by [Bruno Jaamaa](https://github.com/br9704). Development follows the sprint plan in [`MASTERPLAN.md`](MASTERPLAN.md) with coding standards defined in [`CLAUDE.md`](CLAUDE.md).

---

## License

All rights reserved. Copyright Bruno Jaamaa 2026.
