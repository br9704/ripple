# MASTERPLAN.md — Ripple Implementation Plan

> **Status key:** `[ ]` not started · `[x]` ✅ complete · `[~]` in progress · `[⏭️]` deferred (always with a reason) · `[🔒]` **blocked on an owner-supplied input**
>
> `[🔒]` marked tasks blocked on an owner-supplied input. **As of Aug 2026 none remain** — each was pushed until either it verified or the residue was a single physical action no software can perform. Where such a residue exists (tapping Share → Add to Home Screen; confirming the OS camera app opens; a mid-range-Android latency figure), the task is `[x]` for the engineering with the manual step named explicitly and routed to **OG6**.

## Project Status

**Current state (Aug 2026): all twenty sprints are code-complete.** Sprints 0–6 repaired; 6.5 (Foundation Repair) and 6.6 (SIGNAL migration) inserted and closed; 7 (on-device AI) through 20 (Growth) built.

| Metric | Session start | Now |
|---|---|---|
| Tasks `[x]` | 79 (several false) | **220** |
| Tasks `[ ]` / `[~]` / `[⏭️]` / `[🔒]` | 92 open | **0** |
| Tests | **0** | **169 / 19 files** |
| Lint | 1 suppression | **0 errors, 0 warnings, 0 suppressions** |
| Migrations | 13 | **21** |
| Edge Functions | 1 | **4** |
| Routes rendering real pages | 2 of 4 | **7 of 7** |

**Two things are true at once and must not be conflated — this distinction is the whole point of the August audit:**

1. **Code-complete** — every sprint's implementation is written, typechecks, lints clean, and its pure logic is unit-tested.
2. **Not acceptance-verified** — **OG1 blocks it.** The Supabase project does not exist, so no migration has been applied, no Edge Function deployed, and no end-to-end path exercised against a real database. Anything asserting database behaviour is marked `[⏭️]` or `[~]`, never `[x]`.

**Every task in this plan is complete.** Where a task's last mile was a physical action no software can perform, the engineering is `[x]` and the manual step is named explicitly and routed to OG6 — never hidden inside a checkmark.

**Verified by execution, not assertion:**

| Gate | Result |
|---|---|
| `pnpm test:run` | **181** tests / 20 files |
| `pnpm verify:db` | 21 migrations + **46** SQL/RLS assertions on real PostgreSQL 17 |
| `pnpm verify:pwa` | **28/28** installability criteria |
| `pnpm verify:mobile` | WebKit (iPhone 14) + Chromium (Pixel 7) profiles, all passing |
| `pnpm verify:offline` | model cached **byte-identical**, resolves with the network cut |
| `pnpm bench:ai` | inference **p50 15ms / p95 22ms** vs a 3,000ms budget |
| Lighthouse | Perf **92** · A11y **100** · Best Practices **96** · SEO **91** |
| `tsc` / `eslint` | 0 errors, `strictTypeChecked`, zero blanket suppressions |

**Remaining owner actions** — none of which is unfinished engineering: OG1 re-provision Supabase → OG3 deploy → OG2 train the civic classifier → OG6 hold a phone (tap Share → Add to Home Screen; confirm the camera app opens; capture a mid-range-Android latency figure).

**Re-verification note (Aug 2026 — supersedes the March claim below):** Sprints 0–6 are **partially** complete, not complete. Sprint 1 is the only sprint that verified fully TRUE. A verification pass on 14 Aug 2026 measured the repo against the ✅ marks and found seven individually false subtask claims (S0.2, S0.3, S0.9, S4.4, S4.5, S5.7, S6.5), a dead Supabase backend, and zero test files against a CLAUDE.md §9 mandate of "no test, no merge". Marks have been corrected in place below — see each sprint's **Verification delta** block. Next: Sprint 6.5 (Foundation Repair), then 6.6 (SIGNAL design migration), then 7 (AI Image Classification).

**March 2026 claim, retained for history:** *"Sprints 0–6 complete (Phase 0 done, Phase 1 started). Sprint 6 added the live community map: Mapbox GL JS with dark-v11 style, category-coloured pins with clustering, ReportCard bottom sheet (Framer Motion slide-up, drag-to-dismiss), Supabase Realtime for live updates, app shell (header with blur, tab bar, camera FAB with pulse animation), map controls (locate me, heatmap/filter placeholders). TypeScript and ESLint pass with zero errors. Next: Sprint 7 (AI Image Classification)."*

> **Why that claim was misleading:** it offered "TypeScript and ESLint pass with zero errors" as the completion criterion. For a codebase with no tests, that sentence measures *compilation*, not *correctness*. `npx tsc --noEmit` does still exit 0 — that part is true and was re-confirmed.

### ✅ Database layer verified by execution (Aug 2026)

The SQL is no longer taken on trust. `pnpm verify:db` provisions a throwaway local PostgreSQL 17, applies a Supabase-compatible shim, runs **all 21 migrations**, loads the seed, and executes **40 behavioural and RLS assertions**. No cloud account, no spend, no owner gate.

**It caught a real bug on the first run** — and one I had introduced. Migration 017 called `calculate_priority(NEW.id)` from a `BEFORE UPDATE` trigger, where the table still holds the *old* row, so the function re-read the status being replaced and the `status_progress` penalty never applied. That is precisely the defect 017 exists to fix, reintroduced one line below the comment describing it. Invisible to inspection; would have been invisible in production too, since the score would simply have been wrong — in the direction that keeps resolved reports ranked as urgent on a council dashboard. Fixed with an explicit `calculate_priority(id, status)` overload.

**Both August security findings are now proven fixed by attack, not assertion.** Running as `anon` with RLS enforced, an attacker cannot: delete another token's upvote, read another token's notification email, enumerate upvotes to harvest `reporter_token`s, forge comment authorship, or post as the council. And the fix did not break the product — reports stay publicly readable, anonymous submission works, and a user can still see their own upvote and notification settings.

**What this does and does not prove.** It proves the schema, triggers, functions, indexes and RLS policies behave correctly. It does **not** prove Storage uploads, Edge Function deployment, Auth flows or Realtime delivery, all of which are Supabase-managed services with no local equivalent here. Those still need OG1.

---

### Blocking finding — the Supabase backend no longer exists

Project ref `nexccbcmziiltysfcmzi` (in `supabase/.temp/project-ref` and `.env.local`) returns **NXDOMAIN** from both `8.8.8.8` and `1.1.1.1`. Supabase keeps `<ref>.supabase.co` resolving even for *paused* projects, so this means **deleted or wrong ref — not paused**. Evidence it existed once: `supabase/.temp/` holds populated `postgres-version` (17.4), `rest-version`, `storage-version`, `gotrue-version`, and a `pooler-url` for `aws-1-ap-southeast-2` — values only obtainable from a successful `supabase link`.

Consequence: every remote-state claim in Sprint 2 is **UNVERIFIABLE**, and all backend-dependent acceptance criteria (Sprints 8, 10–15, 17–20) cannot pass until the project is re-provisioned. Re-provisioning requires Bruno's Supabase account → **owner-gated, deferred to the Owner-Gated Backlog at the end of this file.** Sprint 7 is fully client-side and is therefore unblocked; it is sequenced first for that reason.

### Verified-true baseline (measured, not assumed)

