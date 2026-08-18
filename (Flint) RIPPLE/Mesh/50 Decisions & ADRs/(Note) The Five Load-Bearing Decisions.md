---
id: 24da2b3d-5770-4577-bfbc-5a96c1138642
title: "The Five Load-Bearing Decisions"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/PROJECT.json"
---

# The Five Load-Bearing Decisions

`PROJECT.json` records five decisions under `built.decisions`. Each is reproduced with its stated
reason and is verifiable against the code.

## 1. LiteRT.js over TensorFlow.js

**Why.** TF.js is frozen at `4.22.0`, October 2024. Reading `@litertjs/core`'s own `.d.ts`
showed `CompiledModel.run(Tensor[])` and `Tensor.fromTypedArray()` are native, so preprocessing
with Canvas **removes** TF.js outright rather than swapping it. Google's own quickstart would
have reintroduced it purely for tensor plumbing.

**Where.** `src/lib/litert.ts`, `src/lib/preprocessImage.ts`. See
[[(Note) On-Device Classification]].

## 2. Postgres full-text search instead of Elasticsearch

**Why.** A generated `tsvector` column **cannot drift from its source**, so the sync Edge
Function, the nightly re-index and the proxy all cease to exist rather than being maintained.
For a product with zero users and a $16-a-month bill. Deferred, not rejected. `useSearch` is
backend-agnostic.

**Where.** `supabase/migrations/016_fulltext_search.sql`, `src/hooks/useSearch.ts`.

## 3. Classify on-device, before upload

**Why.** The photo never leaves the phone to be understood. It goes only as evidence, and only
after Submit. A privacy architecture first and a latency win second.

**Where.** The whole `ReportFlow`. Measured at **p50 15 ms** against a **3,000 ms** budget.

## 4. Category identity moved from colour to monospace glyph

**Why.** The SIGNAL design system permits **one accent**, so colour cannot encode ten categories.
And it never did: `streetlight` and `signage` already shared the hex `#F0883E`. Shape survives
greyscale, colour blindness and low outdoor contrast.

This **strengthens** the PRD's own rule at § 10.2, that colour is never the only differentiator,
instead of weakening it.

**Where.** `src/constants/categories.ts`.

## 5. Community consensus flags "fixed", it does not set it

**Why.** Three confirmation photos set `community_suggests_fixed` and stop there. **Consensus is
evidence, not authority.** The status belongs to the council.

**Where.** `supabase/migrations/019_fix_confirmation.sql`,
`src/components/FixConfirmation.tsx`.

## Other recorded decisions

From the masterplan's Architecture Decisions Log:

| Date | Decision | Reason |
|---|---|---|
| Mar 2026 | Tailwind CSS **v3**, not v4 | `PRD.md` specifies v3. Note the sibling PULSE went to v4 |
| Mar 2026 | Flat ESLint config | Vite 8 scaffold default |
| Aug 2026 | **int8 `.tflite` (~5 MB) over MobileNetV2 (~14 MB)** | Cuts first load ~3× on 4G. int8 also favours the WASM fallback, SIMD on packed 8-bit |
| Aug 2026 | **Cache Storage for the model, not IndexedDB** | IndexedDB caching was a TF.js API artefact. A versioned filename makes invalidation free |
| Aug 2026 | **WebNN rejected** | Behind flags in every browser as of Aug 2026 |
| Aug 2026 | **SIGNAL supersedes `PRD.md` § 11** as the design system | Recorded explicitly so the masterplan makes the call rather than leaving two documents in silent conflict |
| Aug 2026 | Ship Sprint 7 on a generic backbone; fine-tune is a later swap | The dataset is owner-gated and would otherwise block the highest-leverage sprint indefinitely |
| Aug 2026 | Insert **Foundation Repair (6.5)** and **SIGNAL (6.6)** before Sprint 7 | `CLAUDE.md` forbids advancing with broken core functionality. Doing 6.6 first means the AI surfaces are built once in the correct visual language rather than styled twice |

## Deliberately not built

The README names four things declined rather than deferred:

- **Elasticsearch**, on cost, with a documented swap path.
- **School-proximity clustering for council alerts**, because it needs a POI dataset this schema
  does not have, and a proxy would produce alerts nobody could act on.
- **A CRT and scanline treatment**, wrong for a civic tool used outdoors one-handed, where
  legibility beats texture.
- **Native apps of any kind.**

## Related

[[(Note) The Gates That Could Not Fail]] · [[(Note) On-Device Classification]] ·
[[(Note) Data Model and RLS]] · [[(Index) 50 Decisions & ADRs]]
