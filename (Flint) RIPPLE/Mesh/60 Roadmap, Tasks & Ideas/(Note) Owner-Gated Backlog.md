---
id: 541019ee-a215-4df8-89f1-3297254f136b
title: "Owner-Gated Backlog"
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

# Owner-Gated Backlog

**Ten items, OG1 to OG10. Each names precisely what it blocks and what was built anyway.**
Nothing here is a research question. The engineering decisions are already made and recorded.

## OG1: Re-provision Supabase 🔴 highest impact

Project `nexccbcmziiltysfcmzi` no longer resolves. **Needs Bruno:** create or identify a project,
then supply the URL and anon key.

Then: `supabase link`, apply all **27** migrations, fix the `config.toml` seed path,
`supabase db reset`, deploy **6** Edge Functions, create the `reports` storage bucket with public
read, and an `ml-models` bucket.

> [!todo] Missing, not found in `supabase/migrations/`
> **No migration defines the `ml-models` bucket.** It exists only as a `PRD.md` § 7.1 reference.
> Creating it is a manual step with no committed definition, which is the exact failure mode the
> project's own rule about committed migrations exists to prevent.

**Blocks acceptance for:** sprints 2, 5, 6.8, 8, 10 to 15, 17 to 20.
**Built anyway:** all SQL, all six Edge Functions, and every client hook. Correct on paper,
unrunnable until this lands.

⚠️ The masterplan's OG1 text says "all **15** migrations (13 existing + 014 + 015)". That figure
is stale: there are **27** on disk today. Repo wins.

## OG2: Training data for the fine-tuned classifier

~**500** images per category across **10** categories, then a Keras fine-tune and int8 `.tflite`
export.

**Blocks:** the PRD's ">70% correct without correction" goal and the Month-3 ">80% with
fine-tuning" target.
**Built anyway:** the entire Sprint 7 pipeline on a generic backbone. The swap is **one versioned
URL**.

## OG3: Deploy to production ✅ done

Marked owner-gated because publishing is an irreversible outward-facing action. **It has since
happened.** The front end is live at `ripple-chi-bice.vercel.app` as of 2026-08-15, commit
`97bae00`.

⚠️ The masterplan section still reads as open. Repo wins: the deploy commits are in `git log` and
the README states the live URL.

## OG4: Elasticsearch, recommend defer

Elastic Cloud is ~**$16/month** for a PWA with no live users, and Sprint 12 is the heaviest infra
in the plan. Postgres full-text covers the use case with zero new infrastructure. The PRD itself
flags Typesense and Meilisearch as cheaper candidates. **Decision is Bruno's**, because it costs
money.

## OG5: Resend API key

Status-change email, Sprint 13. `send-notification` is written and never run.

## OG6: Real device testing

iOS Safari install, confirming the OS camera app actually opens, and a mid-range Android latency
figure. Needed to close S3.5 to S3.7 and to give S7.13's p50/p95 a representative-hardware
number rather than an Apple Silicon lower bound.

The README's phrasing: **no automation can tap Share then Add to Home Screen on a physical
iPhone.** Everything that *determines* those outcomes is checked. The last tap is not.

## OG7: ABS council boundary polygons

Replacing the overlapping placeholder bounding boxes in
`supabase/migrations/002_council_boundaries.sql`. Detection already falls back to nearest
centroid with an explicitly ordered query, so correctness no longer depends on row order, but
attribution near a boundary is approximate.

## OG8: `aethereum init`

Creates a room, which is a network side effect. `CLAUDE.md` mandates `share_intent` and
`record_decision` at every sprint, but no Aethereum MCP server is connected and this repo has no
room. Decisions are being recorded in the masterplan's Architecture Decisions Log meanwhile, so
nothing is lost.

## OG9: A council pilot partner

Determines how much of Phase 3 matters at all.

## OG10: Legal content for the Terms page

`src/constants/terms.ts` carries **12** `[PLACEHOLDER]` markers: legal entity and ABN/ACN,
postal address for notices, governing law and venue, pre-litigation dispute process, warranty
disclaimer and limitation of liability, retention period, takedown contact, change-notice terms,
effective date.

**Needs Bruno:** the entity details, and **a lawyer's pass** over the disclaimer and liability
clauses, which needs a qualified adviser rather than a model.
**Built anyway:** the page, the route, a review-required banner, and tests asserting that no
company name, email, ABN or copyright line was fabricated. The substantive prohibitions the PRD
mandates are written and verified against the code. **Nothing was invented**, which is the right
call.

## The one-line ordering

**OG1 → OG3 → OG2 → OG6.** Re-provision, deploy, train, then hold a phone. OG3 is already done,
so the live chain today is OG1, then OG2, then OG6.

## Related

[[(Note) Designed and Never Built]] · [[(Note) External Services]] ·
[[(Note) Data Model and RLS]] · [[(Report) Gaps & Questions]] ·
[[(Index) 60 Roadmap, Tasks & Ideas]]
