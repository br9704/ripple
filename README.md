# Ripple

**The civic reporting tool every city needs and no city has: snap a problem, AI classifies it, the community upvotes it, and the council fixes it — in three seconds, anonymously.**

Ripple is a Progressive Web App for community infrastructure reporting. Citizens photograph broken infrastructure, AI classifies the issue, GPS captures the location, and the report appears on a live community map where neighbours can upvote it. Councils get a prioritised, geolocated dashboard of everything that needs attention.

## Documentation

- [Product Requirements Document](./PRD.md) — what to build
- [Implementation Plan](./MASTERPLAN.md) — sprint structure and progress

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript (strict) |
| Build | Vite + vite-plugin-pwa |
| Styling | Tailwind CSS v3 |
| Map | Mapbox GL JS v3 |
| AI/ML | TensorFlow.js + MobileNetV2 |
| Search | Elasticsearch |
| Backend | Supabase (Auth + Postgres + Storage + Realtime + Edge Functions) |
| Email | Resend |
| Geocoding | Mapbox Geocoding API |
| Geo Utilities | Turf.js |
| Animations | Framer Motion |
| Offline Queue | IndexedDB (idb) |
| Deployment | Vercel |
| Package Manager | pnpm |

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Supabase CLI (for local development and migrations)
- A Supabase project (free tier works)
- A Mapbox account (free tier works for development)

### Install

```bash
git clone <repo-url>
cd ripple
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description | Where to get it |
|----------|-------------|----------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard > Settings > API |
| `VITE_MAPBOX_TOKEN` | Mapbox public access token | https://account.mapbox.com/access-tokens/ |

Server-side secrets (set in Supabase Dashboard > Edge Functions > Secrets):

| Variable | Description | Where to get it |
|----------|-------------|----------------|
| `ELASTICSEARCH_URL` | Elasticsearch endpoint | Elastic Cloud deployment |
| `ELASTICSEARCH_API_KEY` | Elasticsearch API key | Elastic Cloud > API Keys |
| `RESEND_API_KEY` | Resend email API key | https://resend.com/api-keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key | Supabase Dashboard > Settings > API |

### Run

```bash
pnpm dev
```

### Build

```bash
pnpm build
pnpm preview
```

### Migrations

```bash
supabase db push   # apply migrations to remote
supabase db reset  # reset local DB and re-apply all migrations
```

## Project Structure

```
src/
  components/     Reusable UI components
  hooks/          Custom React hooks (data fetching, subscriptions, device APIs)
  lib/            Supabase client, third-party wrappers, utility functions
  pages/          Top-level route components
  types/          Shared TypeScript interfaces and type aliases
  stores/         Zustand global state stores
  constants/      App-wide constants (categories, thresholds, config)
  workers/        Web Workers
supabase/
  migrations/     SQL migrations (001_, 002_, ...)
  functions/      Edge Functions (Deno)
  seed/           Seed data scripts
public/
  icons/          PWA icons (192, 512, 512-maskable)
```

## Architecture Notes

### Privacy by Design

- **Anonymous by default** — no account required to report. A random `reporter_token` (UUID in localStorage) is the only identifier, never linked to personal identity.
- **Client-side AI classification** — photos are classified entirely on-device using TensorFlow.js. No image data is sent to a classification server.
- **No analytics libraries** — no Google Analytics, Hotjar, Mixpanel, or any third-party tracking.
- **No PII in logs** — email addresses, names, and device identifiers are never logged.
- **GPS captured at report time only** — no continuous location tracking between sessions.

### PWA-First

Ripple ships as a PWA. There is no native app. The Service Worker caches the app shell, TF.js model, council boundary data, and recent map tiles. Reports submitted offline are queued in IndexedDB and uploaded on reconnect. The app renders cached content when offline — never a blank screen.
