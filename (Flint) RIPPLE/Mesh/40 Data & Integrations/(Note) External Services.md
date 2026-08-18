---
id: 35a1b0d7-80eb-4604-8e6b-65fe71c23958
title: "External Services"
type: note
project: "RIPPLE"
tags:
  - "#note"
  - "#project"
  - "#ld/living"
  - "#stack/react"
  - "#status/dormant"
  - "#cluster/university"
status: dormant
created: "2026-08-17"
updated: "2026-08-17"
source_path: "/Users/brunojaamaa/Desktop/RIPPLE"
---

# External Services

**Five outside dependencies. Two are live, three are not, and the two that are live are the
front-end half of a product whose back half does not exist.**

| Service | Status | What it provides |
|---|---|---|
| **Vercel** | 🟢 Live | Hosting at `ripple-chi-bice.vercel.app`, project `ripple` |
| **Mapbox GL** | 🟢 Live | Map tiles, dark-v11 style. ⚠️ Token needs a referrer restriction |
| **Supabase** | ⚫ Deleted | Postgres, Auth, Storage, Realtime, Edge Functions. Project `nexccbcmziiltysfcmzi` no longer resolves |
| **Resend** | ⚫ Not wired | Status-change email. Needs an API key. **OG5** |
| **Google / LiteRT** | 🟢 Baked in | The runtime is vendored into `public/litert-wasm/`. The model is fetched once at build. No runtime call |

## Supabase, and why nothing works

**This is the single largest fact about the project.** Project `nexccbcmziiltysfcmzi` returns
NXDOMAIN from two independent public resolvers, and because Supabase keeps *paused* projects
resolving, that means **deleted, not paused**. Every "applied to production" claim in the
original plan described a database that no longer existed.

The consequence at the live URL: the PWA installs, the map renders, the offline shell works and
the classifier loads its model, but **nothing that reads or writes data works**. Reports do not
load or submit.

The schema layer itself is not unproven, and the distinction matters. `pnpm verify:db` executes
all **27** migrations against a real PostgreSQL 17.11 and runs **102** assertions including
attacks as `anon`. What is unverified is specifically **what Supabase-the-service adds on top**:
Storage uploads, Edge Function deployment, Auth flows and Realtime *delivery*. Those are managed
services with no local stand-in, and the tasks depending on them are marked as such rather than
as complete.

Re-provisioning is **OG1**, the highest-impact owner action in the project. Nothing about it
costs money: Supabase and Vercel both have free tiers that cover this comfortably.

## Mapbox

`VITE_MAPBOX_TOKEN` is a client-side token by necessity. The README states the correct posture:
**public by design, restrict by URL referrer in the Mapbox dashboard rather than trying to hide
it.**

> [!todo] Missing, not found in the repository
> Whether that referrer restriction has actually been applied to the token now serving the live
> URL. Nothing in the repo records the Mapbox dashboard state.

Mapbox is code-split. `docs/evidence/gates.json` records **1,665.92 KB** of Mapbox in its own
chunk against a **671.06 KB** initial chunk, **199.97 KB** gzipped.

The map route is deliberately excluded from Lighthouse scoring, because headless Chrome
software-rasterises Mapbox GL through SwiftShader and that measures the harness rather than the
app.

## Vercel

Project `ripple`, deployed 2026-08-15. `vercel.json` does three things:

- Rewrites every path to `/index.html`, which is what fixed **seven of eight routes 404ing**.
- `Cache-Control: public, max-age=0, must-revalidate` on `/sw.js`, so the service worker updates.
- `Cache-Control: public, max-age=31536000, immutable` on `/models/*`, which is safe because the
  model filename is versioned.

⚠️ The file carries `"$schema"` and no comment keys, because Vercel's schema validation
**rejects** comments in `vercel.json`. That was commit `9da0b10`, found only on deploy.

## Resend

Status-change email, wired in `supabase/functions/send-notification/index.ts`, never run.
`RESEND_API_KEY` is a server-side secret and is owner-gated as **OG5**.

## LiteRT and the model

Not a runtime service call. The WASM runtime is copied out of `node_modules` into
`public/litert-wasm/` by `scripts/sync-litert-wasm.mjs` on `predev` and `prebuild`. The model is
fetched once by `scripts/fetch-dev-model.mjs` on `prebuild`, idempotently.

⚠️ **The first deploy shipped no classifier at all**, because the model is gitignored and nothing
fetched it, so `pnpm build` exited 0 on an incomplete bundle. Fixed by adding the fetch to
`prebuild`. Found only once deployed.

## Not used

**Elasticsearch** is specified in `PRD.md` § 6.6 and was deliberately replaced by Postgres
full-text search. ~$16 a month and a second datastore for a product with zero users.
`useSearch` is backend-agnostic so the swap costs one file if it is ever wanted. **OG4**, with a
standing recommendation to keep deferring.

**TensorFlow.js** is not a dependency. See [[(Note) On-Device Classification]].

## Related

[[(Note) Data Model and RLS]] · [[(Note) Deploy and Environment]] ·
[[(Note) Owner-Gated Backlog]] · [[(Index) 40 Data & Integrations]]
