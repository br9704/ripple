---
id: fb911a39-7ea6-41a1-8ffe-7543660b54f4
title: "Who It Is For"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/PRD.md"
---

# Who It Is For

**Melbourne residents who can see something broken and will not spend fifteen minutes filing a
form about it, plus the council coordinators who would act on it if it arrived.** `PRD.md` § 3
defines six personas across 1,471 lines.

## The six personas

| # | Persona | The pain |
|---|---|---|
| 3.1 | **The Reluctant Reporter** (primary) | Would report it if it took seconds. Will not create an account to do it |
| 3.2 | **The Safety-Concerned Parent** | A hazard on a school route is urgent and specific |
| 3.3 | **The International Student / New Arrival** | Does not know which council, which form, or what a "ward" is |
| 3.4 | **The Wheelchair User / Disability Advocate** | A blocked kerb ramp is not an inconvenience, it is a wall |
| 3.5 | **The Active Community Member** | Reports often. Wants to see the thing get fixed |
| 3.6 | **Council Maintenance Coordinator** (B2G) | Needs triage, not a firehose. Wants CSV and a priority order |

`PRD.md` § 2.2 names an **inequality dimension** explicitly: the cost of a broken footpath is
not evenly distributed, and the people who pay most for it are least likely to complete a
fifteen-minute form. That framing is why the app has no accounts at all.

## The Melbourne pilot

Five Melbourne councils, seeded in `supabase/seed/001_melbourne_councils.sql`, with boundaries in
`supabase/migrations/002_council_boundaries.sql`.

⚠️ **Those boundaries are placeholder bounding boxes, not ABS polygons, and they overlap.**
Correctness no longer depends on row order: detection falls back to nearest centroid and the
query is explicitly ordered. But attribution near a boundary is approximate until real data
lands. That is owner-gated item **OG7**.

`src/lib/councilDetection.ts` does the point-in-polygon match with Turf.js on the device, with a
boundary cache in `src/lib/boundaryCache.ts`, so a report knows its council without a round trip.

## Is this assessed coursework?

> [!todo] Missing, not found in `README.md`, `PRD.md`, `MASTERPLAN.md`, `CLAUDE.md` or
> `PROJECT.json`
> No subject code, unit code, tutor, rubric, submission deadline or group roster appears
> anywhere in the repository. A grep for `subject`, `assignment`, `rubric`, `tutor`, `marker`,
> `teammate` and unit-code patterns across the root documents returned nothing.

The evidence points the other way. `PROJECT.json` records `"role": "SOLO BUILD"` and
`"status": "in-development"`, lists a case study on `brunojaamaa.dev`, and carries a
`github.topics` array and a repository description for discovery. `git shortlog` shows **56
commits from a single author**. The `LICENSE` is all rights reserved, and the README says the
code is public to read, not to reuse.

**Verdict: this is a solo portfolio project.** It sits under `#cluster/university` in the hub
because it was built in the same week and the same stack as PULSE, and the two share a PRD
lineage. See [[(Note) Hub Note Corrections]].

## Related

[[(Note) What Ripple Is]] · [[(Note) Data Model and RLS]] ·
[[(Note) Owner-Gated Backlog]] · [[(Index) 00 Overview]]
