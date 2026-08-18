---
id: c48fab8c-374e-48c9-a448-c56385d880d3
title: "Designed and Never Built"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/MASTERPLAN.md"
---

# Designed and Never Built ⏭️

**Ripple stopped at a genuinely clean boundary: 255 of 255 plan tasks closed, 0 open.** What was
designed and never built therefore falls into three quite different buckets, and conflating them
is exactly the mistake Sprint 21 exists to prevent.

## 1. Phase 5, specified only at goal level

`MASTERPLAN.md` § Phase 5 (Post-Revenue) carries four bullets and no sprint breakdown, by
design. Detailed planning was to happen when Phase 4 completed.

- Direct API integration with council back-office systems (Pathway, TechOne)
- Automated report routing
- SLA tracking and alerts
- Webhook notifications for council systems

All four presuppose a council pilot partner, which is owner-gated as **OG9**, and OG9 is what
determines how much of Phase 3 even matters. Nothing here is blocked on engineering.

## 2. Declined on purpose, with reasons

These are decisions, not omissions:

| Not built | Why |
|---|---|
| **Elasticsearch** (`PRD.md` § 6.6, Sprint 12) | ~$16/month and a second datastore for a product with zero users. Postgres full-text covers the use case. Deferred with a one-file swap path, and a standing recommendation to keep deferring. **OG4** |
| **School-proximity clustering for council alerts** | Needs a POI dataset this schema does not have. A proxy would produce alerts nobody could act on |
| **A CRT and scanline treatment** | Wrong for a civic tool used outdoors one-handed, where legibility beats texture |
| **Native apps of any kind** | One PWA. No React Native, no Swift, no Capacitor |

## 3. Built but not acceptance-verified

This is the largest and most important category, and the masterplan is emphatic that it must not
be conflated with the other two:

> **Code-complete** means every sprint's implementation is written, typechecks, lints clean, and
> its pure logic is unit-tested.
> **Not acceptance-verified** means OG1 blocks it: the Supabase project does not exist, so no
> migration has been applied, no Edge Function deployed, and no end-to-end path exercised against
> a real database.

Anything asserting database behaviour is marked `[⏭️]` or `[~]`, **never `[x]`**. Sprints 2, 5,
8, 10 to 15 and 17 to 20 are in this state. Every SQL file, every Edge Function and every client
hook exists and is correct on paper.

## The coverage gap Sprint 21 found

Worth recording separately because it is the sharpest thing in the plan. Every audit before
Sprint 21 compared the **marks** to the **code**. None compared the **PRD** to the code.

Reading `PRD.md` against the source found **six requirements no task had ever been written
for**. Not deferred, not declined, not owner-gated. Simply never tracked, and therefore invisible
to a completion count reading 220 of 220. Sprint 21 closed all six, plus a live token-harvesting
hole and four gates that could not fail.

**A completion count certifies coverage of the plan, not coverage of the product.** See
[[(Note) The Gates That Could Not Fail]].

## What genuinely remains

Nothing in the plan. Everything in [[(Note) Owner-Gated Backlog]]. And **none of the blockers is
cost**: Supabase and Vercel both have free tiers that cover this comfortably, and the only
genuinely paid item in the plan was Elasticsearch, which Sprint 12 replaced. What the gates
actually need is **account access, a training dataset, and a physical handset**.

## Related

[[(Note) Owner-Gated Backlog]] · [[(Note) The Gates That Could Not Fail]] ·
[[(Note) On-Device Classification]] · [[(Index) 60 Roadmap, Tasks & Ideas]]