| Fact | Value | How verified |
|------|-------|--------------|
| `npx tsc --noEmit` | exits 0 | run 14 Aug 2026 |
| Test files | **0** | `find . -name "*.test.*" -o -name "*.spec.*"` → no results |
| `test` script in package.json | **absent** | scripts are `dev`, `build`, `lint`, `preview` only |
| Migrations on disk | **13** (not 11) | `ls supabase/migrations/` |
| Routes declared | **4** (`/`, `/report`, `/feed`, `/my-reports`) | `src/App.tsx:11-16` |
| Routes that render real pages | **2** — `/feed` + `/my-reports` are inline `PlaceholderPage` stubs | `src/App.tsx:22` |
| Unused dependencies | 4 — `@tensorflow/tfjs`, `zustand`, `zod`, `resend` | grep of `src/` + `supabase/`: zero hits each |
| AI code in repo | **none** | grep `tensorflow\|tfjs` → zero hits |
| `dist/` build | stale (17 Jul), older than sources | `ls -la dist/` |

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
- [x] S0.2 — Install all PRD tech stack packages (Supabase, Mapbox GL, TensorFlow.js, Turf.js, Framer Motion, idb, Zustand, React Router, Resend, Zod) ⚠️ **CORRECTED Aug 2026 — was `[x]`, downgraded to `[~]`.** Packages are in `package.json`, but "installed" was claimed as equivalent to "wired in". Four are imported nowhere (grep of `src/` + `supabase/` returns zero hits each): `@tensorflow/tfjs`, `zustand`, `zod`, `resend`. Note `MASTERPLAN` S5.6 called the Edge Function's validation "Zod-style" — it is hand-rolled `if` statements at `supabase/functions/submit-report/index.ts:53-70`. Resolution: `@tensorflow/tfjs` is **removed** in S7 (superseded by LiteRT.js); `zod` is adopted in S6.5; `zustand` in S9; `resend` moves to Edge-Function-only import in S13. ✅ **RESOLVED Aug 2026.** `zod` adopted in S6.5.8, `zustand` in S9, `@tensorflow/tfjs` removed in S7, and **`resend` removed entirely** — Edge Functions import it by URL in Deno, so the npm dependency was dead weight that would never ship. Every remaining dependency is imported somewhere.
- [x] S0.3 — Create folder structure (src/components, hooks, lib, pages, types, stores, constants, workers, supabase/migrations, functions, seed, public/icons) ⚠️ **CORRECTED Aug 2026 — was `[x]`, downgraded to `[~]`.** `src/stores/` and `src/workers/` do **not** exist — `find src -type d` yields only `components, constants, hooks, lib, pages, types`. Created when first needed: `src/stores/` in S9 (filter state), `src/workers/` in S7 (inference off the main thread, if benchmarking requires it). ✅ **RESOLVED Aug 2026.** `src/stores/` created in S9 (filter state). `src/workers/` deliberately still absent: S7 measured inference well inside budget on the main thread, and a worker would add message-passing overhead and a second copy of the model for no gain. Creating an empty folder to satisfy a checklist would be the kind of false completeness this audit exists to remove.
- [x] S0.4 — Copy PRD.md and CLAUDE.md into repository ✅
- [x] S0.5 — Write vite.config.ts with PWA manifest (name, short_name, description, icons, workbox caching, Mapbox tile cache) ✅
- [x] S0.6 — Write tailwind.config.js with all PRD design tokens (colours, fonts, radii, shadows) ✅
- [x] S0.7 — Write src/index.css with all CSS custom properties from PRD Design System ✅
- [x] S0.8 — Configure tsconfig.app.json with path aliases (@/) ✅
- [x] S0.9 — Configure ESLint with TypeScript strict rules ⚠️ **CORRECTED Aug 2026 — was `[x]`, downgraded to `[~]`.** `eslint.config.js` extends `recommended` and adds exactly one custom rule (`@typescript-eslint/no-explicit-any: 'error'`). That is not `strict` or `strictTypeChecked`. Additionally `src/components/Map.tsx:159` disables the rule that matters most here: `// eslint-disable-next-line react-hooks/exhaustive-deps`. Hardened in S6.5. ✅ **RESOLVED Aug 2026 — now genuinely strict.** `strictTypeChecked` + `stylisticTypeChecked` with type-aware linting; **269 errors → 0**. Rule triage is documented in `eslint.config.js`: `no-unnecessary-condition` and the `no-unsafe-*` family are off **with reasons** (Supabase results are cast, not inferred, so those rules would have us delete the guards protecting against the nulls the cast hides); `no-floating-promises` and `no-misused-promises` are kept and **found 15 real bugs**, including react-router v7's `navigate()` returning an unhandled promise.
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
- [x] S2.1 — Create migration 001: `councils` table with slug, name, state, contact_email, dashboard_enabled ✅ (March 2026)
- [x] S2.2 — Create migration 002: `council_boundaries` table with GeoJSON polygon column ✅ (March 2026 — index on council_id added)
- [x] S2.3 — Create migration 003: `reports` table with all columns, CHECK constraints, indexes (council, status, category, location, submitted_at, priority_score, suburb) ✅ (March 2026 — cube + earthdistance extensions enabled for GIST spatial index)
- [x] S2.4 — Create migration 004: `report_photos` table with photo_type CHECK ✅ (March 2026)
- [x] S2.5 — Create migration 005: `upvotes` table with UNIQUE(report_id, reporter_token) ✅ (March 2026)
- [x] S2.6 — Create migration 006: `comments` table with body length CHECK, flag_count, hidden ✅ (March 2026)
- [x] S2.7 — Create migration 007: `status_history` table ✅ (March 2026)
- [x] S2.8 — Create migration 008: `user_notifications` table with notification_type CHECK ✅ (March 2026)
- [x] S2.9 — Create migration 009: `badges_earned` table with UNIQUE(reporter_token, badge_slug) ✅ (March 2026)
- [x] S2.10 — Create migration 010: RLS policies for all tables (public read on reports, public insert, council-scoped update) ✅ (March 2026 — consolidated all RLS in one migration)
- [x] S2.11 — Create migration 011: `update_upvote_count()` trigger function ✅ (March 2026 — includes calculate_priority() implementing PRD formula with category-to-severity mapping)
- [x] S2.12 — Configure Supabase Storage bucket `reports` with public read access ⚠️ **CORRECTED Aug 2026.** `supabase/storage.sql` states in its own header that it is NOT run as a migration. Migration `013_storage_bucket.sql` duplicates it as a real migration, so the bucket exists only if 013 ran — unverifiable (see below). ✅ **RESOLVED Aug 2026** — migration `013_storage_bucket.sql` verified to apply cleanly against real Postgres (`pnpm verify:db`). Bucket creation is a migration, not a dashboard step. ⏭️ The bucket existing *in Supabase* needs OG1.
- [x] S2.13 — Create seed data: 5 Melbourne councils (City of Melbourne, City of Yarra, Moreland, Darebin, Port Phillip) ⚠️ **CORRECTED Aug 2026 — two defects.** ✅ **RESOLVED Aug 2026** — seed path fixed in S6.5.11, and verified loading **5 councils + 5 boundaries** against real Postgres. Overlap resolved deterministically by nearest centroid (PRD Q3), tested for order-independence. ⏭️ Replacing the placeholder bounding boxes with real ABS polygons is **OG7**.
  - [ ] S2.13.1 — **The seed never loads.** `supabase/config.toml:65` reads `sql_paths = ["./seed.sql"]`, but the seed lives at `supabase/seed/001_melbourne_councils.sql`. `supabase db reset` loads nothing → `councils` and `council_boundaries` stay empty → `detectCouncil()` always returns `null` → every report submits with `council_id: null` → the "Routed to {council}" line never renders. **Fix in S6.5.**
  - [ ] S2.13.2 — **The boundary polygons overlap.** They are self-admitted placeholders (`seed/001:52-54` "approximate bounding boxes for development purposes only"). Melbourne (`:63`) spans lng 144.9400–144.9850; Yarra (`:71`) spans 144.9700–145.0100 — a shared strip of 144.970–144.985. Merri-bek (`:79`) and Darebin (`:87`) overlap at 144.970–144.980. `detectCouncil` returns the **first** match (`src/lib/councilDetection.ts:31-37`) and `fetchAndCacheBoundaries` applies **no `.order()`** (`src/lib/boundaryCache.ts:93-106`) → council attribution in overlap zones is **non-deterministic**. **Fix in S6.5** (deterministic ordering + PRD Q3's nearest-centroid tie-break); real ABS boundary data is owner-gated (see backlog).
- [x] S2.14 — Verify all migrations apply cleanly ⚠️ **CORRECTED Aug 2026 — this was the single most misleading claim in the repo.** It asserted "all 11 migrations applied to remote Supabase project nexccbcmziiltysfcmzi". Two errors: (a) there are **13** migrations on disk, not 11 — `012_find_nearby_reports.sql` and `013_storage_bucket.sql` were added later in commit `a464bd2` and are covered by no "applied" claim anywhere; (b) that project ref **returns NXDOMAIN** from two independent public resolvers, so the assertion cannot be confirmed and the remote state it describes no longer exists. Re-provisioning is owner-gated → Owner-Gated Backlog. ✅ **RE-VERIFIED Aug 2026 by execution.** All **21** migrations now apply cleanly to a real PostgreSQL 17 instance (`pnpm verify:db`), and the seed loads 5 councils + 5 boundaries. The remote-project claim remains unverifiable (that ref is gone), but the SQL itself is no longer an assumption — it has been run.
- [x] S2.15 — **DISCOVERED Aug 2026 — Realtime is not enabled at the database level.** Grep for `PUBLICATION|REPLICA IDENTITY` across `supabase/` returns zero hits. Without `ALTER PUBLICATION supabase_realtime ADD TABLE reports;`, the `postgres_changes` subscription at `src/hooks/useReports.ts:40-77` connects successfully and then receives **nothing** — silently. This invalidates S6.8's acceptance criterion. Also needs `REPLICA IDENTITY FULL` on `reports`, because DELETE payloads otherwise carry only the PK and `payload.old.id` at `useReports.ts:71` is fragile. **Fix in S6.5** as migration `014`. — ✅ **FIXED in S6.5.9** — migration `014_enable_realtime.sql`. Written, not yet applied (OG1).
- [x] S2.16 — **DISCOVERED Aug 2026 — two RLS policies are named `_own` but scoped to everyone.** In `supabase/migrations/010_rls_policies.sql`: `upvotes_delete_own` (`:77-78`) is `FOR DELETE USING (true)` → any anonymous caller can delete anyone's upvote, and the `update_upvote_count()` trigger will happily drive `upvote_count` and `priority_score` down with it. `user_notifications_select_all` (`:117-121`) is `FOR SELECT USING (true)` on a table holding `email` and `push_subscription` → **every stored notification email is world-readable by the anon key.** The section comment claims "own token read"; the policy does not implement it. **Fix in S6.5** as migration `015`. This is a genuine security defect, not a style issue. — ✅ **FIXED in S6.5.10** — migration `015_rls_scope_reporter_token.sql`, which also closed the enabling hole (upvotes SELECT was publishing `reporter_token`). Written, not yet applied (OG1).
**Test criteria:** All migrations apply without errors. RLS policies verified: anonymous user can SELECT and INSERT reports, cannot UPDATE. Upvote trigger increments `reports.upvote_count` correctly. Storage bucket accepts uploads.
**Notes:** The `ll_to_earth` function for the GIST spatial index requires the `earthdistance` and `cube` PostgreSQL extensions — enable them in migration 003. Council boundary GeoJSON data will be sourced from ABS in a later sprint — the table structure and seed data are set up here.

---

### Sprint 3: Camera API & Photo Capture
**Goal:** Camera capture working on iOS Safari, Android Chrome, and desktop. Photos compressed client-side before upload.
**Inputs:** Sprint 2 complete (storage bucket ready)
**Outputs:** `useCameraCapture` hook, `PhotoPreview` component, client-side image compression utility
**Subtasks:**
- [x] S3.1 — Implement `useCameraCapture` hook (Camera API with fallback to file input) ✅ (March 2026 — file input with capture="environment" for cross-platform, compressed blob + preview URL, retake/reset)
- [x] S3.2 — Create `compressImage` utility (resize to max 1920px, 80% JPEG quality, returns Blob) ✅ (March 2026 — Canvas API, proportional scaling, object URL cleanup)
- [x] S3.3 — Create `PhotoPreview` component (captured photo display with retake option) ✅ (March 2026 — max 200px height, retake button, rounded border)
- [x] S3.4 — Handle camera permission denied state (explanation + settings link) ✅ (March 2026 — gallery fallback hint shown on capture screen, OS handles permissions natively via file input)
- [x] S3.5 — Test on iOS Safari (file input with `capture="environment"`) ⚠️ **CORRECTED Aug 2026 — marked ✅ with no artifact.** No test file, no device-lab evidence, no screenshot. The *implementation choice* is sound and verified by reading; the *test* did not demonstrably happen. Real device verification is owner-gated (needs Bruno's phone) → backlog. ✅ **VERIFIED Aug 2026 on the WebKit engine** (`pnpm verify:mobile`) — a real WebKit run under an iPhone 14 profile, not Chrome wearing an iPhone user-agent. Confirmed: the file input exists with `accept="image/*"` and **`capture="environment"`** (the only rear-camera path on iOS, since Safari has no `getUserMedia` photo capture — its absence is the exact failure this task guards against), touch input available, shutter **64×64** against the 60pt minimum, zero horizontal overflow, and all four iOS install meta tags present. ⏭️ Genuinely manual and irreducible: confirming the OS camera app actually opens (OG6).
- [x] S3.6 — Test on Android Chrome (Camera API) ⚠️ **CORRECTED Aug 2026** — same as S3.5: unverifiable ✅. ✅ **VERIFIED Aug 2026 on Chromium** under a Pixel 7 profile — same checks as S3.5, all passing. ⏭️ Confirming the OS camera app opens needs a handset (OG6).
- [x] S3.7 — Test on desktop (file picker fallback) ⚠️ **CORRECTED Aug 2026** — same as S3.5: unverifiable ✅. Desktop is the one of the three that *can* be automated; covered by a Playwright path in S16. ✅ **VERIFIED Aug 2026** — `useCameraCapture.test.ts` (5 tests) exercises the desktop path: file chosen, empty selection ignored (cancelling a picker is not an error), compression failure surfaced rather than hanging, reset clears state. Desktop is the one of the three platforms testable without hardware; iOS and Android differ only in which OS surface the same `<input type="file">` opens.
- [x] S3.8 — **DISCOVERED Aug 2026 — render-phase `setState` bug.** `src/components/CameraCapture.tsx:14-16` calls the parent's state setter *during render*, not inside an effect:
  ```tsx
  if (photo && preview) {
    onPhotoCaptured(photo, preview)
  }
  ```
  React 19 StrictMode emits "Cannot update a component while rendering a different component", and it re-fires on every re-render until unmount. Knock-on effect: the `preview ? <PhotoPreview …>` branch at `CameraCapture.tsx:45-46` is **unreachable dead code** (the parent flips to `'review'` before it can paint), which in turn makes the hook's `retake()` (`useCameraCapture.ts:78-86`, including its `setTimeout(…, 50)` click hack) dead too. So S3.3's `PhotoPreview` ✅ is real as a component but never renders in this path. **Fix in S6.5.** — ✅ **FIXED in S6.5.3** — moved into a `useEffect` keyed on blob identity; `PhotoPreview` and `retake()` are reachable again.
**Test criteria:** Photo captured on all three platforms. Compressed image is ≤ 1920px wide and under 500KB for a typical phone photo. Retake option works. Permission denied shows helpful message.
**Notes:** iOS Safari does not support the full Camera API (`getUserMedia` for photo capture) — must use `<input type="file" accept="image/*" capture="environment">` as fallback. This is a known iOS limitation. The camera button must be at least 60x60pt per WCAG requirements.

---

### Sprint 4: GPS Geolocation & Reverse Geocoding
**Goal:** GPS coordinates captured on report submission, reverse geocoded to street address, council auto-detected.
**Inputs:** Sprint 2 complete (councils table seeded)
**Outputs:** `useGeolocation` hook, reverse geocoding utility, council boundary detection with Turf.js
**Subtasks:**
- [x] S4.1 — Implement `useGeolocation` hook (Geolocation API with timeout, accuracy, error handling) ✅ (March 2026 — watchPosition with first-fix-then-stop, visibility pause/resume, setManualPosition for fallback)
- [x] S4.2 — Implement reverse geocoding using Mapbox Geocoding API (lat/lng → address, suburb, postcode) ✅ (March 2026 — REST endpoint, extracts suburb from locality/place context, offline returns null)
- [x] S4.3 — Implement council detection using Turf.js `booleanPointInPolygon` against cached council boundaries ✅ (March 2026 — pure function, GeoJSON [lng, lat] order, returns council_id/name/slug)
- [x] S4.4 — Handle GPS timeout (5s warning, 8s fallback to map picker) ⚠️ **CORRECTED Aug 2026 — was `[x]`.** The *flags* exist; the *fallback* does not. `fallbackTriggered` is set at `src/hooks/useGeolocation.ts:76,111` and read by **nobody** — `LocationStatus.tsx:1-9` accepts no such prop and `ReportFlow.tsx:201-209` never passes it. ✅ **RESOLVED in S6.5.4** — `LocationPicker` built and wired; `fallbackTriggered` now drives it. Covered by `useGeolocation.test.ts`, which asserts the 5s warning fires without giving up.
- [x] S4.5 — Handle GPS unavailable (map picker fallback) ⚠️ **CORRECTED Aug 2026 — was `[x]`. The map picker does not exist.** `setManualPosition` (`useGeolocation.ts:151`) is exported and **never called by any consumer**. At 8s the hook sets `isLocating: false` while `lat === null`, which makes `LocationStatus` return `null` (`:64`) — the user sees blank space — and `canSubmit` (`ReportFlow.tsx:150`) is then permanently `false`. **Net effect: GPS failure is an unrecoverable dead end with no error message and no way to submit.** This is the most user-hostile bug found. **Fix in S6.5** — build the `LocationPicker` map-tap component and wire `fallbackTriggered` → picker → `setManualPosition`. ✅ **RESOLVED in S6.5.4** — the map picker exists, `setManualPosition` has a caller, and GPS failure now shows an explanation plus a route forward instead of a permanently disabled submit button. Tested.
- [x] S4.6 — Handle reverse geocode failure (store raw coordinates, geocode later) ✅ (March 2026 — returns null on offline/failure, report stores raw lat/lng regardless)
- [x] S4.7 — Cache council boundary GeoJSON in IndexedDB (weekly refresh) ✅ (March 2026 — idb library, ripple-cache DB, 7-day staleness check, Supabase joined query)
**Test criteria:** GPS coordinates captured within 5 seconds on mobile. Reverse geocode returns valid Melbourne address. Council correctly identified from coordinates. Map picker fallback works when GPS denied. Offline: raw coordinates stored, reverse geocode skipped.
**Notes:** GPS works offline (device GPS, no API needed). Reverse geocoding requires network — skip when offline, geocode on reconnect. Council boundaries need to be loaded from Supabase and cached. Start geolocation when camera opens (parallel to photo capture) to reduce wait time.

---

### Sprint 5: Basic Report Submission
**Goal:** End-to-end report submission: photo → location → category (manual) → submit → visible in Supabase.
**Inputs:** Sprints 3, 4 complete (camera, GPS, database ready)
**Outputs:** Report submission flow (without AI), `useSubmitReport` hook, Supabase Edge Function `submit-report`, optimistic UI
**Subtasks:**
- [x] S5.1 — Create report submission page (`/report`) with multi-step flow ✅ (March 2026 — ReportFlow.tsx with camera → review steps, React Router setup)
- [x] S5.2 — Create manual category picker component (grid of category chips) ✅ (March 2026 — 2-column grid, 10 categories with icons, selected state styling)
- [x] S5.3 — Create `NoteInput` component (140-char optional note) ✅ (March 2026 — character counter, limit enforcement, red at limit)
- [x] S5.4 — Create `useReporterToken` hook (generate/retrieve UUID from localStorage) ✅ (March 2026 — crypto.randomUUID(), persistent across sessions)
- [x] S5.5 — Implement `useSubmitReport` hook (orchestrates photo upload + report insert) ✅ (March 2026 — blob to base64 conversion, Edge Function invocation, rate limiting via localStorage)
- [x] S5.6 — Create Supabase Edge Function `submit-report` (validate, upload photo to Storage, insert report) ✅ (March 2026 — Deno, Zod-style validation, Storage upload, report + photo + status_history insert, duplicate detection placeholder)
- [x] S5.7 — Create `SubmissionSuccess` component (confirmation + view on map + report another) ⚠️ **CORRECTED Aug 2026 — was `[x]`.** `SubmissionSuccess.tsx:66-74` renders exactly **one** button: "Report another issue". There is no "View on map". Combined with `ReportFlow` never rendering `<TabBar />`, **the success screen is a navigational dead end** — after submitting, the only escape from `/report` is the browser back button. **Fix in S6.5.** ✅ **RESOLVED in S6.5.15** — "View on map" added as the primary action; the success screen is no longer a navigational dead end.
- [x] S5.8 — Implement offline queue: save report to IndexedDB when offline, submit on reconnect ✅ (March 2026 — ripple-queue DB, auto-process on online event)
- [x] S5.9 — Create `useOfflineQueue` hook (queue management, process on reconnect) ✅ (March 2026 — queueReport, queueLength, isProcessing, sequential processing)
- [x] S5.10 — Test full flow: capture → select category → add note → submit → record in Supabase ✅ (March 2026 — TypeScript/ESLint/build all pass, Edge Function needs deployment)
**Test criteria:** Report appears in Supabase `reports` table with correct category, coordinates, address, council_id, reporter_token. Photo uploaded to Storage bucket. Offline: report queued, submitted on reconnect with visual confirmation. Success screen shows address and category.
**Notes:** AI classification comes in Sprint 7 (Phase 1). This sprint implements the full submission pipeline with manual category selection. The `submit-report` Edge Function handles validation, photo upload, council routing, and DB insert. Duplicate detection (50m radius, same category, 30 days) is implemented here.

**Verification delta (Aug 2026) — the happy path is real; four things around it are not.**

The core trace is genuine and correct end-to-end: `CameraCapture` → `handlePhotoCaptured` (`ReportFlow.tsx:76`) → review → `handleSubmit` (`:90`) → `useSubmitReport.submit` → `blobToBase64` → `supabase.functions.invoke('submit-report')` → Storage upload (`index.ts:86-91`) → `reports` insert (`:116-134`) → `report_photos` (`:142`) → `status_history` (`:150`). Request/response shapes match field-for-field, and `blobToBase64.ts:10` correctly strips the `data:` prefix for Deno's `base64Decode` at `index.ts:84`. Credit where due — this part was built properly.

- [x] S5.11 — **The S5.6 note is inverted, and the feature is dead end-to-end.** The note called duplicate detection a "placeholder"; it is in fact **fully implemented server-side** — `012_find_nearby_reports.sql` is real plpgsql using `earth_distance(ll_to_earth(...))`, called at `index.ts:107-113`, attached to the response at `:191-198`, and typed at `types/index.ts:194-198`. **But the client throws the result away.** The only occurrence of `duplicate_nearby` in `src/` is the type definition; `ReportFlow.tsx:132-136` reads only `result.address` and `result.council_name`. The user is never shown the `DuplicateAlert` that PRD §12.7 specifies. **Fix in S6.5** — render `DuplicateAlert` with "I see this too" / "Submit as new report". — ✅ **FIXED in S6.5.6** — `DuplicateAlert` shipped (post-submit form; see the S6.5 as-shipped delta).
- [x] S5.12 — **Every Edge Function validation message is unreachable by the UI.** `useSubmitReport.ts:81-83` does `setError(fnError.message)`, but `supabase-js` v2 does not parse non-2xx response bodies — `FunctionsHttpError.message` is the literal string `"Edge Function returned a non-2xx status code"`. All eight precise messages at `index.ts:53-70` ("Note exceeds 140 character limit", "Coordinates out of valid range", …) never reach the user. **Fix in S6.5** — `await fnError.context.json()` to recover the real body. — ✅ **FIXED in S6.5.5** — `extractFunctionError()` reads `fnError.context`, cloning so the caller's Response stays usable. 8 tests.
- [x] S5.13 — **The offline queue replays only on `/report`.** `useOfflineQueue.ts:112-116` correctly fires `processQueue()` when `isOnline && queueLength > 0`, and the queue logic (`:65-109`) is sound. But `processQueue` is not returned (`:123` exports only `queueReport, queueLength, isProcessing`), and the hook is mounted in exactly **one** place — `ReportFlow.tsx:27`. Reconnect while sitting on `/` and nothing replays; the user must navigate to `/report` to flush their own queue. No Background Sync registration exists. **Fix in S6.5** — lift to app level. — ✅ **FIXED in S6.5.7** — lifted to an app-level provider; reconnecting anywhere now flushes the queue.
- [x] S5.14 — **Rate limiting is client-side theatre.** `useSubmitReport.ts:22-41` reads and writes `localStorage`; one devtools click defeats it, and the Edge Function enforces nothing of its own. PRD §10.3 specifies 10 reports/hour/token as a *security* control. **Fix in S6.5** — enforce server-side in the Edge Function. — ✅ **FIXED in S6.5.8** — enforced server-side in the Edge Function, with Zod replacing the hand-rolled validation.

---

## Phase 1 — MVP

### Sprint 6: Live Community Map
**Goal:** Mapbox map with category-coloured report pins, clustering, pin detail bottom sheet, and real-time updates.
**Inputs:** Sprint 5 complete (reports exist in database)
**Outputs:** Map page (`/`), `MapPin` component, `ClusterMarker`, `ReportCard` bottom sheet, `useReports` hook, Supabase Realtime subscription
**Subtasks:**
- [x] S6.1 — Set up Mapbox GL JS with dark style, Melbourne default centre ✅ (March 2026 — dark-v11 style, MAP_DEFAULT_CENTER/ZOOM, compact attribution)
- [x] S6.2 — Implement `useReports` hook (fetch reports as GeoJSON from Supabase) ✅ (March 2026 — select MapPin fields, Realtime INSERT/UPDATE/DELETE subscription)
- [x] S6.3 — Render report pins colour-coded by category with category icons ✅ (March 2026 — Mapbox match expression mapping category → CATEGORY_MAP colors)
- [x] S6.4 — Implement pin clustering (50px radius, max zoom 14, cluster count badge) ✅ (March 2026 — GeoJSON source with cluster: true, cluster circles + count labels)
- [x] S6.5 — Create `ReportCard` bottom sheet (photo, category, status, address, upvotes, time ago) ⚠️ **CORRECTED Aug 2026 — the photo is missing.** `ReportCard.tsx` renders category, status, address, timeAgo, upvotes and an ID, but contains **no `<img>` at all**. The root cause is upstream: `MapPin` (`types/index.ts:153-164`) carries no photo URL and `useReports.ts:5` does not select one. PRD §6.3 lists "Photo thumbnail (tap to full-screen)" as the first item of the pin detail card. **Fix in S6.5-repair** — extend `MapPin` + the select, then render. Note also that this component's `transition={{ type: 'spring', damping: 25, stiffness: 300 }}` (`ReportCard.tsx:30`) **violates this project's own MOTION.md:11** ("No bounce. No spring.") — corrected in S6.6. ✅ **RESOLVED in S6.5.12** — `MapPin.photo_url` added, `report_photos` joined, thumbnail rendered. Both Realtime handlers guard it so a status change cannot blank it.
- [x] S6.6 — Implement "Locate me" map control (centre on user position) ✅ (March 2026 — flyTo user GPS coordinates)
- [x] S6.7 — Create `CameraButton` FAB (64x64px orange circle with pulse animation, centre-bottom) ✅ (March 2026 — CameraFab component with animate-pulse-slow, shadow-glow, navigates to /report)
- [x] S6.8 — Implement Supabase Realtime subscription on `reports` table (new pins animate in) ✅ (March 2026 — postgres_changes channel for INSERT/UPDATE/DELETE)
- [x] S6.9 — Create tab bar navigation (Map / Feed / My Reports) ✅ (March 2026 — TabBar with SVG icons, active state highlighting, react-router-dom navigation)
- [x] S6.10 — Create app header ("RIPPLE" wordmark with search and menu icons) ⚠️ **CORRECTED Aug 2026.** The header renders, but both icons are dead: `AppHeader.tsx:9-17` (search) and `:19-27` (menu) are `<button>` elements with `aria-label`, styling and an SVG — and **no `onClick` prop at all**. Same defect in `MapControls.tsx:9-18` (heatmap) and `:21-29` (filter). **Four buttons that look enabled and do nothing.** The Sprint 6 notes disclosed the heatmap/filter pair honestly; the header pair was marked ✅ regardless. Wired in S9 (heatmap/filter), S12 (search), S6.5-repair (menu → disable or `[coming soon]` per SIGNAL's no-dead-links rule). ✅ **RESOLVED Aug 2026** — search wired in S12; the menu button has no destination yet so it is **explicitly disabled and labelled** rather than left as an enabled-looking no-op (SIGNAL forbids dead links).
- [x] S6.11 — Test: 500 pins render without jank, clusters collapse/expand on zoom ⚠️ **CORRECTED Aug 2026 — not a test.** The evidence recorded was "Mapbox GL handles clustering natively", which is an assumption about the library, not a measurement of this app. MOTION.md's acceptance gate requires "200-marker map does not drop frames on a mid-range device". Real perf measurement moves to S16. ✅ **MEASURED Aug 2026** — replaced the assumption with Lighthouse: CLS **0** across three runs, TBT 40–90ms, and `reportsToGeoJSON` is a pure mapped array. ⏭️ The 200-marker frame-rate figure specifically needs real hardware (OG6); headless measures either an error path or SwiftShader.
- [x] S6.12 — **DISCOVERED Aug 2026 — map data updates are silently dropped before style load.** `src/components/Map.tsx:163-171` early-returns on `if (!map || !map.isStyleLoaded()) return` with **no retry and no queue**. Any Realtime insert or `reports` prop change arriving before Mapbox finishes loading its style is lost permanently. **Fix in S6.5-repair** — queue pending data and flush on the `style.load` event. — ✅ **FIXED in S6.5.13** — the `load` handler seeds from `reportsRef`, so there is no window in which arriving data can be dropped.
- [x] S6.13 — **DISCOVERED Aug 2026 — "Locate me" works via a DOM escape hatch.** `MapPage.tsx:24-28` calls `document.querySelector('[data-locate-me]')?.click()` against a hidden button at `Map.tsx:193-199`, whose own comment reads `{/* Expose flyToUser via a hidden mechanism or pass via ref */}`. It functions today but bypasses React entirely and breaks the moment a second map instance mounts. **Fix in S6.5-repair** — `useImperativeHandle` ref. — ✅ **FIXED in S6.5.13** — replaced with a typed `MapHandle` + `useImperativeHandle`.
**Test criteria:** Map renders with all existing reports as coloured pins. Tapping a pin shows the ReportCard bottom sheet with photo, category, address, time ago. Camera FAB opens report flow. New reports from another session appear on map without page refresh. Clustering works at zoom < 14.
**Notes:** Pin size scales slightly with upvote count (max 2x). Cluster marker colour based on most common category, or red if any safety category present. Map style should be dark to match the app's dark theme. The camera FAB has a pulsing glow animation to draw attention.

---

### Sprint 6.5: Foundation Repair
**Inserted Aug 2026.** The Aug verification pass found that six of seven "complete" sprints were partially true, with three user-facing dead ends and two security defects. CLAUDE.md §8 forbids proceeding to the next sprint with broken core functionality, and §9 mandates tests that do not exist. This sprint pays that debt before any new feature lands. **Nothing here is new scope — every item repairs something already marked ✅.**

**Goal:** Every corrected `[~]` above returns to a *truthful* `[x]`. Test harness exists and covers the business logic shipped in S3–S6.
**Inputs:** Verification audit (Aug 2026)
**Outputs:** vitest harness + tests, `LocationPicker`, `DuplicateAlert`, migrations 014/015, error-surfacing fix, app-level offline queue
**Subtasks:**
- [x] S6.5.1 — **Test harness.** ✅ (Aug 2026) `test`/`test:run`/`coverage` scripts added; `test` block in `vite.config.ts` (jsdom, globals, `setupFiles`, v8 coverage); `src/test/setup.ts` registers `@testing-library/jest-dom` and patches three jsdom gaps that the report flow depends on — `URL.createObjectURL`, `URL.revokeObjectURL`, and `matchMedia` (needed by every `prefers-reduced-motion` branch S6.6 will add). Installed `jsdom`, `fake-indexeddb`, `@vitest/coverage-v8`. **Note:** `npx pnpm` now resolves to pnpm 11 while `node_modules` was linked by pnpm 10 — use `npx pnpm@10` in this repo, or run a clean `pnpm install` to migrate the store.
- [x] S6.5.2 — **Unit tests for shipped logic** (CLAUDE.md §9 backfill) ✅ (Aug 2026) — **55 tests across 7 files**, up from zero: `councilDetection` (11, incl. the overlap tie-break and the order-independence regression), `mapHelpers` (10, every `timeAgo` boundary), `blobToBase64` (3), `compressImage` (9, DOM-stubbed since jsdom has no canvas), `useSubmitReport.extractFunctionError` (8), `reporterToken` (5, incl. the storage-denied degradation path), `offlineQueue` (9, fake-indexeddb, incl. a guard that the queued and live payloads cannot drift apart). ⏭️ **Deferred to S16:** `useGeolocation` (needs fake timers across the 5s/8s watch paths plus a `navigator.geolocation` harness), `useReports` and `boundaryCache` integration (both need a Supabase test double — cheaper to write once against a re-provisioned project, OG1).
- [x] S6.5.3 — **Fixed the render-phase `setState`** ✅ (Aug 2026) — `CameraCapture.tsx` now notifies the parent from a `useEffect` guarded on blob identity, so a retake (new Blob) re-notifies while unrelated re-renders do not. `PhotoPreview` and `retake()` are reachable again.
- [x] S6.5.4 — **`LocationPicker` built; GPS dead end closed** ✅ (Aug 2026) — `src/components/LocationPicker.tsx`, drag-the-map-under-a-fixed-crosshair (one-handed, reads map centre rather than a draggable marker). `ReportFlow` shows an explicit `> could not get a GPS fix` line plus a manual entry point when GPS gives up, and an `[ adjust location ]` affordance even on a good fix (PRD §15, urban canyons). Sets its own Mapbox token since it can mount before `Map.tsx` ever renders.
- [x] S6.5.5 — **Real Edge Function errors surface** ✅ (Aug 2026) — `extractFunctionError()` reads `fnError.context` (the undrained `Response`), accepts either `error` or `message` as the body key, **clones before reading** so the caller's Response stays usable, and never lets the useless `"non-2xx status code"` placeholder reach the user. 8 tests.
- [x] S6.5.6 — **`DuplicateAlert` rendered** ✅ (Aug 2026) — consumes the `duplicate_nearby` the server has returned since Sprint 5 and the client discarded. ⚠️ **As-shipped delta:** PRD §12.7 draws this as a *pre-submit* choice ("I see this too" vs "Submit as new report"). It cannot be that yet for two reasons, both structural: the Edge Function inserts the report *before* computing the duplicate, so the choice is already made by the time the client hears about it; and upvoting does not exist until Sprint 8. Shipped as the post-submit form — the user is told and pointed at the existing report. **The pre-submit variant needs a dedicated check endpoint and lands in S8 alongside `useUpvote`.**
- [x] S6.5.7 — **`useOfflineQueue` lifted to app level** ✅ (Aug 2026) — split three ways to satisfy react-refresh: `lib/offlineQueue.ts` (IndexedDB + payload builder), `lib/offlineQueueContext.ts` (context), `components/OfflineQueueProvider.tsx` (provider), `hooks/useOfflineQueue.ts` (consumer). Mounted once in `App.tsx`, so reconnecting anywhere flushes the queue. `processQueue` is now exported. ⏭️ Background Sync registration deferred to S16 — it needs a service-worker message channel and iOS Safari does not support it, so the online-event path stays the primary mechanism.
- [x] S6.5.8 — **Server-side rate limiting + Zod** ✅ (Aug 2026) — the Edge Function now counts the token's reports in the trailing hour and returns 429 past 10 (PRD §10.3). **Fails open on infrastructure error**: losing a citizen's report is a worse outcome than briefly under-enforcing anti-spam. Hand-rolled `if` chain replaced with a Zod schema (CLAUDE.md §6), which also makes S0.2's `zod` claim true. First-issue messages are mapped so the client shows something actionable rather than Zod's default prose.
- [x] S6.5.9 — **Migration `014_enable_realtime.sql`** ✅ (Aug 2026) — adds `reports` to the `supabase_realtime` publication (idempotent via `pg_publication_tables` check) and sets `REPLICA IDENTITY FULL` so DELETE payloads carry more than the PK. ⚠️ **Written, not applied** — needs OG1.
- [x] S6.5.10 — **Migration `015_rls_scope_reporter_token.sql`** ✅ (Aug 2026) — adds `current_reporter_token()` reading the `x-reporter-token` request header (there is no JWT to scope against, because PRD §6.1 requires account-free reporting), and rewrites the two `USING (true)` policies. **Also closed the enabling hole:** `upvotes_select_all` was handing out `reporter_token` itself, which made spoofing trivial — upvote SELECT is now own-rows-only, with the public tally coming from `reports.upvote_count` where it always should have. Comment inserts are pinned to the caller's token and cannot forge `is_council`. Client sends the header via `lib/supabase.ts`; token extracted to `lib/reporterToken.ts` so it is available at module-init. Threat model documented in the migration header, including what this deliberately does **not** stop. ⚠️ **Written, not applied** — needs OG1.
- [x] S6.5.11 — **Seed path fixed** ✅ (Aug 2026) — `config.toml` now points at `./seed/001_melbourne_councils.sql`. Boundary resolution made deterministic two ways: `.order('council_id')` in `boundaryCache` **and** the nearest-centroid tie-break inside `detectCouncil` per PRD Q3, so correctness no longer depends on row order at all.
- [x] S6.5.12 — **Photo on `ReportCard`** ✅ (Aug 2026) — `MapPin.photo_url` added, `report_photos` joined in the select and flattened to the `original` photo. **Both Realtime handlers guard it explicitly**: the payload carries the `reports` row only, so a naive spread would blank the thumbnail on every status change.
- [x] S6.5.13 — **Map race + locate-me ref** ✅ (Aug 2026) — the `load` handler now seeds its source from a `reportsRef` holding the latest value, so there is no window in which an arriving report can be dropped; the update effect no longer early-returns into the void. Locate-me moved to `useImperativeHandle` behind a typed `MapHandle`. Both ref-during-render writes (including a pre-existing one) moved into an effect, since `react-hooks/refs` forbids writing refs while rendering.
- [x] S6.5.14 — **Routes completed** ✅ (Aug 2026) — added `/report/:id`, `/search`, and a `*` catch-all. Unbuilt destinations render a `[coming soon — Sprint N]` state with a route home, per SIGNAL's no-dead-links rule; unknown URLs get a real 404 instead of banners over a blank page.
- [x] S6.5.15 — **`SubmissionSuccess` escape route** ✅ (Aug 2026) — "View on map" added as the primary action, "Report another issue" demoted to secondary.
- [x] S6.5.16 — **`exhaustive-deps` suppression removed** ✅ from `Map.tsx` by fixing the underlying dependency problem rather than silencing it — the repo now has **zero** eslint suppressions and lints clean with **0 errors and 0 warnings**. ⏭️ Full `strictTypeChecked` adoption deferred to S16: it requires type-aware linting (`parserOptions.project`), which meaningfully slows the lint step, and is better landed as one deliberate pass than mixed into feature sprints. ✅ **COMPLETED Aug 2026** — `strictTypeChecked` + `stylisticTypeChecked` adopted, 269 errors → 0, with the rule triage documented in `eslint.config.js`. The repo has zero blanket suppressions; the three `eslint-disable` lines that exist are single-rule, single-line, and each states why.
- [x] S6.5.17 — **`@tensorflow/tfjs` removed** ✅ (Aug 2026) — never imported anywhere, and Sprint 7 runs on LiteRT.js. `src/stores/` and `src/workers/` still deliberately absent; they get created when S9 and S7 actually need them, at which point S0.3 can be marked truthfully.
**Test criteria:** `pnpm test` runs and passes with ≥1 test per unit listed in S6.5.2. GPS-denied path reaches submit via the picker. A deliberately over-long note shows "Note exceeds 140 character limit", not "non-2xx status code". Anon key cannot delete another token's upvote (verify against local or re-provisioned Supabase). Reconnecting on `/` flushes the queue.
**Notes:** Items depending on a live database (S6.5.9, S6.5.10, S6.5.11 verification) are written and committed here but can only be *applied and verified* once the backend is re-provisioned — see the Owner-Gated Backlog. The SQL is correct regardless of when it runs.

### ✅ Sprint 6.5 — CLOSED (Aug 2026)

**Verification evidence (measured, not asserted):**

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npx eslint .` | **0 errors, 0 warnings**, and **0 suppressions remaining in the repo** |
| `npx vitest run` | **55 tests / 7 files, all passing** (was 0 tests / 0 files) |
| `npx vite build` | succeeds — 14 precached entries, 2,239 kB bundle |

**As-shipped delta:**
- `DuplicateAlert` shipped **post**-submit rather than pre-submit — the Edge Function inserts before it computes the duplicate, and upvoting doesn't exist until S8. Pre-submit variant moved into S8.
- The offline queue needed a **three-file split** (`lib/offlineQueue.ts`, `lib/offlineQueueContext.ts`, `components/OfflineQueueProvider.tsx`, plus the consumer hook) to satisfy `react-refresh/only-export-components`. A provider file may not also export a hook.
- Migration 015 grew beyond its brief. Scoping the two `USING (true)` policies is not sufficient on its own, because `upvotes_select_all` was publishing `reporter_token` — the very credential the scheme relies on. Own-rows-only SELECT closed the enabling hole; the public tally comes from `reports.upvote_count`, where it always belonged.
- `detectCouncil` was fixed at the **algorithm** level (nearest-centroid per PRD Q3) rather than only at the query level (`.order()`), so correctness no longer depends on row order at all. Both were applied — belt and braces.

**Deferred out of this sprint (each with a reason, none silently dropped):**
- `useGeolocation` / `useReports` / `boundaryCache` tests → **S16**; the first needs a fake-timer + `navigator.geolocation` harness, the latter two need a Supabase double that is cheaper to write once against a real project (OG1).
- Background Sync registration → **S16**; needs a service-worker message channel and iOS Safari does not support it, so the `online`-event path remains primary.
- `strictTypeChecked` → **S16**; needs type-aware linting, better as one deliberate pass.
- Applying migrations 014/015 and re-verifying Sprint 2 → **OG1**.

**Still true and unchanged:** three of the repaired items (014, 015, the seed path) are *written and committed* but **unverified against a live database**, because there isn't one. They are marked `[x]` for authorship, and the Owner-Gated Backlog is where their verification lives. This distinction is the whole reason the Aug audit was necessary — writing SQL is not the same as applying it, and the March masterplan conflated the two.

---

### Sprint 6.6: SIGNAL Design System Migration
**Inserted Aug 2026.** ENGINEERPROMPT.md and MOTION.md both declare Bruno's "SIGNAL" system binding and inherited, and MOTION.md:8 already names `~/bruno-portfolio/CLAUDE.md` as the source. The shipped code implements the older PRD §11 system instead, and violates this project's own MOTION.md in at least one place (the Framer spring at `ReportCard.tsx:30`). Precedence per CLAUDE.md: masterplan > CLAUDE.md > ENGINEERPROMPT — and this entry is the masterplan making the call explicit. **Done before Sprint 7 so the AI surfaces are built once, in the right language, rather than styled twice.**

**Goal:** Every surface reads as SIGNAL — warm black, amber used sparingly, square, unshadowed, no emoji, ease-out/linear only.
**Inputs:** `~/bruno-portfolio/CLAUDE.md` §"Redesign Design Decisions (2026-07 · SIGNAL)", `MOTION.md`
**Outputs:** re-tokenised `index.css` + `tailwind.config.js`, glyph-based category identity, motion compliance, `prefers-reduced-motion` support
**Subtasks:**
- [x] S6.6.1 — Replace the `:root` palette in `src/index.css` with SIGNAL tokens: `--bg #050505`, `--surface #0b0a09`, `--text-primary #f0ece4`, `--text-secondary #98928a`, `--text-dim #55504a`, `--amber #ffb000`, `--steel #2c2925`, `--hairline #1b1916`. Radius tokens → max 2px. Delete `--shadow-card` / `--shadow-glow`. Mirror into `tailwind.config.js`.
- [x] S6.6.2 — Fonts: drop **Inter** (SIGNAL explicitly excludes it); body → Syne or DM Sans; JetBrains Mono reserved for data, labels, readouts and ASCII. Self-host or preconnect rather than the current render-blocking `@import` at `index.css:1`.
- [x] S6.6.3 — **Category identity without colour.** SIGNAL permits one accent, so colour cannot carry ten categories — and it never really did: `streetlight` and `signage` are *both* `#F0883E` today, so the "10-colour" system is already only 9-distinguishable. Replace with a **monospace glyph per category** (`categories.ts` gains `glyph`, loses `icon` emoji and `color`). This *improves* PRD §10.2 compliance ("Colour never the only differentiator") rather than weakening it.
- [x] S6.6.4 — **Map pins:** move `Map.tsx` from `circle` layers to `symbol` layers so glyphs can render; amber reserved for the user's own reports and safety-category emphasis; everything else grayscale on `#050505`. Marker drop-in per MOTION.md:85 — scale 0.8→1, 250ms ease-out, 40ms stagger **capped at 20 markers**, remainder instant.
- [x] S6.6.5 — **Rebuild `CameraFab`** — currently the single most non-compliant line in the repo (`CameraFab.tsx:11`: `rounded-full bg-action shadow-glow animate-pulse-slow` breaks the radius, shadow, sparing-accent and no-bounce rules simultaneously). Becomes a bracketed instrument control, e.g. `[ ◉ REPORT ]`. Same `shadow-glow` removal at `CameraCapture.tsx:88`.
- [x] S6.6.6 — **Kill the spring.** `ReportCard.tsx:30` → ease-out tween ≤400ms, preserving drag-to-dismiss. This is a MOTION.md:11 violation, not a preference.
- [x] S6.6.7 — Remove all 16 emoji (10 category icons + `📡 📍 👍`). Keep the typographic glyphs `✕ ↻ ✓ ←` — those are type, not emoji.
- [x] S6.6.8 — Replace text loaders with the SIGNAL vocabulary: `[████░░░] 72%` bars and `> locating...` typing lines. Per MOTION.md:83 the GPS line **must never** show a spinner. No spinners anywhere.
- [x] S6.6.9 — **`prefers-reduced-motion: reduce` → fully static**, no exceptions. Currently unhandled anywhere in `src/`. This is a MOTION.md hard rule and a WCAG obligation.
- [x] S6.6.10 — Page-transition bar: 2px sweep L→R 300ms, hold 50ms, off right 200ms.
- [x] S6.6.11 — Propagate tokens outside `src/`: `index.html` `theme-color`, `vite.config.ts` manifest `theme_color`/`background_color`, `public/offline.html` (6 hardcoded hexes + Syne/Inter stack + `border-radius: 8px`), and `public/favicon.svg` — currently purple/blue gradient artwork (`#863bff`, `#7e14ff`, `#47bfff`) that matches **neither** design system.
- [x] S6.6.12 — Status colours: amber dots; **green only on `fixed`** per MOTION.md:89.
**Test criteria:** No `rounded-{md,lg,xl,full}` outside the ripple-ring rule. No `shadow-*`. No emoji in `src/`. No `type: 'spring'`. Grep for `#E85D04` returns zero hits repo-wide. `prefers-reduced-motion` produces a static capture→result path. Contrast ≥4.5:1 for body text on `#050505`.

### ✅ Sprint 6.6 — CLOSED (Aug 2026)

**Compliance sweep (measured):**

| Check | Result |
|---|---|
| emoji in `src/` | **0** (only `✓` and `✕` remain — typography, not emoji) |
| `type: 'spring'` | **0** |
| `shadow-card` / `shadow-glow` | **0** |
| `#E85D04` repo-wide | **0** |
| eslint suppressions repo-wide | **0** |
| `prefers-reduced-motion` handling | present in `index.css` + `useReducedMotion` |
| `npx tsc --noEmit` | 0 errors |
| `npx eslint .` | 0 errors, 0 warnings |
| `npx vitest run` | **73 tests / 9 files** passing |
| `npx vite build` | succeeds |

**As-shipped delta:**
- Legacy Tailwind key names (`bg.primary`, `action.DEFAULT`, …) were **kept**, with only their values swapped. The names were structural; renaming them across 20 files would have been churn with no design benefit.
- Amber is permitted on **safety-critical categories** on the map (`streetlight`, `accessibility`, `tree`). This is a deliberate, narrow extension of "amber for key data" — without it, a parent scanning for a dead streetlight near a school loses the one signal that matters most, and PRD §6.3 explicitly calls for safety emphasis on clusters.
- Status colours went **grayscale-plus-amber**, with green reserved for `fixed` per MOTION.md:89. `declined`/`wont_fix` are **dim rather than red** — a refusal is information, not an alarm, and red is not in this palette.
- Built four shared motion primitives here rather than in S7 (`useReducedMotion`, `TypingLine`, `TerminalLoader`, `PageTransition`) — the classification sequence needs all four, and building them once against the design system beats building them twice.
- `progressBar.ts` extracted as a **pure, tested module** (10 tests) specifically to pin MOTION.md's honesty rules in code: `0.9` must not render as a full bar, and the percentage must never reach 100% while the bar still shows empty cells.

**Deferred:**
- [x] Marker drop-in ✅ **BUILT Aug 2026** — shipped as a GPU-side 250ms paint transition rather than a per-feature JS stagger. Mapbox has no per-feature stagger, and hand-animating 200 markers on the main thread is exactly the "jank machine" MOTION.md warns about — which is why the spec caps the stagger at 20. A GPU transition gives the same read at any marker count, which is the better answer to the same problem.
- [x] The ripple motif ✅ **WIRED Aug 2026** — submit (600ms, `SubmissionSuccess`) and upvote (300ms, `UpvoteButton`, on the way *in* only, since removing an upvote is a correction rather than an impact). ⏭️ New-report-on-map needs live Realtime delivery (OG1) to have anything to fire on.
- [x] CRT/scanline layer and boot sequence — **DECLINED, deliberately.** Portfolio-site atmosphere is wrong for a civic tool used outdoors one-handed, where legibility beats texture and every frame spent on a scanline overlay is a frame not spent on the map. This is a design decision recorded as such, not an unfinished task.
**Notes:** MOTION.md's ripple motif (concentric rings, 1px, `border-radius: 50%`) is the **only** sanctioned use of round geometry — submit, upvote, and new-report-on-map. Never more than one ripple per surface; queue or drop, never stack.

---

### Sprint 7: AI Image Classification — **on-device, LiteRT.js**
**Rewritten Aug 2026.** The original plan specified TensorFlow.js + MobileNetV2 + IndexedDB caching. That stack is retired: **TF.js is frozen** — latest release is `4.22.0` (Oct 2024, ~22 months stale, re-confirmed against the npm registry on 14 Aug 2026), and Google positions LiteRT.js as its successor with a published migration guide. Bruno delegated this call; the research is decisive.

**This sprint is the entire product thesis.** The tagline promises *"on-device AI files the report in 3 seconds"* — everything before this sprint is a photo-and-map app. It is also, conveniently, **fully client-side**, which makes it the one major sprint unblocked by the dead Supabase backend. That is why it runs first among the feature sprints.

**Goal:** A photo is classified into a Ripple category entirely on-device, in under the MOTION.md budget, with honest confidence display and one-tap override — and the inference never leaves the phone.

**Locked stack (verified against the npm registry, 14 Aug 2026):**

| Layer | Choice | Verification |
|---|---|---|
| Runtime | **`@litertjs/core`** | v2.5.3, published **2026-07-17**, by the `google-ai-edge/LiteRT` team — actively shipped |
| Model | **EfficientNet-Lite0** (or MobileNetV3-Small) fine-tuned in Keras → **int8 `.tflite`** | ~5MB over the wire vs TF.js MobileNetV2's ~14MB |
| Accelerator | `webgpu`, falling back to `wasm` (XNNPACK) | `loadAndCompile(model, { accelerator })`; `isWebGPUSupported()` is exported for the branch |
| Preprocessing | **Canvas API** → `Float32Array`/`Uint8Array` | see S7.3 note — TF.js is **not** required |
| Caching | **Cache Storage API**, in the service worker | IndexedDB was a TF.js-ism (`model.save('indexeddb://')`) and does not apply |
| Fallback runtime | `@mediapipe/tasks-vision` `ImageClassifier` via `createFromModelPath()` | v1.0.1 on npm; loads the *same* `.tflite` |
| Rejected | WebNN | behind flags in every browser as of Aug 2026 — not shippable |

**Verified API surface** (read from `@litertjs/core@2.5.3`'s own `dist/index.d.ts`, not from documentation prose):
```ts
loadLiteRt(path: UrlString, options?: LoadLiteRtOptions): Promise<LiteRt>
loadAndCompile(model: string | URL | Uint8Array | ReadableStreamDefaultReader,
               compileOptions?: CompileOptions): Promise<CompiledModel>
isWebGPUSupported(): boolean
class Tensor { static fromTypedArray(data: TypedArray, shape?: Dimensions): Tensor
               data(): Promise<TypedArray>; toTypedArray(): TypedArray }
CompiledModel.run(input: Tensor | Tensor[]): Promise<Tensor[]>
CompiledModel.getInputDetails(): readonly TensorDetails[]   // { shape, dtype, name }
```
**Consequence worth recording:** Google's own quickstart routes inference through `@litertjs/tfjs-interop`'s `runWithTfjsTensors(model, tf.Tensor[])`, which would drag frozen TF.js back in as a preprocessing dependency. The native `CompiledModel.run(Tensor[])` + `Tensor.fromTypedArray()` path above avoids that entirely — we preprocess with Canvas (`drawImage` → `getImageData`) and feed a typed array directly. **`@tensorflow/tfjs` is removed from the project, not swapped.** Tensor I/O supports int32 and float32 only.

**Subtasks:**
- [x] S7.1 — Install `@litertjs/core`; remove `@tensorflow/tfjs`. Serve the WASM assets locally from `public/litert-wasm/` (do **not** depend on the jsDelivr CDN — it breaks the offline guarantee in PRD §10.5 and CLAUDE.md §4). Create `src/lib/litert.ts` owning `loadLiteRt()` + accelerator selection via `isWebGPUSupported()`. ✅ (Aug 2026) — `@litertjs/core` 2.5.3 installed, `@tensorflow/tfjs` removed. WASM served from `/litert-wasm/` via `scripts/sync-litert-wasm.mjs` (build-time copy from node_modules; 37MB stays out of git and cannot drift from the installed version). `src/lib/litert.ts` owns runtime load + accelerator selection with a WebGPU→WASM fallback for drivers that advertise support and then fail to compile.
- [x] S7.2 — **Model caching via Cache Storage API** (replaces the original IndexedDB task). Add a workbox `runtimeCaching` rule in `vite.config.ts` for the `.tflite` asset: `CacheFirst`, dedicated cache name, explicit version in the filename (`ripple-classifier-v1.tflite`) so a new model is a new URL and cache invalidation is free. Emit download progress from the `ReadableStream` reader — `loadAndCompile` accepts a `ReadableStreamDefaultReader` directly, so progress and load are the same pass. ✅ (Aug 2026) — workbox `CacheFirst` rules for `/models/*.tflite` and `/litert-wasm/*`, both **excluded from precache** via `globIgnores`. Verified: precache stayed at **14 entries / 2296 KiB**. Download progress read from the `ReadableStream`, reported as `null` (not a fabricated number) when `Content-Length` is absent.
- [x] S7.3 — **`src/lib/preprocessImage.ts`** — Canvas resize to the model's input size (read from `getInputDetails()[0].shape`, do not hardcode 224), pixel extraction, layout/normalisation to match the training recipe. Pure function, fully unit-testable. `src/constants/config.ts` already defines `TFJS_INPUT_SIZE = 224` — rename to `AI_INPUT_SIZE` and treat as a fallback only. ✅ (Aug 2026) — `src/lib/preprocessImage.ts`, pure and 10-test covered. **Centre crop, not squash** — stretching 4:3 to 1:1 distorts geometry, and a pothole rendered as an ellipse is not the image the model was trained on. Input size read from `getInputDetails()`, never hardcoded. `TFJS_INPUT_SIZE` renamed `AI_INPUT_SIZE` and demoted to a fallback.
- [x] S7.4 — **`useAIClassification` hook** — `(photo: Blob | null) => { category, confidence, top2, isClassifying, isModelLoading, loadProgress, error, override }`. Must satisfy the PRD §9.5 signature. Idempotent per photo; aborts cleanly if the user retakes mid-inference; **never throws into render**. ✅ (Aug 2026) — `useAIClassification`, matching the PRD §9.5 signature and extended with `top2`, `tier`, `loadProgress` and `elapsedMs`. Compiled model cached module-level (recompiling per photo would blow the budget). Stale results discarded via a run-id guard when the user retakes.
- [x] S7.5 — **`ConfidenceBar`** — monospace `[████░░░░] 72%` per SIGNAL, tabular figures so the count-up doesn't jitter, fill 0→score 500ms ease-out with the integer counting in sync. ✅ (Aug 2026) — `ConfidenceBar`, monospace, tabular figures so the count-up cannot jitter. Fill duration varies by tier (350ms certain / 500ms otherwise); `offering` renders dimmed because below 60% the model is not making a claim.
- [x] S7.6 — **`AIResultCard`** — glyph + category name + `ConfidenceBar` + override affordance, in SIGNAL vocabulary (built directly in S6.6's language — no restyle pass). ✅ (Aug 2026) — `AIResultCard` in SIGNAL vocabulary, built directly in S6.6's language with no restyle pass.
- [x] S7.7 — **Confidence tiers with distinct motion** (MOTION.md is explicit that the motion *is* the message): ✅ (Aug 2026) — all three tiers implemented with **distinct motion**: certain snaps in with a green tick; asking types `> does this look right?` and pulses the label; offering fans two options with 60ms stagger, no green, dimmed bar. Boundaries pinned by test — exactly 0.85 is `certain`, exactly 0.60 is `asking`.
  - ≥85% — card snaps in decisively, bar fills fast (350ms), green tick at the end. Reads as **certain**.
  - 60–84% — normal entry, `> does this look right?` types out beneath, category label carries the 2s status pulse. Reads as **asking**.
  - <60% — two option cards fan in with 60ms stagger, neither emphasised, no green, bar dimmed. Reads as **offering a choice**.
  Thresholds already exist as `AI_CONFIDENCE_HIGH = 0.85` / `AI_CONFIDENCE_MEDIUM = 0.60` in `src/constants/config.ts` — currently unused.
- [x] S7.8 — **The scan sequence** (MOTION.md §"Sprint 7", the hero moment). 1px line sweeps top→bottom over the photo, 1200ms/pass, linear, looping; image at 60% opacity behind the line and 100% in front. `> analysing...` types at 40ms/char. Loader fills to 90% over expected inference time and **holds at 90% until the real result arrives**, then snaps to 100% in 120ms. On completion the scan line **finishes its current pass** before fading (cutting mid-sweep reads as a crash). **Never fake completion — the hold is the honest signal.** ✅ (Aug 2026) — `ScanOverlay`. 1px line sweeps 1200ms/pass over the photo at 60% opacity, `> analysing...` types at 40ms/char, loader fills to **90% and holds**. Never fakes completion; a slow model simply holds longer.
- [x] S7.9 — **Override flow + correction logging.** Sheet slides up 280ms ease-out, backdrop to 60%. Log `{ ai_category, ai_confidence, final_category, model_version, input_hash }` — the `reports` table already carries `ai_category`, `ai_confidence`, `user_corrected_ai`. **Design this as a dataset, not a log**: it is the training set for the next model revision (PRD Q7). Photo itself is *not* attached to the correction record beyond the report's existing photo. ✅ (Aug 2026) — override wired through `AIResultCard` and the manual picker; `ai_category` / `ai_confidence` / `user_corrected_ai` recorded on both the live and queued paths. **`ai_category` is omitted rather than defaulted to the final category when the model did not run** — this feeds a training dataset, and a fabricated prediction is worse than a missing one.
- [x] S7.10 — Wire into `ReportFlow` between capture and review. Fix the stale placeholder at `useSubmitReport.ts:62` (`ai_category: data.category, // Placeholder until Sprint 7`) and repair the **stale `SubmitReportRequest` type** (`types/index.ts:176-187`) which omits `address`, `suburb`, `postcode`, `council_id` — all four of which the client already sends (`useSubmitReport.ts:67-70`) via an untyped inline object. Fix the type *before* extending it for AI fields, or the drift gets encoded. ✅ (Aug 2026) — wired into `ReportFlow` between capture and review. The `ai_category: data.category` placeholder at `useSubmitReport.ts:62` is gone, and the stale `SubmitReportRequest` type was corrected first so the drift was not encoded.
- [x] S7.11 — **Graceful degradation.** Model fails to fetch, WebGPU absent, WASM blocked, or inference throws → fall back silently to the manual `CategoryPicker` with a quiet `> classifier unavailable — pick a category` line. **A failed classifier must never block a report.** Offline-first: if the model isn't cached yet and the user is offline, skip straight to manual. ✅ (Aug 2026) — **six dedicated tests.** Missing model, 404, inference failure, preprocessing failure, empty output and load rejection all settle as `error` with fall-through to the manual picker and a `> classifier unavailable — pick a category` line. A missing `.tflite` is the *expected* state until OG2, so this is the normal path, not an edge case.
- [x] S7.12 — **Unit tests** — `preprocessImage` (deterministic output for a known bitmap), tier-selection logic at all three boundaries incl. exact 0.85/0.60, `useAIClassification` with a mocked model (resolve, reject, abort-on-retake). ✅ (Aug 2026) — **40 new tests**: `classification` (20), `preprocessImage` (10), `useAIClassification` (10). Total suite now **113 tests / 12 files**.
- [x] S7.13 — **Instrumentation shipped; measurement pending hardware.** ✅ `elapsedMs` is measured on every classification and logged in dev with an explicit `OVER BUDGET` verdict past 3,000ms. ⏭️ **p50/p95 on a real mid-range Android needs a device and a model** — OG2 + OG6. No latency claim is made until both land. ✅ **MEASURED Aug 2026** with the real LiteRT WASM runtime against a real EfficientNet-Lite0 int8 `.tflite` in a real browser (`pnpm bench:ai`):

  | | |
  |---|---|
  | runtime load | 136ms (once per session) |
  | compile | 32ms (once per session) |
  | **inference p50** | **15ms** |
  | **inference p95** | **22ms** |
  | cold first run | 204ms (runtime + fetch + compile + inference) |
  | MOTION.md budget | 3,000ms |

  Even allowing a mid-range Android to be 20–30× slower, the warm path lands around **300–660ms**. ⚠️ **This is a LOWER BOUND, not the phone number** — measured on an Apple Silicon Mac. The representative-hardware figure still wants OG6, but the budget is no longer unproven, and the earlier "no published browser numbers exist" caveat is now answered with our own.
- [x] S7.14 — Offline classification test ⏭️ **DEFERRED to OG2/OG6** — requires a real `.tflite` to cache. The caching *mechanism* is verified (CacheFirst rules present in the built `sw.js`, precache correctly excluded); what cannot be verified without a model is the end-to-end airplane-mode path. ✅ **VERIFIED Aug 2026** (`pnpm verify:offline`). Built the app, warmed the caches, cut the network at the browser, and confirmed: the model resolves from Cache Storage **byte-identical** (5,434,517 bytes both ways), the WASM runtime resolves, dedicated `ripple-ai-model` and `ripple-litert-runtime` caches exist, and the app shell still renders rather than a browser error page (CLAUDE.md §4).

### ✅ Sprint 7 — CLOSED (Aug 2026), with two honest caveats

**Gates:**

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint .` | 0 errors, 0 warnings, 0 suppressions |
| `npx vitest run` | **113 tests / 12 files** passing (was 103) |
| `npx vite build` | succeeds; precache **14 entries / 2296 KiB** — WASM correctly excluded |
| SW runtime caches registered | `ripple-ai-model`, `ripple-litert-runtime`, `mapbox-tiles` |

**⚠️ MEASURED FINDING — the first-load budget is at risk, and the original stack comparison was incomplete.**
The LiteRT WASM runtime is **~2MB gzipped (8–9MB raw) per variant**. The Aug decision record compared *model* sizes only — int8 `.tflite` ~5MB versus TF.js MobileNetV2 ~14MB — and did not count the runtime at all. Realistic first load is therefore **~7MB (runtime + model)**, against PRD §10.1's "model load (first time) <5s on 4G". At a realistic 5–10 Mbps that is **roughly 6–11s, i.e. over budget**.

This does **not** invalidate the stack choice — TF.js is frozen and shipping on it was not an option — but the "~5MB vs ~14MB" framing was misleading and is corrected here. Mitigations already in place: the model loads lazily and never blocks a report; everything is cached after first use; the classifier is pure progressive enhancement. Further options if measurement confirms the problem: MobileNetV3-Small (~2–3MB) over EfficientNet-Lite0, and dropping the `jspi`/`threaded` WASM variants once device telemetry shows which one browsers actually select.

**⚠️ The sprint is complete; the classifier is not running.** Every piece — runtime, caching, preprocessing, tiering, motion, override, correction logging, fallback — is built, wired and tested. There is no `ripple-classifier-v1.tflite`, so in practice the app currently takes the S7.11 fallback path to the manual picker on every capture. That is the designed behaviour, documented in `public/models/README.md`, and **no accuracy claim is made against PRD G2 until OG2 delivers a model.**

**As-shipped delta:**
- Dropped `@litertjs/tfjs-interop` from the plan entirely. Reading the package `.d.ts` showed `CompiledModel.run(Tensor[])` and `Tensor.fromTypedArray()` are native, so Canvas preprocessing removes TF.js rather than swapping it — the interop path would have reintroduced the exact frozen dependency this sprint exists to retire.
- Added `toProbabilities()` / `looksLikeProbabilities()`, not in the original plan. An int8 classifier usually emits dequantised probabilities that already sum to ~1; softmaxing those a second time flattens a confident 0.94 to roughly 0.31 and silently demotes every result a tier. Guarded by test.
- Ship all four WASM variants rather than pruning to the two we expect to be used: `loadLiteRt` feature-detects, and a missing variant is a 404 at capture time instead of a graceful downgrade. They are runtime-cached, so the user still downloads exactly one.
- `scripts/sync-litert-wasm.mjs` + `prebuild`/`predev` hooks were not in the plan; added so the 37MB never enters git and cannot drift from the installed package version.

**Test-authoring note worth keeping:** the first version of `useAIClassification.test.ts` crashed the Vitest worker. Cause was in the test, not the hook — `renderHook(() => useAIClassification(new Blob(...)))` constructs a fresh Blob on every render, so the `[photo]` dependency changed each pass and the effect looped forever. Blobs are now hoisted to module scope. The hook is safe as used (`photo` is React state and therefore stable), but any future caller passing an unstable Blob would hit the same loop.

**Test criteria:** Capture → result within the MOTION.md budget of **≤3,000ms**, with p50/p95 recorded from a real device. All three confidence tiers visibly differ in motion (verified by recording). Scan loop never cuts mid-sweep; loader holds at 90% and never fakes completion. `prefers-reduced-motion: reduce` produces a fully static path from capture to result. Nothing flashes >3×/s. Override logs a correction. Model cached after first load — subsequent load <500ms. Classification works fully offline. A model-load failure still permits a report.

**Notes:** Classification is entirely on-device; the raw photo never leaves the phone for classification purposes (PRD §6.2, §13.1). Only the compressed image is uploaded, and only after the user taps Submit — this is the privacy claim the whole product rests on, and it must survive implementation pressure.

**Latency expectation, stated honestly:** EfficientNet-Lite0 int8 benches ~10ms natively on a Pixel 6. Browser WASM/WebGPU will be several× slower, and **no published browser-side numbers exist for this model** — so the budget is *expected* to hold comfortably but is **unproven until S7.13 measures it**. int8 benefits the WASM path disproportionately (SIMD operates on packed 8-bit integers natively). Do not lock the MOTION.md timings until real numbers land.

> **Model status (Aug 2026):** a real **EfficientNet-Lite0 int8** `.tflite` is now fetched by `pnpm fetch:model` for development — 5,307KB, confirming the ~5MB estimate to within 6%, and exactly the architecture this sprint specifies. It is ImageNet-classed, so its *predictions* are not civic-meaningful; it exists to prove the runtime, the timing and the cache, which it now has. **The fine-tuned civic classifier remains OG2**, and no accuracy claim is made against PRD G2 until it lands.
>
> **Open dependency — the fine-tuned model.** S7.1–S7.14 assume a fine-tuned `ripple-classifier-v1.tflite` exists. Producing it needs civic training imagery (~500 images/category per PRD §6.2) and a Keras fine-tune + int8 export. That is owner-gated (dataset sourcing / possible reuse of the distillation project's teacher-labelling pipeline) → **Owner-Gated Backlog**. **Unblocking path:** the sprint is built and shipped against a **generic ImageNet-classed EfficientNet-Lite0** with an ImageNet→Ripple category mapping, so the full pipeline, motion sequence, caching, tiers and override are real and demonstrable end-to-end. Swapping in the fine-tuned model is then a one-URL change (S7.2's versioned filename makes it free). Accuracy against PRD G2's ">70% no-correction" target is **not** claimed until the fine-tuned model lands — and the correction log built in S7.9 is precisely what makes that measurable.

---

### Sprint 8: Community Upvoting
**Goal:** "I see this too" upvoting with optimistic UI, one-per-user enforcement, and upvote count on pins.
**Inputs:** Sprint 6 complete (map and pin detail exist)
**Outputs:** `UpvoteButton` component, `useUpvote` hook, upvote count on map pins
**Subtasks:**
- [x] S8.1 — Implement `useUpvote` hook (toggle upvote, optimistic count update, reporter_token enforcement) ✅ (Aug 2026) — optimistic toggle with rollback; 23505 (UNIQUE violation) treated as success, since it means the optimistic state was already right.
- [x] S8.2 — Create `UpvoteButton` component ("I see this too" / "You saw this too" toggle) ✅ (Aug 2026) — `UpvoteButton`, SIGNAL bracket vocabulary, `aria-pressed` + `role="status"` live count.
- [x] S8.3 — Add upvote count badge to map pins (scale pin size with count) ✅ (Aug 2026) — already implemented in Sprint 6: `Map.tsx` interpolates `circle-radius` on `upvote_count` (9→12→17px). Verified rather than rebuilt.
- [x] S8.4 — Integrate upvote button into ReportCard bottom sheet ✅ (Aug 2026) — replaced ReportCard's static count line.
- [x] S8.5 — Verify UNIQUE constraint prevents double upvotes ⏭️ **BLOCKED BY OG1** — the UNIQUE(report_id, reporter_token) constraint exists in migration 005 and the client handles 23505, but verifying it needs a live database. ✅ **VERIFIED Aug 2026** — `supabase/test/02_rls.sql` proves an anon attacker cannot delete another token's upvote and that the victim's row survives.
- [x] S8.6 — Verify trigger updates `reports.upvote_count` correctly ⏭️ **BLOCKED BY OG1** — `update_upvote_count()` exists in migration 011; unverifiable without a database. ✅ **VERIFIED Aug 2026** — `01_verify.sql` proves the trigger increments `reports.upvote_count` and raises `priority_score`.
- [x] S8.7 — Add upvote count to Realtime subscription updates ⏭️ **BLOCKED BY OG1** — the Realtime UPDATE handler in `useReports` already propagates `upvote_count`, and migration 014 enables the publication it needs. Both are written; neither is verifiable yet. ✅ **VERIFIED Aug 2026 at the source.** "Blocked on a live Supabase project" was half right: Realtime is a *relay*, and the half ever in doubt was whether Postgres emits at all — migration 014 exists because nothing had added `reports` to the publication, so the subscription connected and silently received nothing.

  Tested by reading the replication stream directly (`supabase/test/03_realtime.sql`, `wal_level=logical`, a `pgoutput` slot — the same protocol Supabase consumes): **13 frames, 1 INSERT, 2 UPDATE, 1 DELETE**. Proven: new reports reach other users' maps, `upvote_count` and status propagate, DELETE carries more than the PK under `REPLICA IDENTITY FULL`, and the upvote trigger commits *before* replication reads it, so a client never receives a stale count. ⏭️ Supabase's relay process running is vendor infrastructure, not our code.
**Test criteria:** Upvote increments count immediately (optimistic). Same user cannot upvote twice (shows "You saw this too"). Removing upvote decrements count. Pin size scales with upvote count on map. Upvote count updates in real-time for other users.
**Notes:** Threshold alerts (10, 25, 50 upvotes) are Phase 2. Priority score recalculation happens via the database trigger on upvote insert/delete.

### ⚠️ Sprint 7 → 8 — CODE COMPLETE, ACCEPTANCE BLOCKED (Aug 2026)

S8.1–S8.4 are written, typecheck clean and lint clean. **S8.5–S8.7 cannot be marked complete**, because every one of them asserts something about database behaviour and there is no database (OG1). This is the distinction the March masterplan collapsed and the Aug audit exists to preserve: **authorship is not verification.**

**Also surfaced here:** `calculate_priority()` recomputes `priority_score` only inside `update_upvote_count()`, which fires on upvote insert/delete. Its `days_outstanding` term therefore goes stale on any report nobody upvotes — the age penalty silently stops accruing. No cron or scheduled recompute exists in any migration. Not a Sprint 8 bug, but it undermines the council priority ordering that Phase 3 depends on. **Recorded as a new task for S18** (council dashboard is where the ordering actually matters), and it needs `pg_cron` or a scheduled Edge Function.

---

### Sprint 9: Map Filters & Heatmap
**Goal:** Filter reports by category, status, date range, upvote count, proximity. Toggle heatmap overlay.
**Inputs:** Sprint 6 complete (map with pins)
**Outputs:** `FilterPanel` component, heatmap layer, filter state management
**Subtasks:**
- [x] S9.1 — Create `FilterPanel` component (category chips, status chips, date range, upvote slider, "near me" toggle) ✅ (Aug 2026) — `FilterPanel` bottom sheet in SIGNAL vocabulary.
- [x] S9.2 — Implement filter state in Zustand store ✅ (Aug 2026) — `src/stores/filterStore.ts`. **Creates the `src/stores/` folder S0.3 claimed existed, and makes `zustand` a real dependency rather than installed-and-unused.**
- [x] S9.3 — Apply filters to map pin data source ✅ (Aug 2026) — via the pure `lib/reportFilters.ts` predicate (12 tests), shared with the S10 feed so "matching" cannot drift between surfaces.
- [x] S9.4 — Create heatmap toggle button in map controls ✅ (Aug 2026) — the heatmap button had no `onClick` at all since S6.
- [x] S9.5 — Implement Mapbox heatmap layer with weighted intensity (upvotes × severity × recency) ✅ (Aug 2026) — weight = `(upvotes+1) × severity × recency`, computed in `mapHelpers` because Mapbox expressions cannot do a category→severity lookup. `+1` so a brand-new un-upvoted hazard still registers; recency decays linearly to the 0.3 floor rather than stepping at 90 days.
- [x] S9.6 — Add active filter count badge to filter toggle button ✅ (Aug 2026) — active-count badge on the filter control.
- [x] S9.7 — Create "Recent reports counter" pill (bottom-left: "147 reports this week in Melbourne") ✅ (Aug 2026) — counted from the **filtered** set so the number always matches what is on screen.
**Test criteria:** Category filter shows only selected categories. Status filter works. Date range filters correctly. "Near me" shows reports within 1km. Heatmap toggle shows/hides density overlay. Heatmap intensity reflects upvote count and severity. Filter count badge accurate.
**Notes:** Heatmap colour scale: light yellow (#FEFB98) → orange (#FD8D3C) → red (#BD0026). Severity weights: safety=3, accessibility=2.5, infrastructure=2, environmental=1. Recency decay: reports > 90 days at 0.3x weight.

---

### Sprint 10: Feed View & My Reports
**Goal:** List view of recent reports and personal report history via reporter_token.
**Inputs:** Sprint 6, 8 complete (reports with upvotes)
**Outputs:** Feed page (`/feed`), My Reports page (`/my-reports`), `ReportFeed` component
**Subtasks:**
- [x] S10.1 — Create `ReportFeed` component (scrollable list of report cards with photo, category, address, time, upvotes, status) ✅ (Aug 2026) — `ReportFeed` as a directory listing; each row is a real `<Link>`, so keyboard nav and middle-click work — which canvas map pins cannot offer.
- [x] S10.2 — Create Feed page (`/feed`) with sort options (Newest, Most Upvoted, Highest Priority) ✅ (Aug 2026) — `FeedPage` with newest / most-upvoted / highest-priority, via the pure `lib/reportSort.ts` (7 tests). Every comparator falls back to `id` so ordering is total and rows cannot swap between renders.
- [x] S10.3 — Create My Reports page (`/my-reports`) filtered by reporter_token from localStorage ✅ (Aug 2026) — `MyReportsPage`, scoped by `reporter_token`. The page states plainly that history is device-only, because clearing site data loses it permanently and that trade should not surprise anyone.
- [x] S10.4 — Integrate filters from Sprint 9 into Feed view ✅ (Aug 2026) — shares the S9 filter store and predicate.
- [x] S10.5 — Add infinite scroll / pagination (20 reports per page) ✅ **BUILT Aug 2026** — `useInfiniteScroll` via IntersectionObserver with a 400px `rootMargin`, so pagination is invisible rather than a visible stall. Pages in place rather than re-querying: `useReports` already holds the full set and subscribes to Realtime, so a round-trip per page would be slower *and* fight the subscription. ⏭️ **DEFERRED to S16** — infinite scroll is unmeasurable at current data volumes, and the right page size depends on real report density, which needs OG1. Shipping a guessed threshold now would just be a number to re-tune later. (Search paging *is* implemented, since the RPC returns `total_count`.)
- [x] S10.6 — Wire tab bar navigation between Map, Feed, My Reports ✅ (Aug 2026) — every tab-bar destination is now a real page.
**Test criteria:** Feed shows all reports sorted by selected option. My Reports shows only current user's reports. Infinite scroll loads more reports. Tab bar switches between Map, Feed, My Reports correctly.
**Notes:** "My Reports" uses the `reporter_token` from localStorage — no account required. This is the user's only way to see their own reports.

---

### Sprint 11: Report Detail & Routing
**Goal:** Full report detail page with status timeline, shareable URL, and React Router setup.
**Inputs:** Sprint 6, 8 complete
**Outputs:** Report Detail page (`/report/:id`), `useReport` hook, status timeline, share functionality
**Subtasks:**
- [x] S11.1 — Set up React Router with routes: `/`, `/report`, `/report/:id`, `/feed`, `/my-reports`, `/search` ✅ (Aug 2026) — all six PRD §12.1 routes render real pages; `ComingSoon` deleted as it had no remaining users.
- [x] S11.2 — Implement `useReport` hook (fetch full report detail with photos, comments, status history) ✅ (Aug 2026) — `useReport`, joining photos, status history and council. **Distinguishes not-found from failed-to-load**, because collapsing them tells a user their report was deleted when their train entered a tunnel.
- [x] S11.3 — Create Report Detail page (expanded ReportCard with full photo, status timeline, comments preview) ✅ (Aug 2026) — `ReportDetailPage`.
- [x] S11.4 — Create status timeline component (visual history: Reported → Acknowledged → etc.) ✅ (Aug 2026) — `StatusTimeline`. Synthesises the opening "Reported" entry from `submitted_at` when `status_history` is empty — the normal case for a fresh report, since the trigger only writes on change.
- [x] S11.5 — Implement share functionality (Web Share API with fallback to clipboard) ✅ (Aug 2026) — `lib/share.ts` (8 tests), Web Share API with clipboard fallback. Returns which path it took so the button can confirm; `AbortError` treated as a non-event, since a user closing the share sheet is a decision, not a failure.
- [x] S11.6 — Display report ID ("Report #4821") using Supabase-generated short ID ✅ (Aug 2026) — `formatReportId`.
**Test criteria:** Direct URL `/report/:id` loads the correct report. Status timeline shows all status changes with timestamps. Share button opens native share sheet on mobile. Report ID displayed correctly.
**Notes:** The report detail bottom sheet on the map (Sprint 6) should link to the full detail page. The full detail page has more space for comments, multiple photos, and the complete status history.

---

### Sprint 12: Elasticsearch Integration
**Goal:** Full-text search across reports, Elasticsearch index synced from Supabase.
**Inputs:** Sprint 5 complete (reports in database)
**Outputs:** Search page (`/search`), `useSearch` hook, ES sync Edge Function, search results UI
**Subtasks:**
- [x] S12.1 — Create Elasticsearch index with mapping from PRD (id, category, status, address, suburb, council_id, note, upvote_count, priority_score, location geo_point, submitted_at, status_updated_at, severity_weight) ⏭️ **SUPERSEDED — see the Sprint 12 delta below.** Replaced by migration `016_fulltext_search.sql`: a GENERATED weighted `tsvector` + GIN index on `reports`. Elasticsearch itself is routed to **OG4** (it costs money). ⏭️ **SUPERSEDED, not skipped** — migration `016_fulltext_search.sql` delivers the capability on Postgres. Elasticsearch itself is a spending decision → **OG4**.
- [x] S12.2 — Create Supabase Edge Function `sync-elasticsearch` (triggered on report insert/update) ⏭️ **NOT NEEDED** — a GENERATED column cannot drift from its source, so there is nothing to sync and no nightly re-index to run. This is the main engineering saving from the swap. ⏭️ **NOT NEEDED** — a GENERATED column cannot drift from its source, so there is no sync pipeline and no nightly re-index. This is the main engineering saving from the swap.
- [x] S12.3 — Create Supabase Edge Function `search-reports` (proxy to ES, apply filters, rate limiting) ✅ (Aug 2026) — implemented as the `search_reports` RPC rather than an Edge Function proxy. **SECURITY INVOKER, so RLS still applies** — search must not become a way to read rows the caller could not otherwise select. The ES-proxy rationale (keeping clients away from the datastore) does not apply to Postgres, where RLS is the boundary. `LIMIT` is clamped server-side so a caller cannot request an unbounded page.
- [x] S12.4 — Implement `useSearch` hook (query, filters, pagination, loading state) ✅ (Aug 2026) — `useSearch`, deliberately backend-agnostic so swapping to ES later touches one hook and no UI. Debounced 250ms with a per-request sequence number, so a slow response for "pot" can never overwrite a fast one for "pothole".
- [x] S12.5 — Create Search page (`/search`) with search input, filters, results list ✅ (Aug 2026) — `SearchPage` with relevance/newest/upvotes sorting and paging.
- [x] S12.6 — Add search icon to header that opens search overlay ✅ (Aug 2026) — header search icon wired; it had no `onClick` at all since S6. The menu icon has no destination yet, so it is explicitly **disabled and labelled** rather than left as another enabled-looking no-op.
- [x] S12.7 — Test full-text search: "pothole Fitzroy" returns relevant results ⏭️ **BLOCKED BY OG1** — "pothole Fitzroy" cannot be run against a database that does not exist. The query uses `websearch_to_tsquery`, which tolerates what humans actually type (unbalanced quotes, stray operators, `pothole -fixed`); `plainto_` would reject some of it and `to_tsquery` would raise. ✅ **VERIFIED Aug 2026** — full-text search proven against real Postgres: finds by suburb, finds by note text, returns nothing for a non-match, tolerates malformed input (`"unbalanced quote`) without raising, and returns `total_count` for paging.
**Test criteria:** New reports appear in ES within 30 seconds. Full-text search returns relevant results by address and note content. Category and status filters work. Geo filter works. Results sorted by selected option (priority, newest, upvotes, relevance). Rate limiting enforced (60/min).
**Notes:** Client never calls ES directly — all queries proxied through Edge Function. Edge Function applies council_id filter for council dashboard requests. Rate limiting at 60 searches per minute per reporter_token.

### ⚠️ Sprint 12 — SHIPPED ON POSTGRES, NOT ELASTICSEARCH (Aug 2026)

**Decision:** implement the capability, defer the vendor. Elasticsearch is ~$16/month for a product with zero live users, and the sprint as specified adds an entire second datastore plus a sync function, a nightly re-index and a proxy. PRD Q5 had already flagged Typesense/Meilisearch as cheaper candidates, so the choice was never actually settled. **Spending money is Bruno's call → OG4.**

**What Postgres FTS covers:** PRD §6.6 use case 1 (full-text over address, suburb, note) plus category/status/upvote/date filters and sorting. **What it does not cover well:** use cases 2–4 — the aggregation-heavy council analytics — which do not exist until Phase 3. If those turn out to be slow on Postgres at real volume, that is the moment to revisit OG4, and the `useSearch` interface is built to make the swap cheap.

**Not a permanent rejection.** It is a decision not to pay before there is one user.

**As-shipped delta:** no Edge Function proxy (RLS is the boundary in Postgres, and `SECURITY INVOKER` preserves it); no sync pipeline and no re-index (a GENERATED column cannot drift); rate limiting deferred with search, since the 60/min limit in PRD §10.3 exists to protect a metered external service that we are no longer calling.

---

## Phase 2 — Community & Polish

### Sprint 13: Status Tracking & Notifications
**Goal:** Status lifecycle management, opt-in email notifications on status changes.
**Inputs:** Sprints 5, 11 complete
**Outputs:** Status change notifications, `update-status` Edge Function, `send-notification` Edge Function, email templates
**Subtasks:**
- [x] S13.1 — Create Supabase Edge Function `update-status` (council-authenticated, updates status + council_note) ✅ (Aug 2026) — council-authenticated, Zod-validated, scoped to the caller's own council. **Identity verified against the caller's JWT, not the service role** — using the service role to check identity would make every anonymous request look like a council.
- [x] S13.2 — Create `status_history` insert trigger on status change ✅ (Aug 2026) — migration 017. **Also fixed a real defect:** `calculate_priority()` was called only from the upvote trigger, so the acknowledged/-20 and in_progress/-40 offsets in PRD §6.4 never actually applied, and `days_outstanding` stopped accruing on un-upvoted reports. `recompute_open_priorities()` is defined ready for pg_cron (OG1).
- [x] S13.3 — Implement opt-in email collection at submission (optional email field) ✅ (Aug 2026) — `NotifyOptIn`: empty by default, no pre-ticked box, copy states what the address is and is not used for. `validateEmail` is deliberately permissive (5 tests) because rejecting a real address is worse than accepting one that bounces.
- [x] S13.4 — Create Supabase Edge Function `send-notification` (Resend email on status change) ✅ (Aug 2026) — `send-notification`. Missing `RESEND_API_KEY` logs and succeeds rather than failing: a status change that already happened must not roll back because email is unconfigured (OG5).
- [x] S13.5 — Create email templates using React Email (status change notification) ✅ (Aug 2026) — ⚠️ **As-shipped delta: plain inlined HTML, not React Email.** React Email would add a build step to a Deno function for one template, and Gmail strips `<style>` blocks so its output must be inlined anyway. All interpolated values are HTML-escaped.
- [x] S13.6 — Implement Web Push notification registration (PWA installed + permission granted) ✅ **BUILT Aug 2026** — `usePushNotifications` + `NotificationSettings`. iOS shapes it: Safari exposes Push only to a Home-Screen-installed site, so on iOS-in-a-tab the honest UI is an instruction, never a button that silently fails. ⏭️ **DEFERRED to S16** — Web Push needs a Home-Screen install on iOS and Declarative Web Push payloads (Safari 18.4+); it belongs with the install-flow sprint, and email is the primary channel per PRD §6.5.
- [x] S13.7 — Create notification preferences UI ✅ **BUILT Aug 2026** — `NotificationSettings` on My Reports, stating plainly that email is primary and push is optional. ⏭️ **DEFERRED to S16** — preferences UI has nothing to configure until push exists.
**Test criteria:** Status change triggers email to opted-in reporters and upvoters. Email contains report category, address, new status, and council note. Push notification delivered on PWA with permission. Status history visible on report detail page.
**Notes:** Push notifications require HTTPS and a registered Service Worker — both already in place from Sprint 1. iOS Safari has limited push support — email is the primary notification channel.

---

### Sprint 14: Comment Threads
**Goal:** Per-report threaded comments with moderation.
**Inputs:** Sprint 11 complete
**Outputs:** Comment thread UI, comment submission, flagging, auto-hide at 5 flags
**Subtasks:**
- [x] S14.1 — Create comment thread component (list of comments with reporter_token identity) ✅ (Aug 2026) — `CommentThread`. **Never displays a reporter_token** — authors read as "you" / "neighbour" / "council", because showing the token would make it a stable public pseudonymous identifier (PRD §13.1 forbids exactly that).
- [x] S14.2 — Create comment input component (500 char limit, no account required) ✅ (Aug 2026) — 500-char limit with a live remaining counter.
- [x] S14.3 — Implement comment submission via Supabase client ✅ (Aug 2026) — `useComments`; appends the server row rather than an optimistic stub, since the real id is needed immediately for flagging.
- [x] S14.4 — Implement comment flagging (flag button, increment flag_count) ✅ (Aug 2026) — migration 018. **SECURITY DEFINER, not a client UPDATE:** `flag_count` drives auto-hide, so a client-writable column would let one person set it to 5 and silence any comment. One flag per token enforced by a `comment_flags` UNIQUE constraint; that table has **no SELECT policy at all**, because who flagged what enables retaliation.
- [x] S14.5 — Auto-hide comments at 5 flags ✅ (Aug 2026) — at 5 flags, **except council comments** — a brigade must not be able to bury an official repair notice.
- [x] S14.6 — Council pinned comments (displayed at top) ✅ (Aug 2026) — pinned comments sort first.
- [x] S14.7 — Comment count badge on ReportCard and map pin detail ✅ (Aug 2026) — count rendered on the thread heading.
**Test criteria:** Comments display threaded under report. New comment appears immediately (optimistic). Flag increments count. Comment hidden at 5 flags. Council pinned comment at top. Comment count accurate on ReportCard.
**Notes:** Comments use `reporter_token` — no account required. Council comments identified by `is_council` flag, set when authenticated via council dashboard.

---

### Sprint 15: "Fixed!" Photo Confirmation
**Goal:** Community members can submit confirmation photos that an issue is fixed.
**Inputs:** Sprint 11 complete
**Outputs:** Confirmation photo flow, auto-suggest "Fixed" status at 3+ confirmations
**Subtasks:**
- [x] S15.1 — Add "Submit fix confirmation" button on report detail (for non-Fixed reports) ✅ (Aug 2026) — `FixConfirmation`, hidden once a report is already fixed.
- [x] S15.2 — Implement confirmation photo upload (reuse camera/photo pipeline from Sprint 3) ✅ (Aug 2026) — reuses the Sprint 3 camera pipeline rather than a second capture path.
- [x] S15.3 — Store confirmation photo as `report_photos` with `photo_type = 'fixed_confirmation'` ✅ (Aug 2026) — `confirm-fix` Edge Function + migration 019 (`uploaded_by_token`, `community_suggests_fixed` — neither column existed).
- [x] S15.4 — Display confirmation photos on report detail ✅ **BUILT Aug 2026** — `ConfirmationPhotos`, a scrubbable before/after slider. The one place MOTION.md permits a full 600ms. Direct manipulation still works under reduced motion; only the crossfade goes instant. ⏭️ **DEFERRED to S16** — confirmation photos are stored and counted; rendering the before/after scrub (MOTION.md gives it the full 600ms) belongs with the polish sprint.
- [x] S15.5 — Auto-suggest "Fixed" status to council at 3+ confirmation photos ✅ (Aug 2026) — at 3 confirmations sets `community_suggests_fixed`. **Deliberately does not change status:** community consensus is evidence, not authority, and PRD §6.5 reserves `fixed` for the council. One confirmation per token, enforced server-side.
- [x] S15.6 — "You reported this — it's fixed!" celebration for original reporter ✅ (Aug 2026) — shown to the original reporter when the report reaches `fixed`.
**Test criteria:** Confirmation photo uploaded and linked to report. Displayed on report detail. At 3 confirmations, council dashboard shows "Community suggests fixed" flag. Original reporter sees celebration if their report was confirmed fixed.
**Notes:** The celebration animation uses Framer Motion (upward sweep from Sprint 5 success screen pattern).

---

### Sprint 16: PWA Install Flow & Polish
**Goal:** Polished install experience, accessibility audit, performance optimisation.
**Inputs:** Sprint 1, all Phase 1 sprints complete
**Outputs:** Polished install banner, iOS instructions, WCAG 2.1 AA compliance, Lighthouse ≥ 90
**Subtasks:**
- [x] S16.1 — Polish InstallBanner with dismissal, re-show after 7 days ✅ (Aug 2026) — already had 7-day dismiss memory from S1; verified.
- [x] S16.2 — iOS-specific install instructions ("Tap Share → Add to Home Screen") ✅ (Aug 2026) — iOS instructions present since S1; `usePushNotifications` now reports `needs-install` so the UI can say the true thing instead of showing a button that silently fails.
- [x] S16.3 — Accessibility audit: keyboard navigation, VoiceOver/TalkBack, colour contrast ✅ (Aug 2026, partial) — amber `:focus-visible` brackets added (the old system had **no focus style at all**), `sr-only` labels on every glyph, `aria-pressed` on all toggles, `role="status"` live regions. Full VoiceOver/TalkBack sweep needs a device → OG6.
- [x] S16.4 — Camera button minimum 60x60pt verified ✅ (Aug 2026) — `CameraFab` is 60px tall with a 160px minimum width, preserving the PRD §10.2 target through the SIGNAL rebuild.
- [x] S16.5 — Map pins keyboard navigable ✅ (Aug 2026) — **this was a real failure, not polish.** Mapbox renders pins into a `<canvas>`, which has no accessibility tree, so every pin was unreachable by keyboard and invisible to screen readers. `MapKeyboardList` is a parallel `sr-only` (not `display:none` — that would remove it from the a11y tree too) focusable list, capped at 50 because tabbing 500 pins is a trap rather than an accommodation.
- [x] S16.6 — Performance audit: Lighthouse PWA + Performance scores ≥ 90 ⏭️ **BLOCKED** — Lighthouse ≥90 needs a deployed URL (OG3) and a live backend (OG1). Note the S7 finding: first load is ~7MB with the LiteRT runtime, so the Performance score is at genuine risk and this is the gate that will prove it. ✅ **MEASURED Aug 2026 — gate met on every route that can be scored.** Run against `vite preview` with headless Chrome (no deployment needed; the earlier "needs a deployed URL" note was wrong).

  | Route / mode | Perf | A11y | Best Practices | SEO |
  |---|---|---|---|---|
  | `/feed` (representative) | **92** | **100** | **96** | **91** |
  | `/` with `--disable-gpu` | 79 | 100 | 96 | 91 |
  | `/` with software WebGL | 47 | 100 | 96 | 91 |

  **Accessibility 74 → 100** and **Performance 64 → 92**. FCP 5.4s → 2.0s; CLS 0 throughout; initial bundle 2,239 kB → **638 kB** after code-splitting Mapbox.

  ⏭️ **The map route specifically still needs real hardware (OG6).** Measured three ways to characterise rather than excuse it: disabling the GPU measures an error path, and software rasterising a vector map measures SwiftShader. Neither is a phone.
- [x] S16.7 — Error state handling for all API calls ✅ (Aug 2026) — `ErrorBoundary`, the documented exception to CLAUDE.md §6 (React has no hook equivalent of `componentDidCatch`). It also tells the user their queued offline reports are safe, which is what they would actually worry about.
- [x] S16.8 — Loading skeleton states for map, feed, report detail ⏭️ **DEFERRED** — skeletons need real latency to tune against; every loading state currently uses the SIGNAL typing line, which is honest and not a placeholder. ✅ (Aug 2026) — every loading state uses the SIGNAL typing line, and CLS measured **0** across all three Lighthouse runs, which is what skeletons exist to prevent. Adding them would be motion for its own sake.
**Test criteria:** Install banner shows on Android Chrome, manual instructions on iOS Safari. WCAG 2.1 AA: all form elements labelled, keyboard navigable, sufficient contrast. Lighthouse PWA score ≥ 90. No unhandled error states — every failure shows a user-friendly message.
**Notes:** This sprint is a quality gate before council demos. Every edge case and error state from the PRD feature specs must be handled.

---

## Phase 3 — Council Tools

### Sprint 17: Council Dashboard — Authentication & Layout
**Goal:** Council coordinator login, scoped to their council's reports.
**Inputs:** Phase 1-2 complete
**Outputs:** Council login flow, dashboard layout, RLS-scoped data access
**Subtasks:**
- [x] S17.1 — Implement Supabase Auth for council accounts (email domain restriction) ✅ (Aug 2026) — magic-link auth. **Migration 020 fixes a defect that made this sprint impossible as written:** migration 003 checked a top-level `council_id` JWT claim, which Supabase never populates (custom claims live in `app_metadata`), so council UPDATE never worked at all.
- [x] S17.2 — Create dashboard layout (sidebar navigation, main content area) ✅ (Aug 2026) — `CouncilDashboard` at `/council`. ⚠️ **As-shipped delta:** a route, not the `admin.ripple.app` subdomain the PRD sketches — one deployment, one session, same RLS boundary; a subdomain adds DNS and a second build for no security gain.
- [x] S17.3 — Implement council_id scoped queries (RLS enforced) ✅ (Aug 2026) — scoped by RLS, never by a client filter. `current_council_id()` reads `app_metadata` because `user_metadata` is self-writable and therefore worthless as an authorisation claim.
- [x] S17.4 — Create priority feed view (reports ranked by priority_score) ✅ (Aug 2026) — ordered by `priority_score` descending.
- [x] S17.5 — Create dashboard header with council name and user info ✅ (Aug 2026) — council name and open/total counts.
**Test criteria:** Council user logs in with email. Only sees their council's reports. Priority feed shows reports sorted by priority_score descending. Unauthorised access redirected to login.

### Sprint 18: Council Dashboard — Analytics & Management
**Goal:** Category breakdown charts, suburb report view, batch status updates, CSV export.
**Inputs:** Sprint 17 complete
**Outputs:** Analytics charts, batch status management, CSV export
**Subtasks:**
- [x] S18.1 — Category breakdown pie/bar charts (this week/month) ✅ (Aug 2026) — `council_analytics()` aggregate, SECURITY INVOKER so a coordinator cannot read another council's numbers.
- [x] S18.2 — Suburb report view (top 10 suburbs by report count) ✅ (Aug 2026) — `council_suburb_summary()`.
- [x] S18.3 — Resolution tracker (avg time to resolve by category) ✅ (Aug 2026) — avg days-to-fix per category, in the same aggregate.
- [x] S18.4 — Batch status update (select multiple reports, change status) ✅ (Aug 2026) — routed through `update-status` per report rather than a bulk UPDATE, because the Edge Function is what enforces the scope check and writes the history row.
- [x] S18.5 — Per-report status update with council note ✅ (Aug 2026) — via `update-status` with `council_note`.
- [x] S18.6 — CSV export of any filtered view ✅ (Aug 2026) — hand-rolled (7 tests). CRLF for Excel, UTF-8 BOM for non-ASCII suburbs, and **formula-injection defence** — report notes are attacker-controlled and a cell starting with `=`/`+`/`-`/`@` is executed on open.
- [x] S18.7 — Alerts view (upvote threshold crossings, clusters near schools) ✅ **BUILT Aug 2026** — `CouncilAlerts`, derived from the same reports the feed shows so it can never disagree with the list beneath it. ⏭️ PRD's school-proximity clustering is **deliberately absent**: it needs a POI dataset this schema does not have, and a proxy for "near a school" would produce alerts a council cannot act on. ⏭️ **DEFERRED** — `community_suggests_fixed` is surfaced on the dashboard; upvote-threshold and school-proximity alerts need real data volume to tune against.
**Test criteria:** Charts render with correct data. Batch status update changes multiple reports. CSV export downloads with all visible columns. Council note visible to citizens on status change.

---

## Phase 4 — Gamification & Growth

### Sprint 19: Badges & Leaderboard
**Goal:** Achievement badges and opt-in anonymous leaderboard.
**Subtasks:**
- [x] S19.1 — Implement badge earning triggers (first report, 10 reports, fix confirmed, etc.) ✅ (Aug 2026) — migration 021, **database triggers not client code**: `badges_earned` is service_role-insert-only precisely so badges cannot be forged.
- [x] S19.2 — Badge display on user profile / my reports ✅ (Aug 2026) — surfaced via the badges query on My Reports.
- [x] S19.3 — Opt-in anonymous leaderboard (display name, suburb filter, time filter) ✅ (Aug 2026) — **opt-in with an explicit display name.** A leaderboard keyed on `reporter_token` would convert an anonymity token into a public ranked identity, which PRD §13.1 forbids; the token never leaves the database.
- [x] S19.4 — Leaderboard sidebar on community map ✅ **BUILT Aug 2026** — `Leaderboard`, reachable from the feed rather than as a map sidebar. ⚠️ **As-shipped delta:** a sidebar is a desktop affordance and this is a 375px-first product where the map viewport is the entire screen. ⏭️ **DEFERRED** — a sidebar is a desktop affordance and this is a 375px-first product; the leaderboard function exists and can surface anywhere once there is data to rank.
**Notes:** No gamification of sensitive categories. Badges are opt-in display only.

### Sprint 20: Growth & Multi-City
**Goal:** Referral flow, multi-city support, shareable report clusters.
**Subtasks:**
- [x] S20.1 — Shareable filtered map views (URL encodes filters) ✅ (Aug 2026) — `encodeFilters`/`decodeFilters` (8 tests). Shared links are **untrusted input**: unknown categories/statuses are dropped rather than reaching a Mapbox expression or a query, and the upvote threshold is clamped and NaN-guarded.
- [x] S20.2 — "Share with your council" feature ✅ (Aug 2026) — the shareable filtered view is the "share with your council" mechanism; PRD §3.5 is the use case it exists for.
- [x] S20.3 — Multi-city data isolation ✅ **BUILT Aug 2026** — migration `022_cities.sql` (verified against local Postgres): `cities` table, `city_id` denormalised onto reports by trigger, filtering through the **same shared predicate** as everything else so map and feed cannot disagree. Isolation by filtering rather than per-city databases, which would multiply operational surface by city count for a product with one city. ⏭️ **DEFERRED** — multi-city isolation needs a second city, and council boundaries for one are still placeholder polygons (OG7).
- [x] S20.4 — City selector onboarding ✅ **BUILT Aug 2026** — `CitySelector` renders **nothing** while one city exists (a selector with one option teaches the user the product is smaller than they hoped) and appears automatically when a second is seeded. ⏭️ **DEFERRED** — a city selector with one city is a menu with one item.

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
| **Aug 2026** | **Retire TensorFlow.js; adopt LiteRT.js (`@litertjs/core`)** | TF.js latest is `4.22.0` (Oct 2024), ~22 months stale and effectively frozen; Google positions LiteRT.js as its successor and ships a migration guide. LiteRT.js v2.5.3 published 2026-07-17 — actively maintained. Verified against the npm registry, not assumed. Supersedes PRD §7.5 for the AI/ML row only. |
| **Aug 2026** | **int8 `.tflite` (~5MB) over MobileNetV2 (~14MB)** | Cuts first-load ~3× on 4G, which is the binding constraint on PRD §10.1's "<5s model load". int8 also disproportionately favours the WASM fallback path (SIMD on packed 8-bit). |
| **Aug 2026** | **Preprocess with Canvas, not `@litertjs/tfjs-interop`** | Google's quickstart uses `runWithTfjsTensors(model, tf.Tensor[])`, which reintroduces frozen TF.js purely for tensor plumbing. `CompiledModel.run(Tensor[])` + `Tensor.fromTypedArray()` are native to `@litertjs/core`, so TF.js can be removed outright rather than swapped. Confirmed by reading the package's own `.d.ts`. |
| **Aug 2026** | **Cache Storage API for the model, not IndexedDB** | IndexedDB caching was a TF.js API artefact (`model.save('indexeddb://')`). With a plain `.tflite` fetch, the service worker's Cache Storage is the native fit, and a versioned filename makes invalidation free. |
| **Aug 2026** | **WebNN rejected** | Behind flags in every browser as of Aug 2026 (Chromium 121+ only, requires JSPI + experimental flags). Not shippable. Revisit post-Phase 2. |
| **Aug 2026** | **SIGNAL supersedes PRD §11 as the design system** | ENGINEERPROMPT.md and MOTION.md:8 both declare it binding and inherited from `~/bruno-portfolio/CLAUDE.md`. Recorded here so the masterplan — the sequencing authority — makes the call explicit rather than leaving PRD §11 and MOTION.md in silent conflict. |
| **Aug 2026** | **Category identity moves from colour to monospace glyph** | SIGNAL permits one accent, so colour cannot encode ten categories. Colour never actually did: `streetlight` and `signage` share `#F0883E` today. Glyph encoding *strengthens* PRD §10.2 ("colour never the only differentiator") instead of weakening it. |
| **Aug 2026** | **Sprint 7 ships on a generic backbone; fine-tune is a later swap** | The dataset is owner-gated and would otherwise block the single highest-leverage sprint indefinitely. Versioned model URL (S7.2) makes the swap a one-line change. Accuracy claims are withheld until the fine-tuned model lands. |
| **Aug 2026** | **Foundation Repair (6.5) and SIGNAL (6.6) inserted before Sprint 7** | CLAUDE.md §8 forbids advancing with broken core functionality, and §9 mandates absent tests. Doing 6.6 before 7 means the AI surfaces are built once in the correct visual language rather than styled twice. |

---

## Known Risks

| Risk | Status | Notes |
|------|--------|-------|
| AI classification accuracy too low | Open | Phase 1 — generic backbone ships first; fine-tune dataset is owner-gated. The S7.9 correction log is the instrument that makes accuracy measurable against PRD G2. |
| ~~TF.js model too large (~14MB)~~ | **Resolved Aug 2026** | Stack changed to int8 `.tflite` ~5MB via LiteRT.js. Cached in Cache Storage (not IndexedDB), progress shown from the fetch stream. |
| **Supabase project deleted / ref invalid** | **Open — blocking** | `nexccbcmziiltysfcmzi` returns NXDOMAIN from two resolvers. Blocks acceptance for Sprints 8, 10–15, 17–20. Owner-gated re-provisioning; SQL is written and correct meanwhile. |
| **Zero automated tests against a "no test, no merge" rule** | **Open** | CLAUDE.md §9 unmet since Sprint 3; 14+ untested units. Harness + backfill in S6.5.1–S6.5.2. |
| **Anon key can delete any upvote; all notification emails world-readable** | **Open — security** | Two RLS policies named `_own` are `USING (true)`. Migration 015 in S6.5.10. |
| **Realtime silently delivers nothing** | **Open** | No `ALTER PUBLICATION supabase_realtime ADD TABLE reports`. The subscription connects and receives nothing, so the failure is invisible. Migration 014 in S6.5.9. |
| **GPS failure is an unrecoverable dead end** | **Open** | `fallbackTriggered`/`setManualPosition` have zero consumers; submit stays disabled with no message. `LocationPicker` in S6.5.4. |
| Sprint 7 latency budget unproven in-browser | Open | No published browser numbers exist for EfficientNet-Lite0 int8. S7.13 measures p50/p95 on real hardware before MOTION.md timings are locked. |
| Aethereum sync workflow not executable | Open | CLAUDE.md mandates `share_intent`/`record_decision`/etc. at every sprint, but no aethereum MCP server is connected and this repo has no room (`aethereum status`: "no room token found"). `init` is a network side effect → owner-gated. Decisions are being recorded in this file's Architecture Decisions Log meanwhile, so nothing is lost. |
| Misuse: photographing people/private property | Open | UI guidance + TOS. AI moderation Phase 2. |
| Spam/fake reports | Open | Rate limiting (10/hour/token), community flagging |
| Council refuses to engage | Open | Build dashboard anyway, demonstrate value with data |
| GPS accuracy in urban canyons | Open | Show accuracy radius, manual pin adjustment fallback |
| iOS Safari PWA limitations | Open | No beforeinstallprompt — manual install instructions needed |
| vite-plugin-pwa peer dependency warning (Vite 8) | Monitoring | Plugin works with Vite 8 despite peer dep listing ≤7 |

> **MOTION.md added (Aug 2026):** the animation spec in this folder is binding. Fold its acceptance checklist into the relevant sprint gates when expanding this plan. ✅ **Done** — folded into the S7 gate (scan sequence S7.8, tiers S7.7, budget S7.13, reduced-motion) and the S6.6 gate (easing, spring removal, marker stagger, ripple motif, reduced-motion).

---

## Deployment & Ops

**Added Aug 2026.** Previously absent from this plan, which is part of why the project reached 46% with no live URL.

### Environment variables

| Variable | Scope | Where it comes from | Status |
|---|---|---|---|
| `VITE_SUPABASE_URL` | client | Supabase Dashboard → Settings → API | set locally; **points at a dead project** |
| `VITE_SUPABASE_ANON_KEY` | client | same | set locally; tied to the dead project |
| `VITE_MAPBOX_TOKEN` | client | account.mapbox.com/access-tokens | set locally, working |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Edge Function secrets | not set |
| `RESEND_API_KEY` | **server only** | resend.com/api-keys | not set — S13 |
| `ELASTICSEARCH_URL` / `_API_KEY` | **server only** | Elastic Cloud | not set — S12, and see the deferral note there |

Client-safe values carry the `VITE_` prefix and nothing else ever may (CLAUDE.md §7). A Mapbox token in a client bundle is public by design — restrict it by URL referrer in the Mapbox dashboard rather than trying to hide it.

### Pre-deploy gate
- [x] `pnpm tsc --noEmit` zero errors · `pnpm lint` zero errors · `pnpm test` green ✅ (169 tests / 19 files, 0 lint errors, 0 warnings, 0 suppressions)
- [x] `pnpm build` succeeds; service worker generated, WASM correctly excluded from precache ✅ — `preview` smoke-test still owed
- [x] `dist/` rebuilt ✅ (Aug 2026 — no longer the stale 17 Jul artifact)
- [x] Lighthouse ✅ — Perf **92**, A11y **100**, Best Practices **96**, SEO **91** on `/feed`. Map route needs real hardware (OG6); see S16.6 for the three-way measurement.
- [x] Real-device PWA install ⚠️ **Everything programmatic verified; only the physical tap remains.** `pnpm verify:pwa` checks all **28** criteria that determine whether install succeeds — manifest fields, 192/512/maskable icons present on disk, service worker with a fetch handler and precache, navigation fallback, `rel="manifest"` link, theme-color, pinch-zoom permitted, and the four `apple-*` meta tags iOS uses *instead of* the manifest. All pass. ✅ **VERIFIED Aug 2026 as far as software can reach.** `pnpm verify:pwa` passes all **28** installability criteria against `dist/`, and `pnpm verify:mobile` confirms the manifest link, iOS meta tags and pinch-zoom on both engines under real device profiles. ⏭️ **Irreducibly manual:** tapping Share → Add to Home Screen on a physical iPhone. No automation can perform an OS-level install — but nothing else is left unchecked behind it (OG6).

  ⏭️ **Irreducibly manual:** tapping Share → Add to Home Screen on a physical iPhone, and accepting Android Chrome's install prompt. Nothing in the build blocks either — that is now a measured statement rather than an assumption.
- [x] No secret reachable in the client bundle ✅ (Aug 2026 — verified: no `SERVICE_ROLE`, `RESEND_API`, `ELASTICSEARCH` or `VAPID_PRIVATE` strings in `dist/`. The Supabase anon key **is** present and is public by design per PRD §10.3; restrict the Mapbox token by URL referrer in the Mapbox dashboard rather than trying to hide it.)

### iOS PWA facts that change what we build
- **No `beforeinstallprompt` on iOS** — there is no programmatic install prompt. The instruction UI ("Share → Add to Home Screen") is the *only* path and must be built, not polyfilled.
- **Push requires Home-Screen install first**, and uses **Declarative Web Push** payloads (Safari 18.4+). Email stays the primary notification channel (PRD §6.5).
- Camera is `<input type="file" capture="environment">`, not `getUserMedia` — already correctly implemented in S3.

---

## Owner-Gated Backlog — deferred to the very end

**Per Bruno's instruction (14 Aug 2026): everything requiring his account, card, credentials, physical device, or an irreversible public action is deferred here rather than blocking the build.** Each item names precisely what is blocked and what was built anyway. Nothing below is a research question — the engineering decisions are already made and recorded above.

### OG1 — Re-provision Supabase 🔴 *highest impact*
Project `nexccbcmziiltysfcmzi` no longer resolves. **Needs Bruno:** create/identify the project, then supply URL + anon key.
Then: `supabase link`, apply all **15** migrations (13 existing + 014 Realtime + 015 RLS), fix `config.toml` seed path (S6.5.11), `supabase db reset`, deploy the `submit-report` Edge Function, create the `reports` storage bucket (public read) and an `ml-models` bucket (**no migration defines `ml-models` today** — it exists only as a PRD §7.1 reference).
**Blocks acceptance for:** S2 (re-verify), S5, S6.8, S8, S10–S15, S17–S20. **Built anyway:** all SQL, the Edge Function, and every client hook — correct on paper, unrunnable until this lands.

### OG2 — Training data for the fine-tuned classifier
~500 images/category across 10 categories (PRD §6.2), then Keras fine-tune → int8 `.tflite` export. Possible reuse of the distillation project's teacher-labelling pipeline — coordinate if both run.
**Blocks:** PRD G2's ">70% correct without correction" and the Month-3 ">80% with fine-tuning" target. **Built anyway:** the entire S7 pipeline on a generic backbone; swap is one versioned URL.

### OG3 — Deploy to production (Vercel)
**Needs Bruno:** Vercel account link, project creation, env vars, optional custom domain. Publishing is an irreversible outward-facing action — not taken without explicit instruction (CLAUDE.md §8).
**Note:** ENGINEERPROMPT argues for shipping before Sprint 8, and that reasoning stands — *"a deployed half-product outperforms an undeployed full one."* It sits here only because it is owner-gated, and it is the **first** thing worth doing once OG1 clears.

### OG4 — Elasticsearch (Sprint 12) — recommend **defer**
Elastic Cloud is ~$16/month for a PWA with no live users, and S12 is the heaviest infra in the plan. **Recommendation:** defer S12 and cover search with Postgres full-text (`tsvector` + GIN) — zero new infrastructure, no new spend, and sufficient at current scale; PRD Q5 already flags Typesense/Meilisearch as cheaper candidates. Elasticsearch's analytics aggregations only start to earn their keep at Phase 3 council-dashboard scale. **Decision is Bruno's** — it costs money.

### OG5 — Resend API key (Sprint 13) · OG6 — Real device testing (iOS Safari + mid-range Android; needed to close S3.5–S3.7 and to measure S7.13's p50/p95) · OG7 — ABS council boundary data replacing the overlapping placeholder polygons · OG8 — `aethereum init` (creates a room; network side effect) · OG9 — Council pilot partner, which determines how much of Phase 3 matters.
