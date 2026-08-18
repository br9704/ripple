---
id: 388e893f-2b8f-4201-890e-e15ff8675f1b
title: "Deploy and Environment"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/vercel.json"
---

# Deploy and Environment 🟡

**Live at `https://ripple-chi-bice.vercel.app`, deployed 2026-08-15.** Vercel project `ripple`.
Static PWA build, no server runtime.

⚠️ **The front end is deployed; the backend does not exist.** The PWA installs, the map renders,
the offline shell works and the on-device classifier loads its **5,434,517**-byte model from the
CDN. **Nothing that reads or writes data works.** See [[(Note) External Services]].

## The two deploy-only defects

Both surfaced the moment it was live, and both were invisible to every local gate.

**1. The build shipped no classifier.** The model is gitignored and nothing fetched it, so
`pnpm build` exited 0 on an incomplete bundle. Fixed by moving the fetch into `prebuild`.

**2. Seven of eight routes returned 404.** There was no `vercel.json` and the CDN looked for a
file at `/feed`.

Both hid for the same reason: `vite preview` implements history fallback itself, in-app `<Link>`
navigation issues no network request, and once the service worker installs it serves the shell
anyway. **Only cold loads and shared links broke, which is to say only strangers.**

A third, smaller one: `vercel.json` originally carried comment keys, and Vercel's schema
validation rejected them. Commit `9da0b10`.

## Vercel configuration

`vercel.json` does three things:

- Rewrites every path to `/index.html`. This is the 404 fix.
- `Cache-Control: public, max-age=0, must-revalidate` on `/sw.js`, so the service worker can
  update.
- `Cache-Control: public, max-age=31536000, immutable` on `/models/*`, safe because the model
  filename is versioned.

`.vercel/project.json` holds the project and org ids. Gitignored, read only to confirm the
project name.

## CI

`.github/workflows/verify.yml`, three jobs on push to `main`, on pull request, and on manual
dispatch. Detail in [[(Note) The Verification Harness]].

| Job | Runs |
|---|---|
| `build-and-test` | `test:run`, `lint`, `build`, `verify:pwa`, uploads `dist` for 7 days |
| `browser` | Playwright installs real Chromium and WebKit, then `verify:mobile` and `verify:offline` |
| `database` | `postgres:17` service container, then `./scripts/verify-db.sh` |

Node **22**, pnpm **10** in CI. Note that `package.json` does not pin `packageManager`, so the
local and CI pnpm majors are not locked together.

Placeholder client env values are set inline in the workflow, identical to `.env.test`, because
`src/lib/supabase.ts` throws at module init without them. The comment explains that a build made
without them produces a bundle that renders nothing, which is how the first CI runs reported
"file input not present on the report flow" against a page that had crashed on boot.

There is no deploy step in CI. Vercel builds from the GitHub integration.

## Environment variable names

⚠️ Names only. `.env.local` was never opened.

| Variable | Scope |
|---|---|
| `VITE_SUPABASE_URL` | client, required |
| `VITE_SUPABASE_ANON_KEY` | client, required. Public by design |
| `VITE_MAPBOX_TOKEN` | client. Public by design. Restrict by URL referrer |
| `VITE_VAPID_PUBLIC_KEY` | client, optional. Web Push |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** |
| `RESEND_API_KEY` | **server only**. OG5 |
| `VAPID_PRIVATE_KEY` | **server only** |

`.env.example` declares four names. `pnpm build` asserts no server-side secret **name** appears
in the bundle.

## `.env.test` is committed, on purpose ✅

The `.gitignore` blanket-ignores `.env*` and then re-includes `!.env.test` and `!.env.example`
with an explanatory comment. `.env.test`'s own first line reads:

> Committed on purpose. These are not secrets and never reach a network.

The header goes on to explain that `src/lib/supabase.ts` throws at module init without those
variables, so any test whose import graph reached it failed on a clean clone, giving **340**
passing tests on the author's machine and **324 plus a failure** to everybody else.

⚠️ **This vault verified that header exists and read nothing further from the file.**

## Monitoring

> [!todo] Missing, not found in the repository
> No error tracking, uptime monitoring, log drain or alerting is configured. `MASTERPLAN.md`
> § Deployment & Ops covers environment variables, a pre-deploy gate and iOS PWA facts, but no
> post-launch monitoring. That is defensible for a front end with no backend, and it becomes a
> gap the moment OG1 lands.

## Related

[[(Note) Install Run and Verify]] · [[(Note) External Services]] ·
[[(Note) The Unpushed Commit]] · [[(Index) 70 Ops, Deploy & Env]]
