---
id: 78391294-1af1-4b27-bf5d-3093344afcec
title: "Complete File Inventory"
type: index
project: "RIPPLE"
tags:
  - "#index"
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

# Complete File Inventory

Every tracked and untracked file in `/Users/brunojaamaa/Desktop/RIPPLE`, excluding
`node_modules/`, `dist/`, `.git/` internals and `.DS_Store`. Counted 2026-08-17. **230** files
are tracked by git.

## Root, 26 files

| File | Bytes | Modified | What it is |
|---|---|---|---|
| `MASTERPLAN.md` | 193,853 | 2026-08-15 | 1,090 lines. Sprint record, as-shipped deltas, ADR log, owner-gated backlog |
| `PRD.md` | 63,814 | 2026-03-22 | 1,471 lines. Six personas, feature specs, data models, privacy rules |
| `README.md` | 27,274 | 2026-08-15 | 268 lines. Every number beside the command that produces it |
| `CLAUDE.md` | 13,919 | 2026-08-14 | 268 lines. Engineering contract, including "no test, no merge" |
| `ENGINEERPROMPT.md` | 10,084 | 2026-08-14 | Gitignored via `*.local` patterns. Mode 600 on disk |
| `DOCS-ENGINEERPROMPT.md` | 9,621 | 2026-08-15 | Same. Byte-identical to PULSE's copy of the same file |
| `PROJECT.json` | 8,287 | 2026-08-15 | Machine-readable portfolio card. Honest field, decisions, ownerGated |
| `MOTION.md` | 7,682 | 2026-08-14 | 114 lines. Binding animation spec, folded into sprint gates |
| `pnpm-lock.yaml` | 311,328 | 2026-08-15 | Lockfile |
| `vite.config.ts` | 5,473 | 2026-08-15 | PWA plugin, precache exclusions, chunking |
| `eslint.config.js` | 4,287 | 2026-08-14 | Flat config, `strictTypeChecked`, rule triage documented inline |
| `tailwind.config.js` | 4,083 | 2026-08-15 | Tailwind **v3**. One of the three places the palette is defined |
| `package.json` | 2,909 | 2026-08-15 | 10 deps, 27 dev deps, **20** scripts |
| `index.html` | 2,185 | 2026-08-14 | Includes the four `apple-*` tags iOS uses instead of the manifest |
| `.env.local` | 1,801 | 2026-08-15 | ⚠️ Secrets. Gitignored. **Never opened** |
| `tsconfig.test.json` | 1,680 | 2026-08-15 | Tests get their own project so they can have Node types |
| `.env.example` | 1,344 | 2026-08-14 | 4 variable names, no values |
| `tsconfig.app.json` | 1,164 | 2026-08-15 | App TS config |
| `.env.test` | 1,084 | 2026-08-15 | ✅ **Committed on purpose.** Header confirms it holds no secrets. Read no further |
| `LICENSE` | 1,022 | 2026-08-15 | All rights reserved |
| `tsconfig.json` | 789 | 2026-08-15 | ⚠️ Solution file, `"files": []`. `tsc --noEmit` here checks zero files |
| `.gitignore` | 665 | 2026-08-15 | Blanket `.env*` with `!.env.test` and `!.env.example` re-included |
| `tsconfig.node.json` | 653 | 2026-03-22 | Build-tooling TS config |
| `vercel.json` | 416 | 2026-08-15 | SPA rewrite plus two cache headers. No comment keys, deliberately |
| `postcss.config.js` | 80 | 2026-03-22 | Tailwind plus autoprefixer |
| `OBSIDIANLOG.md` | new | 2026-08-17 | ✍️ Written by this vault build. The only file changed outside the vault |

## `src/`, 138 files

**`src/` root, 2 or 3:** `App.tsx` · `main.tsx` · the global stylesheet

**`src/pages/`, 8:** `MapPage` · `ReportFlow` · `ReportDetailPage` · `FeedPage` ·
`MyReportsPage` · `SearchPage` · `CouncilDashboard` · `TermsPage`

**`src/components/`, 47 (41 components + 6 tests):**
`AIResultCard` · `AppHeader` · `AppMenu` (+test) · `CameraCapture` · `CameraFab` ·
`CategoryPicker` · `CitySelector` · `CommentThread` · `ConfidenceBar` · `ConfirmationPhotos` ·
`CouncilAlerts` · `CrewAssignment` (+test) · `DuplicateAlert` · `ErrorBoundary` ·
`FilterPanel` · `FixConfirmation` · `InstallBanner` · `Leaderboard` · `LocationPicker` ·
`LocationStatus` · `Map` · `MapControls` · `MapKeyboardList` · `NoteInput` ·
`NotificationSettings` · `NotifyOptIn` · `OfflineBanner` · `OfflineQueueProvider` ·
`PageTransition` · `PhotoGuidance` (+test) · `PhotoPreview` · `ReferralCard` (+test) ·
`ReportCard` · `ReportFeed` · `ScanOverlay` · `StatusTimeline` · `StreakCard` (+test) ·
`SubmissionSuccess` · `TabBar` · `TerminalLoader` · `TypingLine` · `UpvoteButton`

