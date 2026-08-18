---
id: f6016b8a-f692-421a-a030-2b807f89a79a
title: "Gaps & Questions"
type: report
project: "RIPPLE"
tags:
  - "#report"
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

# Gaps & Questions ❓

**Twelve gaps.** Every one is something the repository does not answer. Where a `> [!todo]`
callout appears elsewhere in the vault, it has a row here.

| # | Gap | Where I looked | Note carrying the callout | Who can answer |
|---|---|---|---|---|
| 1 | **Is this assessed coursework?** No subject code, unit code, tutor, rubric, deadline or group roster anywhere | `README.md`, `PRD.md`, `MASTERPLAN.md`, `CLAUDE.md`, `PROJECT.json`, plus a grep for unit-code patterns | [[(Note) Who It Is For]] | Bruno |
| 2 | **Is `brunojaamaa.dev/projects/ripple` live?** The unpushed commit publishes a link to it | `README.md`, `PROJECT.json`, `package.json`. Nothing in the repo records the page's state. No network fetch performed | [[(Note) The Unpushed Commit]] | Bruno, one browser tab |
| 3 | **Has the Mapbox token been restricted by referrer?** The README states the correct posture. Nothing records whether it was applied | `README.md` § Environment, `MASTERPLAN.md` § Deployment & Ops | [[(Note) External Services]] | Bruno, the Mapbox dashboard |
| 4 | **The `ml-models` storage bucket has no migration.** It exists only as a `PRD.md` § 7.1 reference | All 27 files in `supabase/migrations/`, plus `supabase/storage.sql` | [[(Note) Owner-Gated Backlog]] | Needs a migration written |
| 5 | **No monitoring, alerting or error tracking is configured** | `MASTERPLAN.md` § Deployment & Ops, `.github/workflows/verify.yml`, `package.json` | [[(Note) Deploy and Environment]] | Defensible today, a gap once OG1 lands |
| 6 | **Classifier accuracy is unmeasured.** The shipped model is generic ImageNet, not Ripple's ten categories | `README.md` § Limitations, `PROJECT.json.honest`, `docs/evidence/gates.json` | [[(Note) On-Device Classification]] | **OG2**, ~500 images/category |
| 7 | **Inference latency on representative hardware.** 15 ms p50 is an Apple Silicon WebGPU lower bound | `docs/evidence/gates.json`, `README.md` § On-device inference | [[(Note) On-Device Classification]] | **OG6**, a mid-range Android |
| 8 | **Real ABS council boundary polygons.** Current ones are overlapping bounding boxes | `supabase/migrations/002_council_boundaries.sql`, `README.md` § Limitations | [[(Note) Who It Is For]] | **OG7**, ABS data |
| 9 | **12 legal placeholders on the Terms page.** Entity, ABN, governing law, liability | `src/constants/terms.ts`, `MASTERPLAN.md` OG10 | [[(Note) Owner-Gated Backlog]] | **OG10**, Bruno plus a lawyer |
| 10 | **Storage, Auth, Edge Function deployment and Realtime delivery are unproven.** Managed services with no local stand-in | `README.md` § Limitations, `MASTERPLAN.md` § Project Status | [[(Note) External Services]] | **OG1**, re-provision Supabase |
| 11 | **A full VoiceOver and TalkBack sweep has not happened.** Contrast is gated in CI, focus styles and labels are in place | `README.md` § Limitations | [[(Note) The Verification Harness]] | **OG6**, a device |
| 12 | **iOS install, camera-app confirmation and mid-range frame rate.** Irreducibly manual | `README.md` § Limitations, `.github/workflows/verify.yml` comments | [[(Note) Owner-Gated Backlog]] | **OG6**, a physical handset |

## Internal inconsistencies found, and resolved in favour of the repo

Recorded because they are the kind of drift this project spent a sprint eliminating.

| Claim | Where | Resolution |
|---|---|---|
| "all **15** migrations" | `MASTERPLAN.md` OG1 | **27** on disk today. Repo wins |
| "**334** unit tests" | `PROJECT.json` metrics, `docs/evidence/gates.json` | **340** in the README, measured after Sprint 22. Both correct for their own tree |
| OG3 reads as open | `MASTERPLAN.md` § Owner-Gated Backlog | The deploy happened, commits `a2add01`, `9da0b10`, `97bae00`. Repo wins |
| "Lighthouse Perf **92**" | `MASTERPLAN.md` § Project Status gate table | A desktop-preset number. Mobile is **68**. The masterplan flags this itself further down |

## Questions this vault answered rather than deferred

- **Where work stopped.** Not end of Phase 0. Sprint 22 plus a documentation pass, on
  2026-08-15, with **255 of 255** tasks closed. See [[(Note) Hub Note Corrections]].
- **Whether the unpushed commit is safe.** It is. Documentation only, **5** added lines. See
  [[(Note) The Unpushed Commit]].
- **Whether `.env.test` holds secrets.** ✅ It does not, and it says so in its own first line.
  Verified without reading past the header.
- **Whether TensorFlow.js is in the project.** ❌ It is not, and its absence is a recorded
  decision. See [[(Note) On-Device Classification]].

## Deliberately not investigated

| Thing | Reason |
|---|---|
| `.env.local` | Ground rule 3. Secrets are never opened |
| `.env.test` beyond its header | Ground rule 3, and the header was all that needed confirming |
| `node_modules/`, `dist/` | Ground rule 6 |
| Anything requiring a network fetch | Out of scope for a read-only local audit |
| Anything requiring a git write | Ground rule 1 |

## Related

[[(Report) Project Summary]] · [[(Report) Folder Audit]] · [[(Note) Hub Note Corrections]] ·
[[(Note) Owner-Gated Backlog]] · [[(Map) Master Map]]
