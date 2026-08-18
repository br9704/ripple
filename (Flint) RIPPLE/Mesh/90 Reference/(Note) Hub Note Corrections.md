---
id: f8c806d9-8079-4752-a595-59471c53e2b5
title: "Hub Note Corrections"
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
source_path: "/Users/brunojaamaa/Desktop/Main Vault/Main/Mesh/Notes/Projects/(Note) RIPPLE.md"
---

# Hub Note Corrections ⚠️

**The hub note is five months and 41 commits out of date.** It carries
`last_updated: 2026-08-06` but every figure in it describes the repository as it stood on
**2026-03-22**. Repo wins over note.

Source of the stale claims:
`/Users/brunojaamaa/Desktop/Main Vault/Main/Mesh/Notes/Projects/(Note) RIPPLE.md`

| # | Hub note says | Repo says | Evidence |
|---|---|---|---|
| 1 | Commits: **15**, all on 2026-03-22, one day | **56**, 2026-03-22 to 2026-08-15 | `git rev-list --count HEAD` |
| 2 | Tracked: **79** files, 22 `.ts`, 18 `.tsx`, **15** `.sql` | **230** tracked files, **184** code files at depth 3, **27** migrations plus 1 seed and 5 test SQL files | `git ls-files`, `supabase/migrations/` |
| 3 | Stack includes **TensorFlow.js** | ⚠️ **`@tensorflow/tfjs` is not a dependency.** The stack is `@litertjs/core@2.5.3`, and TF.js was rejected on the record because it is frozen at `4.22.0` | `package.json`, `MASTERPLAN.md` ADR log |
| 4 | "TensorFlow.js is installed and the shipped commits do not wire it up. That is the first thing to finish if this restarts" | The AI pipeline is **complete and benchmarked** at **p50 15 ms**. What is missing is a fine-tuned model, which is owner-gated as OG2 | `docs/evidence/gates.json`, `src/lib/litert.ts` |
| 5 | "The intent is **MobileNetV2**" | **EfficientNet-Lite0 int8, 5.18 MB**, chosen over MobileNetV2 because it cuts first load roughly threefold on 4G | `MASTERPLAN.md` ADR, Aug 2026 |
| 6 | "Phase 0 complete at S5. Phase 1 never started" | Sprints **0 through 22** plus 6.5, 6.6 and a documentation pass. **255 of 255** tasks closed, **0** open | `MASTERPLAN.md` § Project Status |
| 7 | "Community voting **planned but not in the commits**" | Built in Sprint 8, with a priority-score trigger. `upvotes` table, `UpvoteButton.tsx`, `useUpvote.ts` | `git log`, `supabase/migrations/005` |
| 8 | "**Elasticsearch**-backed council dashboards" | The council dashboard is built (Sprints 17 and 18) and search shipped on **Postgres full-text**, not Elasticsearch. That is a recorded decision, not a shortfall | `MASTERPLAN.md` S12, `migrations/016` |
| 9 | Docs in-repo: `PRD.md`, `MASTERPLAN.md`, `CLAUDE.md`, `README.md` | Also `MOTION.md`, `PROJECT.json`, `LICENSE`, `public/models/README.md`, `docs/evidence/`, and two `ENGINEERPROMPT` files | `ls` at repo root |

## Also worth correcting

- **"Dormant since the day it was built"** is wrong twice over. It was dormant from March to
  August, then had the most productive two days in either of Bruno's university-cluster
  repositories, and has been dormant since 2026-08-15.
- **The `status:` frontmatter reads `dormant`**, which is correct today, but the note gives no
  hint that a live deploy exists at `ripple-chi-bice.vercel.app`.
- **No `live_url` is recorded** in the hub note's frontmatter.

## What the hub note gets right

- The offline queue is the strongest idea in the repo and was built on day one. Correct, and it
  was later fixed to flush from anywhere in the app rather than only from `/report`.
- Council detection via Turf boundary polygons with a cache. Correct, and the polygons are still
  placeholders.
- The folder, repo and product are all named `ripple` or `RIPPLE`. Correct.
- The `CLAUDE.md` post-sprint manual-action rule, added the same day as PULSE's. Correct.
- Best understood as a pair with PULSE. Correct.

## Recommended action

Refresh the hub note against [[(Report) Project Summary]]. The headline corrections are that the
project did **not** stop at Phase 0 in March, that **TensorFlow.js is not in it**, and that a
front end is live at a public URL with no backend behind it.

## Related

[[(Report) Project Summary]] · [[(Note) Git History]] ·
[[(Note) On-Device Classification]] · [[(Report) Gaps & Questions]] ·
[[(Index) 90 Reference]]
