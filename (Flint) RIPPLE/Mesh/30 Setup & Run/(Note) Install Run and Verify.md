---
id: a53aa146-90a8-4a40-8277-187636f7a714
title: "Install Run and Verify"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/package.json"
---

# Install Run and Verify 🚀

```bash
pnpm install
pnpm test:run                     # 340 tests, no configuration needed
cp .env.example .env.local        # Supabase URL and anon key, Mapbox token
pnpm dev
```

## Tests need no setup, and that is the point

`.env.test` is **committed on purpose**, with deliberately non-resolving placeholder values,
because a suite that only runs for the person who wrote it is not a verified suite.

> Committed on purpose. These are not secrets and never reach a network.

That is the file's own first line. `src/lib/supabase.ts` throws at module init when
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are absent, so any test whose import graph
reached it failed on a clean clone, and `.env.local` is gitignored. The result was that
`pnpm test:run` gave **340** passing tests on the machine that wrote them and **324 plus a
failure** to everybody else, including CI. The `.gitignore` re-includes it explicitly with
`!.env.test` after a blanket `.env*`.

⚠️ This vault confirmed that header and read nothing further from the file, per ground rule 3.

## The model is not in git

`public/models/*.tflite` is gitignored because it is **5 MB** and reproducible from a URL.

- `pnpm build` fetches it via `prebuild`, so a clean checkout still produces a complete bundle.
  The fetch is idempotent and skips when the file is already present.
- `pnpm dev` does **not**, so a fresh dev server takes the designed fallback path to the manual
  category picker until you ask for it.

```bash
pnpm fetch:model                  # real EfficientNet-Lite0 int8, 5.18 MB
pnpm bench:ai
```

`public/litert-wasm/` is gitignored the same way and synced from `node_modules` by
`scripts/sync-litert-wasm.mjs`, which runs on both `predev` and `prebuild`.

## The database verifies with no cloud account and no spend

```bash
brew install postgresql@17 && brew services start postgresql@17
pnpm verify:db
```

It provisions a throwaway local PostgreSQL, applies every migration, loads the seed, and then
attacks the result as `anon`. **27** migrations, **102** assertions, **0** failures. See
[[(Note) The Verification Harness]].

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` · `pnpm build` · `pnpm preview` | Develop, build, serve the production build |
| `pnpm test` · `pnpm test:run` · `pnpm coverage` | Vitest: watch, once, with coverage |
| `pnpm lint` | ESLint, type-aware, zero suppressions |
| `pnpm verify` | Tests, lint, build, PWA, mobile engines, offline. The full local gate |
| `pnpm verify:db` | Migrations, triggers, RLS and Realtime against real PostgreSQL |
| `pnpm verify:pwa` · `verify:mobile` · `verify:offline` · `verify:lighthouse` | The individual gates |
| `pnpm bench:ai` | Real inference against a real model in a real browser |
| `pnpm fetch:model` · `pnpm sync:wasm` | Fetch the dev classifier, sync the WASM runtime |
| `pnpm capture:media` | Regenerates `docs/media/` from the current build |

⚠️ **`pnpm build` runs `tsc -b`, and that matters.** A bare `tsc --noEmit` against the root
`tsconfig.json` checks **zero files**, because it is a solution file with `"files": []` plus
project references, which `--noEmit` does not traverse. It exits 0 without inspecting a line, and
that is how a type error survived in the repo until August 2026. See
[[(Note) The Gates That Could Not Fail]].

## Environment variable names

⚠️ Names only. `.env.local` was never opened. `.env.example` was read for names only.

Every client-safe value carries the `VITE_` prefix and **nothing else ever may**. Server-side
secrets live only in Supabase Edge Function secrets.

| Variable | Scope | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | client | Required. `supabase.ts` throws without it |
| `VITE_SUPABASE_ANON_KEY` | client | Required. Public by design per `PRD.md` § 10.3 |
| `VITE_MAPBOX_TOKEN` | client | Public by design. **Restrict by URL referrer in the Mapbox dashboard** rather than trying to hide it |
| `VITE_VAPID_PUBLIC_KEY` | client, optional | Web Push |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Never `VITE_`-prefixed |
| `RESEND_API_KEY` | **server only** | Status-change email. Owner-gated as OG5 |
| `VAPID_PRIVATE_KEY` | **server only** | Web Push signing |

`pnpm build` asserts that no server-side secret **name** appears in the bundle.

## Related

[[(Note) The Verification Harness]] · [[(Note) Deploy and Environment]] ·
[[(Note) On-Device Classification]] · [[(Index) 30 Setup & Run]]
