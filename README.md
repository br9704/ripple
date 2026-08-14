<p align="center">
  <img src="public/favicon.svg" width="80" alt="Ripple logo" />
</p>

<h1 align="center">Ripple</h1>

<p align="center">
  <strong>Snap a problem. AI classifies it. The community upvotes it. The council fixes it.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-in%20development-orange" alt="Status: In Development" />
  <img src="https://img.shields.io/badge/sprints-20%2F20%20code--complete-blue" alt="Sprints: 20/20 code-complete" />
  <img src="https://img.shields.io/badge/tests-169-brightgreen" alt="Tests: 169" />
  <img src="https://img.shields.io/badge/pilot-Melbourne-ffb000" alt="Pilot: Melbourne" />
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

> **All twenty sprints are code-complete — and the app is not yet deployable.** Both halves of that sentence are load-bearing.
>
> Every feature is written, typechecks, lints clean, and its pure logic is unit-tested (**169 tests**). But the Supabase project this was built against **no longer exists**, so nothing has been verified end-to-end against a real database, and the on-device classifier has no trained model yet. See [Current Status](#current-status) for exactly what is and isn't proven.

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
2. **Tap the camera** — the `[ ◉ REPORT ]` control, centre of screen. Snap a photo of the problem.
3. **AI classifies it** — LiteRT.js runs an int8 `.tflite` model entirely on your phone. "Pothole (94%)" appears without a single byte of the photo leaving the device. If the classifier is unavailable for any reason, you pick a category and the report still goes through — a broken classifier never blocks a report.
4. **GPS captures location** — reverse geocoded to a street address, council auto-detected from coordinates.
5. **Submit** — the report appears on the community map immediately. Done in 3 seconds.
6. **Community upvotes** — neighbours see the pin, tap "I see this too." Social proof drives council action.
7. **Council fixes it** — prioritised dashboard shows what matters most. Status updates notify reporters.

### Privacy by Design

Privacy is a core architectural constraint, not an afterthought:

- **Anonymous by default.** No name, email, address, or phone required. A random `reporter_token` (UUID in localStorage) is the only identifier — never linked to identity.
- **AI runs on-device.** Photos are classified entirely client-side via LiteRT.js. No image data leaves the device for classification — only the compressed photo, and only after you tap Submit.
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
| **AI/ML** | [LiteRT.js](https://github.com/google-ai-edge/LiteRT) + int8 `.tflite` (on-device classification, WebGPU with WASM fallback) |
| **Search** | Postgres full-text (`tsvector` + GIN). Elasticsearch deferred — see [ADR](MASTERPLAN.md#architecture-decisions-log) |
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
| `VITE_VAPID_PUBLIC_KEY` | `.env.local` | Web Push public key (optional; `npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | Supabase secrets | Web Push private key — **never** `VITE_`-prefixed |
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
├── MOTION.md             # Binding animation specification
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
| **Animation Spec** | Binding motion specification — sequences, timings, per-surface rules, acceptance gates | [`MOTION.md`](MOTION.md) |
| **Classifier** | How to produce and drop in the on-device model | [`public/models/README.md`](public/models/README.md) |
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

All twenty sprints are **code-complete**. Acceptance for anything touching the database is blocked on re-provisioning Supabase — see [Current Status](#current-status).

### Phase 0 — Foundation
- [x] **Sprint 0–5:** Scaffolding, PWA infrastructure, Supabase schema, camera, GPS, report submission

### Phase 1 — MVP
- [x] **Sprint 6:** Live community map (Mapbox, clustering, Realtime)
- [x] **Sprint 6.5:** Foundation Repair *(inserted Aug 2026)* — test harness from zero, plus nine defects the plan had marked complete
- [x] **Sprint 6.6:** SIGNAL design migration *(inserted Aug 2026)*
- [x] **Sprint 7:** On-device AI classification (LiteRT.js) — *pipeline complete, awaiting a trained model*
- [x] **Sprint 8:** Community upvoting
- [x] **Sprint 9:** Map filters & heatmap
- [x] **Sprint 10:** Feed & My Reports
- [x] **Sprint 11:** Report detail, status timeline, share
- [x] **Sprint 12:** Full-text search — *Postgres FTS; Elasticsearch deliberately deferred*

### Phase 2 — Community & Polish
- [x] **Sprint 13:** Status tracking & opt-in notifications
- [x] **Sprint 14:** Comment threads with moderation
- [x] **Sprint 15:** "Fixed!" photo confirmation
- [x] **Sprint 16:** Accessibility, error boundary, Web Push — *Lighthouse gate needs a deployed URL*

### Phase 3 — Council Tools
- [x] **Sprint 17:** Council dashboard — magic-link auth, RLS-scoped feed
- [x] **Sprint 18:** Analytics, batch status updates, CSV export

### Phase 4 — Gamification & Growth
- [x] **Sprint 19:** Badges & opt-in leaderboard
- [x] **Sprint 20:** Shareable filtered views

> Full sprint detail, as-shipped deltas, and every deferral with its reason: [`MASTERPLAN.md`](MASTERPLAN.md)

---

## Current Status

**All twenty sprints are code-complete. Nothing is acceptance-verified.** Both halves matter, and conflating them is exactly the failure this project already had once.

| | Aug 2026 |
|---|---|
| Sprints code-complete | **20 / 20** (plus 6.5 and 6.6, inserted) |
| Tests | **169** TS across 19 files, **40** SQL assertions (from zero) |
| Lint | 0 errors, 0 warnings, **0 suppressions** |
| TypeScript | 0 errors, strict |
| Migrations | 21 |
| Edge Functions | 4 |

### What is proven

- `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test` — **169 tests**, zero lint errors, zero suppressions
- `pnpm build` — valid service worker, 37MB LiteRT WASM correctly excluded from precache, no server-side secret in the bundle
- **`pnpm verify:db`** — all **21 migrations** applied to a real PostgreSQL 17, seed loaded, and **40 behavioural + RLS assertions** passing. Running as `anon` with RLS enforced, an attacker provably cannot delete another user's upvote, read another user's notification email, harvest reporter tokens, or post as the council.

That last one caught a real bug the moment it first ran — a `BEFORE UPDATE` trigger recomputing a priority score from the status it was in the middle of replacing. Invisible to code review; caught in seconds by execution.

### What is not proven, and why

**The Supabase project this was built against no longer exists** — its ref returns NXDOMAIN. The *schema layer* is now verified locally (see above), but Storage uploads, Edge Function deployment, Auth flows and Realtime delivery are Supabase-managed services with no local stand-in, so those remain unproven. Tasks depending on them stay deferred or partial in the masterplan, never complete.

**The classifier has no model.** The Sprint 7 pipeline — runtime, caching, preprocessing, confidence tiers, scan animation, override, correction logging, fallback — is built and tested, but `ripple-classifier-v1.tflite` does not exist yet, so the app currently falls through to the manual category picker on every capture. That is the designed behaviour, not a bug. **No accuracy claim is made** until a fine-tuned model lands.

**First load is heavier than the PRD budget.** Measured: the LiteRT WASM runtime is ~2MB gzipped, and with a ~5MB model that puts first load near 7MB against PRD §10.1's "<5s on 4G". Recorded honestly in the masterplan rather than discovered later.

### To make it real

1. Re-provision Supabase → apply 21 migrations, deploy 4 Edge Functions, create the `reports` and `ml-models` buckets
2. Deploy to Vercel
3. Train and drop in the classifier (`public/models/README.md` has the recipe)
4. Verify on a real mid-range Android and iPhone — this closes the Lighthouse and latency gates


---

## Contributing

This project is under active development by [Bruno Jaamaa](https://github.com/br9704). Development follows the sprint plan in [`MASTERPLAN.md`](MASTERPLAN.md) with coding standards defined in [`CLAUDE.md`](CLAUDE.md).

---

## License

All rights reserved. Copyright Bruno Jaamaa 2026.
