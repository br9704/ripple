---
id: 9fcb0ad8-3fbb-4e7b-813c-96fd76aafa8c
title: "The src Tree"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/src"
---

# The src Tree

**138 files, 792 KB, nine directories.** Tests are co-located rather than kept in a `tests/`
directory, which is why `src/lib/` and `src/hooks/` look larger than they are.

| Directory | Files | What lives there |
|---|---|---|
| `src/components/` | **47** | 41 components plus 6 co-located test files |
| `src/lib/` | **40** | 21 modules plus 19 test files. All the pure logic |
| `src/hooks/` | **29** | 21 hooks plus 8 test files |
| `src/constants/` | **8** | `categories`, `statuses`, `terms`, `config`, plus 3 tests |
| `src/pages/` | **8** | One per route |
| `src/stores/` | **1** | `filterStore.ts`, Zustand |
| `src/types/` | **1** | Barrel `index.ts` |
| `src/test/` | **1** | `setup.ts`, the Vitest environment |
| `src/workers/` | **0** | ⚫ **Empty.** Dead scaffolding from an earlier plan |

Root files: `App.tsx`, `main.tsx`, and the global stylesheet.

## The load-bearing files in `src/lib/`

| File | Why it matters |
|---|---|
| `litert.ts` | The LiteRT.js wrapper. Where the type error that broke `pnpm build` at HEAD lived |
| `preprocessImage.ts` | Canvas preprocessing. Centre crop, never squash |
| `classification.ts` | The three confidence tiers, tested at their exact boundaries |
| `councilDetection.ts` | Turf.js point-in-polygon, including the overlap tie-break |
| `boundaryCache.ts` | Caches council polygons so detection needs no round trip |
| `offlineQueue.ts` + `offlineQueueContext.ts` | IndexedDB queue via `idb`, flushing from app root |
| `reporterToken.ts` | The random UUID that is the only identifier the system holds |
| `columnPrivileges.test.ts` | Asserts the column-level `REVOKE` that a table `GRANT` would otherwise defeat |
| `reportFilters.ts` + `reportSort.ts` | Shared by map and feed, so the two cannot disagree |
| `csvExport.ts` | Council dashboard export, with **formula-injection escaping** |
| `originMarker.ts` | The Sprint 22 map marker, with `pointer-events: none` asserted |
| `shareableFilters.ts` | Encodes a filter set into a shareable URL |
| `supabase.ts` | ⚠️ Throws at module init without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, which is why `.env.test` is committed |

## Hooks, by cluster

- **Capture and AI**: `useCameraCapture`, `useAIClassification`
- **Location**: `useGeolocation`
- **Data**: `useReports`, `useReport`, `useSearch`, `useComments`, `useUpvote`
- **Identity**: `useReporterToken`, `useCouncilAuth`
- **Submission**: `useSubmitReport`, `useOfflineQueue`, `useOnlineStatus`
- **Council**: `useCrewAssignment`
- **Growth**: `useStreak`, `useReferral`
- **PWA and UX**: `useInstallPrompt`, `usePushNotifications`, `useInfiniteScroll`,
  `useMenuDisclosure`, `useReducedMotion`

## Code health 🟢

**0** genuine `TODO`, `FIXME`, `HACK` or `XXX` markers across `src/`, `supabase/` and
`scripts/`. The one grep hit is a comment in `supabase/functions/submit-report/index.ts` that
explicitly records a previous Elasticsearch TODO as **obsolete**, which is the opposite of debt.

**0** ESLint errors, **0** warnings and **0** blanket suppressions, under `strictTypeChecked`
and `stylisticTypeChecked` type-aware linting, with rule triage documented in
`eslint.config.js` (**4,287** bytes of it).

`tsc -b` runs across **three** TypeScript projects: `tsconfig.app.json`, `tsconfig.node.json`
and `tsconfig.test.json`. Tests live in their own project rather than granting the app Node
types, because a component importing `fs` would otherwise typecheck cleanly and fail only in a
browser. Splitting them out immediately caught **7** errors that had been invisible.

## Related

[[(Note) Routes and Surfaces]] · [[(Note) The Verification Harness]] ·
[[(Note) The Gates That Could Not Fail]] · [[(Index) Complete File Inventory]] ·
[[(Index) 20 Codebase Map]]
