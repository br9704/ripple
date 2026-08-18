---
id: b0cb835e-c6c3-44a0-8030-f94f6077164a
title: "Routes and Surfaces"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/src/App.tsx"
---

# Routes and Surfaces

**Eight routes plus a catch-all, all rendering real pages.** Declared in `src/App.tsx` with
`react-router-dom@7`. At the March baseline only **2 of 4** rendered anything real.

| Route | Component | What it does |
|---|---|---|
| `/` | `MapPage.tsx` | The hero. Mapbox GL dark-v11, clustering, weighted heatmap, origin marker |
| `/report` | `ReportFlow.tsx` | Capture, classify, locate, note, submit |
| `/report/:id` | `ReportDetailPage.tsx` | Status timeline, comments, upvote, fix confirmation, share |
| `/feed` | `FeedPage.tsx` | Chronological feed with filters and infinite scroll |
| `/my-reports` | `MyReportsPage.tsx` | Everything filed under this browser's reporter token |
| `/search` | `SearchPage.tsx` | Postgres full-text search, not Elasticsearch |
| `/council` | `CouncilDashboard.tsx` | Auth-gated. Analytics, batch status updates, crew assignment, CSV export |
| `/terms` | `TermsPage.tsx` | ⚠️ Ships with **12** legal placeholders and a review-required banner |
| `*` | `NotFound` | Catch-all |

⚠️ **Seven of these eight returned 404 in production** until commit `a2add01`, because there was
no `vercel.json` and the CDN looked for a file at `/feed`. It hid locally because `vite preview`
implements history fallback itself, in-app `<Link>` navigation issues no network request, and
once the service worker installs it serves the shell anyway. Only cold loads and shared links
broke, which is to say only strangers. See [[(Note) Deploy and Environment]].

## The six Edge Functions

All Deno, all under `supabase/functions/`, all written and **never deployed**.

| Function | Job |
|---|---|
| `submit-report` | Zod validation, server-side rate limit, Storage upload |
| `update-status` | Scoped to the caller's own council |
| `confirm-fix` | Before-and-after photo confirmation |
| `send-notification` | Status-change email via Resend |
| `assign-crew` | Council-side crew assignment |
| `weekly-digest` | Council digest, logged in `council_digest_log` |

⚠️ All eight of `submit-report`'s validation messages were **unreachable** until Sprint 6.5,
because `supabase-js` does not parse non-2xx bodies. Users saw the literal string "Edge Function
returned a non-2xx status code" instead of "Note exceeds 140 character limit".

## Notable components

**47** files in `src/components/`, including 6 co-located test files.

- **`Map.tsx`, `MapControls.tsx`, `MapKeyboardList.tsx`** are the map trio.
  `MapKeyboardList` exists because a `<canvas>` has no accessibility tree, so map pins get a
  parallel keyboard-navigable list.
- **`AIResultCard.tsx`, `ConfidenceBar.tsx`, `ScanOverlay.tsx`, `CategoryPicker.tsx`** are the
  classification surfaces, including the fallback picker.
- **`OfflineQueueProvider.tsx`** sits at the app root so the IndexedDB queue flushes from
  anywhere, not only from `/report`.
- **`LocationPicker.tsx`, `LocationStatus.tsx`** exist because GPS failure used to be an
  unrecoverable dead end: at the eight-second timeout the hook cleared its loading flag with
  latitude still null, leaving Submit permanently disabled with no error and no way forward.
- **`TerminalLoader.tsx`, `TypingLine.tsx`, `ScanOverlay.tsx`** carry the SIGNAL design
  system's monospace voice, which in this project was **kept** rather than reverted. The sibling
  PULSE went the other way.

## The origin marker, and why it is brackets

Sprint 22 found that the map never showed where you are. `flyToUser` panned the camera to your
coordinates and rendered nothing there, on an app whose whole premise is that you are standing
at the problem.

The obvious marker for an app called Ripple is an expanding circle. `index.css` reserves that
motif to **three places only** and permits `border-radius: 50%` nowhere else. A looping ripple
under the user's feet would have been a fourth use, and the only infinite one, spending an effect
being saved for a case that has never fired because it needs Realtime. Corner brackets are the
other half of SIGNAL, so the marker frames your position in a language the app already speaks.

`pointer-events: none` on it is load-bearing rather than hygiene: Mapbox uses the supplied
element directly rather than wrapping it, so without it a 44px invisible box swallows taps meant
for report pins underneath. Asserted in `src/lib/originMarker.test.ts`.

## Related

[[(Note) The src Tree]] · [[(Note) On-Device Classification]] ·
[[(Note) Deploy and Environment]] · [[(Index) 20 Codebase Map]]
