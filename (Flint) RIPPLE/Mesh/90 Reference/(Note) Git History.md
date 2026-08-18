---
id: ac2fac1e-3dc1-4bc6-b75d-c86088daac01
title: "Git History"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/.git"
---

# Git History

**56 commits, one branch, one author, spanning 2026-03-22 to 2026-08-15.** Working tree clean.
One commit unpushed.

| | |
|---|---|
| Branches | `main` only. `origin/HEAD` points at `origin/main`. No feature branches, local or remote |
| Remote | `https://github.com/br9704/ripple.git`, fetch and push. ⚠️ **Public** |
| First commit | `cd0bf94`, 2026-03-22 |
| Last commit | `9c96de1`, 2026-08-15 |
| Author | Bruno Jaamaa, all 56 |
| Unpushed | `9c96de1`. See [[(Note) The Unpushed Commit]] |
| Worktrees | One, `main` at the project root. Nothing stale |

## The two working periods

Roughly **15** commits on 2026-03-22, then a five-month gap, then **41** commits across
2026-08-14 and 2026-08-15. The August burst is the audit, sprints 6.5 through 22, the
verification harness, the deploy and the documentation pass. It is where nearly all of the
interesting work happened.

## Last 30 commits

| SHA | Date | Subject |
|---|---|---|
| `9c96de1` | 2026-08-15 | docs: link the case study on brunojaamaa.dev ⚠️ unpushed |
| `ec4fb6f` | 2026-08-15 | feat(S22): mark where you are on the map, and stop the empty state reading as a failure |
| `b0d653c` | 2026-08-15 | fix(ci): make the test suite runnable on a clean clone |
| `97bae00` | 2026-08-15 | docs: record the deploy, and the two defects that only exist once deployed |
| `9da0b10` | 2026-08-15 | fix(deploy): strip comment keys from vercel.json, schema validation rejected them |
| `a2add01` | 2026-08-15 | fix(deploy): serve the SPA shell on every route, seven of eight 404'd in production |
| `b0933f0` | 2026-08-15 | chore: mark Sprint 21 and Sprint D complete in MASTERPLAN |
| `0f4ed59` | 2026-08-15 | docs: rewrite README against measured evidence, add PROJECT.json, LICENSE and CI |
| `d070994` | 2026-08-15 | feat(S21): close six PRD requirements no task had been written for, and four gates that could not fail |
| `a5b32e1` | 2026-08-14 | test: verify mobile behaviour on real WebKit and Chromium, masterplan reaches 220/220 |
| `cced9ab` | 2026-08-14 | test: measure real inference, verify offline classification and Realtime source |
| `2dbcc51` | 2026-08-14 | docs: every masterplan task is complete or explicitly blocked on an owner input |
| `2be8d2c` | 2026-08-14 | feat: build the deferrals that were choices, not blockers |
| `180f381` | 2026-08-14 | test(pwa): verify all 28 installability criteria, masterplan reaches zero open items |
| `1b34c6c` | 2026-08-14 | perf(S16): real Lighthouse audit, a11y 74 to 100, perf 64 to 92, and a bug it found |
| `ed59534` | 2026-08-14 | docs: record database verification in MASTERPLAN and README |
| `ba07433` | 2026-08-14 | test(db): verify all 21 migrations against real Postgres, and fix a bug it caught |
| `d37371a` | 2026-08-14 | docs: update README and close out MASTERPLAN through Sprint 20 |
| `7c46836` | 2026-08-14 | feat(S19,S20): badges, opt-in leaderboard, shareable filtered views |
| `a052c39` | 2026-08-14 | feat(S17,S18): council dashboard, auth, batch updates, CSV export |
| `47b0eb5` | 2026-08-14 | feat(S16): error boundary, keyboard-accessible map pins, Web Push |
| `897ea30` | 2026-08-14 | chore: mark Sprints 13-15 in MASTERPLAN |
| `288287e` | 2026-08-14 | feat(S14,S15): comment threads with moderation, and fix confirmation |
| `84753df` | 2026-08-14 | feat(S13): status lifecycle, history trigger, and opt-in notifications |
| `bf85396` | 2026-08-14 | chore: mark Sprints 9-12 in MASTERPLAN |
| `9672653` | 2026-08-14 | feat(S12): full-text search on Postgres instead of Elasticsearch |
| `1b3f535` | 2026-08-14 | feat(S11): report detail page, status timeline, and share |
| `f359b9a` | 2026-08-14 | feat(S10): Feed and My Reports, the tab bar finally goes somewhere |
| `c76dfda` | 2026-08-14 | feat(S9): map filters, heatmap, and four buttons that finally do something |
| `4fab9e0` | 2026-08-14 | chore: mark Sprint 8 code-complete, acceptance blocked by OG1 |

## Figures that moved during the history

The commit log preserves numbers that were true at the time and are no longer current. Reading
them as current is exactly the failure the project spent a sprint correcting.

| Figure | In a commit | Today |
|---|---|---|
| Lighthouse Performance | `1b34c6c` says **64 to 92** | **68** on mobile, 96 on desktop. The 92 was a desktop-preset number |
| Migrations | `ba07433` says **21** | **27** |
| Masterplan tasks | `a5b32e1` says **220/220** | **255/255**, after Sprint 21 found six untracked PRD requirements |
| Tests | `PROJECT.json` metrics say **334 / 33 files** | **340 / 34 files**, after Sprint 22 |

`docs/evidence/gates.json` was measured post-Sprint-21 and therefore records **334**, while the
README, measured after Sprint 22, records **340**. Both are correct for their own tree.

## Related

[[(Note) The Unpushed Commit]] · [[(Note) The Gates That Could Not Fail]] ·
[[(Note) Hub Note Corrections]] · [[(Index) 90 Reference]]
