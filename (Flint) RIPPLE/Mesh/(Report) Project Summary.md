---
id: 9cff4e9f-9e29-4799-9ab8-27aea69560f3
title: "Project Summary"
type: project-summary
project: "RIPPLE"
kind: "coding"
stack: "react"
tags:
  - "#report"
  - "#project"
  - "#ld/living"
  - "#stack/react"
  - "#status/dormant"
  - "#cluster/university"
status: dormant
health: "amber"
health_note: "Engineering is strong: 255 of 255 tasks closed, 340 tests, 102 database assertions on real PostgreSQL 17, 0 lint errors. Amber for three real exposures. One unpushed commit sits on a public repo. The live URL serves a front end with no backend behind it, so nothing that reads or writes data works. And mobile Lighthouse Performance is 68, below the project's own 90 gate, so `pnpm verify:lighthouse` exits non-zero by design."
last_commit: "2026-08-15"
path: "/Users/brunojaamaa/Desktop/RIPPLE"
live_url: "https://ripple-chi-bice.vercel.app"
repo: "https://github.com/br9704/ripple"
cluster: "university"
created: "2026-08-17"
updated: "2026-08-17"
source_path: "/Users/brunojaamaa/Desktop/RIPPLE"
---

# Project Summary 🟡

## Purpose

**Photograph a pothole. A classifier running on the phone files it, and the image never leaves
the device to be understood.** Ripple is a civic infrastructure reporting PWA with no accounts
in it, built against a Melbourne pilot.

Councils have the budget to fix broken infrastructure and citizens can see what is broken. The
bridge between them is a council web form that takes about fifteen minutes and wants a full
name, address and phone number, so most problems are never reported at all. Ripple is that
bridge rebuilt: open a map, tap one control, photograph the problem, submit. A random UUID in
`localStorage` is the only identifier the system holds.

What makes three seconds possible is that **classification happens on the phone**. An int8
`.tflite` model runs under LiteRT.js, WebGPU where available and WASM plus XNNPACK where not,
and returns a category and a confidence before anything uploads. The photo is transmitted only
after Submit, and only as evidence. See [[(Note) On-Device Classification]].

**Who it is for.** Six personas in `PRD.md` § 3: the reluctant reporter, the safety-concerned
parent, the international student, the wheelchair user, the active community member, and a B2G
council maintenance coordinator. ⚠️ The repository names no subject code, unit, tutor or
assignment brief, so "university project" here means it sits in the hub's `#cluster/university`
alongside PULSE, not that it is assessed coursework. See [[(Note) Who It Is For]].

## State ⚫ dormant

Work stopped **2026-08-15** at a clean boundary. Every task in the plan is closed, **255 of
255**, and the tree is green. The last three commits were Sprint 22 (map UX), a CI fix, and the
documentation pass.

⚠️ The hub note said work stopped at **end of Phase 0**, after 15 commits in one day, with
TensorFlow.js installed and unwired. That describes the repository as it stood on 2026-03-22.
Since then it has gained **41** more commits, sprints 6.5 through 22, an entire on-device AI
pipeline on LiteRT rather than TF.js, a council dashboard, and 340 tests from a starting point
of zero. Nine corrections in [[(Note) Hub Note Corrections]].

## Key numbers

| | |
|---|---|
| Commits | **56** on `main`, 2026-03-22 to 2026-08-15, single author |
| Unpushed | **1** commit, documentation only, safe |
| Code files | **184** at depth 3, excluding `node_modules`, `dist` and the vendored WASM |
| Tracked files | **230** |
| Tests | **340** across **34** files, from **0** five months earlier |
| Database | **27** migrations, **102** assertions, **0** failures, on real PostgreSQL 17.11 |
| Tables | **16** |
| Edge Functions | **6** Deno functions, written, never deployed |
| Routes | **8**, all rendering real pages |
| Inference | **p50 15 ms · p95 22 ms** against a **3,000 ms** budget |
| PWA installability | **28 / 28** criteria |
| Lighthouse, mobile | Perf **68** · A11y **100** · Best Practices **96** · SEO **91** |
| Lint | **0** errors, **0** warnings, **0** suppressions, under `strictTypeChecked` |

## Top risks

1. ⚠️ **The live URL has no backend behind it.** `ripple-chi-bice.vercel.app` serves the real
   build. The PWA installs, the map renders, the offline shell works and the classifier loads
   its model. **Nothing that reads or writes data works.** Supabase project
   `nexccbcmziiltysfcmzi` was deleted and has deliberately not been re-provisioned. A visitor
   sees a working app that cannot load a report.
2. ⚠️ **One unpushed commit on a public repo.** Documentation only, **5** added lines, safe to
   publish. Detail in [[(Note) The Unpushed Commit]].
3. 🟡 **No accuracy claim can be made for the classifier.** The pipeline is complete and
   benchmarked, but it ships a generic EfficientNet-Lite0 carrying **ImageNet's thousand
   classes, not Ripple's ten categories**. Classification runs and is not yet trustworthy,
   which is exactly why the confidence tiers and the one-tap override exist.
4. 🟡 **Mobile Lighthouse Performance is 68 against the project's own ≥90 gate.** First load is
   near **7 MB**, roughly 2 MB of LiteRT WASM plus a 5 MB model, against a stated "under 5 s on
   4G". `pnpm verify:lighthouse` exits non-zero, correctly.
5. ❓ **The Terms page carries 12 legal placeholders.** `src/constants/terms.ts` has 12
   `[PLACEHOLDER]` markers for entity, ABN, governing law and liability. Tests assert nothing
   was fabricated, which is right, but the page ships incomplete.

## Next 5 actions

1. Decide on the unpushed commit. It publishes a link to `brunojaamaa.dev/projects/ripple`, so
   confirm that page exists first. See [[(Note) The Unpushed Commit]].
2. **OG1: re-provision Supabase.** Highest impact by a wide margin. It unblocks acceptance for
   sprints 2, 5, 8, 10 to 15 and 17 to 20 in one move. Everything downstream is already written.
3. Restrict the Mapbox token by URL referrer in the Mapbox dashboard. The token is public by
   design and the mitigation is a referrer restriction, not secrecy.
4. Cut first-load weight, or accept the mobile Performance number explicitly and change the
   gate. Today the gate fails and the repo says so, which is honest but unresolved.
5. Refresh the hub note at
   `/Users/brunojaamaa/Desktop/Main Vault/Main/Mesh/Notes/Projects/(Note) RIPPLE.md` against
   [[(Note) Hub Note Corrections]]. It is five months and 41 commits behind.

## Ten key links

[[(Map) Master Map]] · [[(Note) What Ripple Is]] · [[(Note) System Architecture]] ·
[[(Note) On-Device Classification]] · [[(Note) Data Model and RLS]] ·
[[(Note) Install Run and Verify]] · [[(Note) The Gates That Could Not Fail]] ·
[[(Note) Owner-Gated Backlog]] · [[(Note) The Unpushed Commit]] ·
[[(Report) Gaps & Questions]]

## Related

[[(Report) Folder Audit]] · [[(Index) Complete File Inventory]] · [[(Report) Build Log]] ·
[[(Guide) BRUNO HQ]]