**`src/lib/`, 40 (21 modules + 19 tests):**
`blobToBase64` · `boundaryCache` · `classification` · `compressImage` · `councilDetection` ·
`csvExport` · `litert` · `mapHelpers` · `offlineQueue` · `offlineQueueContext` ·
`originMarker` · `preprocessImage` · `progressBar` · `referralLink` · `reportFilters` ·
`reportSort` · `reporterToken` · `reverseGeocode` · `share` · `shareableFilters` ·
`validateEmail` · `supabase`
Test-only, no paired module: `columnPrivileges.test.ts`

**`src/hooks/`, 29 (21 hooks + 8 tests):**
`useAIClassification` (+test) · `useCameraCapture` (+test) · `useComments` · `useCouncilAuth` ·
`useCrewAssignment` (+test) · `useGeolocation` (+test) · `useInfiniteScroll` ·
`useInstallPrompt` · `useMenuDisclosure` (+test) · `useOfflineQueue` · `useOnlineStatus` ·
`usePushNotifications` · `useReducedMotion` · `useReferral` (+test) · `useReport` ·
`useReporterToken` · `useReports` · `useSearch` · `useStreak` (+test) ·
`useSubmitReport` (+test) · `useUpvote`

**`src/constants/`, 8:** `categories` (+test) · `config` · `index` · `statuses`
(+`statuses.contrast.test.ts`) · `terms` (+test)

**`src/stores/`, 1:** `filterStore.ts`, Zustand

**`src/types/`, 1:** barrel `index.ts`

**`src/test/`, 1:** `setup.ts`

**`src/workers/`:** ⚫ empty

## `supabase/`, 49 files

**`functions/`, 6:** `assign-crew` · `confirm-fix` · `send-notification` · `submit-report` ·
`update-status` · `weekly-digest`, each one `index.ts`

**`migrations/`, 27:** `001_councils` · `002_council_boundaries` · `003_reports` ·
`004_report_photos` · `005_upvotes` · `006_comments` · `007_status_history` ·
`008_user_notifications` · `009_badges_earned` · `010_rls_policies` · `011_triggers` ·
`012_find_nearby_reports` · `013_storage_bucket` · `014_enable_realtime` ·
`015_rls_scope_reporter_token` · `016_fulltext_search` · `017_status_history_trigger` ·
`018_comment_moderation` · `019_fix_confirmation` · `020_council_auth` · `021_badges` ·
`022_cities` · `023_ai_correction_log` · `024_crew_assignment` ·
`025_column_privileges_reporter_token` · `026_streaks_and_referrals` · `027_weekly_digest`

**`seed/`, 1:** `001_melbourne_councils.sql`

**`test/`, 5:** `00_supabase_shim` · `01_verify` · `02_rls` · `03_realtime` · `04_sprint21`

**Root, 3 + `.temp/`:** `config.toml` · `storage.sql` · `.gitignore` · `.temp/` (7 CLI cache
files, gitignored)

## Everything else

| Path | Files |
|---|---|
| `scripts/` | `verify-db.sh` · `verify-pwa.mjs` · `verify-mobile.mjs` · `verify-offline.mjs` · `verify-lighthouse.mjs` · `bench-inference.mjs` · `capture-screenshots.mjs` · `sync-litert-wasm.mjs` · `fetch-dev-model.mjs` |
| `public/` tracked | `favicon.svg` · `icons.svg` · `icons/icon-192.png` · `icons/icon-512.png` · `icons/icon-512-maskable.png` · `offline.html` · `robots.txt` · `models/README.md` |
| `public/` generated | `litert-wasm/` (8 files, gitignored) · `models/ripple-classifier-v1.tflite` (5,434,517 bytes, gitignored) |
| `docs/evidence/` | `gates.json` · `lighthouse-summary.json` · `lighthouse-feed-mobile.json` (421 KB) · `lighthouse-feed-desktop.json` (388 KB) |
| `docs/media/` | `map.png` · `report.png` · `feed.png` · `offline.png` |
| `.github/` | `workflows/verify.yml` |
| `.claude/` | `RESUME.md` · `settings.local.json` |
| `.vercel/` | `project.json` · `README.txt` |

## Not inventoried

`node_modules/` and `dist/` (**35** files, **51 MB**) are excluded per ground rule 6. Both are
reproducible. `.git/` internals were never traversed. `.env.local` was never opened, and
`.env.test` was read only far enough to confirm its header.

## Related

[[(Report) Folder Audit]] · [[(Note) The src Tree]] · [[(Note) Data Model and RLS]] ·
[[(Map) Master Map]]
