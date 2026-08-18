---
id: f92aa5ab-dcfa-491d-8818-2bb079d9c2c1
title: "onboarding-guide"
type: shard
project: "RIPPLE"
tags:
  - "#shard"
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

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

# Shard: onboarding-guide

**Brings a person or an agent from zero to productive on Ripple in under forty minutes.** Follow
it in order.

## Read, in this order

1. [[(Report) Project Summary]]. Verdict, numbers, top risks, next five actions.
2. [[(Note) What Ripple Is]]. The product and the friction it removes.
3. [[(Note) On-Device Classification]]. The part nobody else is doing, and its honest gap.
4. [[(Note) The Gates That Could Not Fail]]. **Read this before touching anything.** It explains
   why the verification harness looks the way it does.
5. [[(Note) Data Model and RLS]]. RLS is the security boundary, not a setting.
6. [[(Note) Owner-Gated Backlog]]. What is blocked, and on what.

## Run it

```bash
cd /Users/brunojaamaa/Desktop/RIPPLE
pnpm install
pnpm test:run                     # expect 34 files, 340 tests, no config needed
cp .env.example .env.local        # Supabase URL and anon key, Mapbox token
pnpm dev                          # falls back to the manual picker until pnpm fetch:model
```

For the classifier and the database:

```bash
pnpm fetch:model && pnpm bench:ai
brew install postgresql@17 && brew services start postgresql@17 && pnpm verify:db
```

Full detail in [[(Note) Install Run and Verify]].

## The six rules of this codebase

1. **`pnpm build`, never `tsc --noEmit` against the root config.** The root `tsconfig.json` is a
   solution file with `"files": []` and typechecks **zero files** while exiting 0.
2. **What would this have to look like to fail?** Ask it of every gate you write. If there is no
   answer, it is not a gate.
3. **No test, no merge.** `CLAUDE.md` § 9. The rule predates the tests by five months, which is
   the whole story of this repo.
4. **RLS is row-level and filters no columns.** A public `SELECT` policy exposes every column.
   Column-level `REVOKE` cannot subtract from a table-level `GRANT`.
5. **Never assert a security fix without executing the full attack chain**, including whether the
   credential can be obtained. Assert the target tables are non-empty first.
6. **Consensus is evidence, not authority.** Community confirmation flags a report as fixed. Only
   a council sets the status.

## Where to make a change

| Change | Start at |
|---|---|
| A route or page | `src/App.tsx`, then `src/pages/` |
| Classification behaviour | `src/lib/classification.ts`, then `src/lib/litert.ts` |
| Swapping the model | One versioned URL in `scripts/fetch-dev-model.mjs`. That is the whole change |
| Data shape | A new numbered migration in `supabase/migrations/`, then `pnpm verify:db` |
| Anything security-adjacent | Write the attack in `supabase/test/02_rls.sql` **first** |
| Anything visual | The palette lives in **three places**. Check all three, then run the contrast test |
| Search | `src/hooks/useSearch.ts` is backend-agnostic on purpose |

## Before you claim to be done

`pnpm verify` (tests, lint, build, PWA, mobile, offline) plus `pnpm verify:db`, all green. Then
update [[(Report) Build Log]] and log an op to `OBSIDIANLOG.md`.

⚠️ `pnpm verify:lighthouse` currently **exits non-zero by design**, because mobile Performance is
**68** against the project's own ≥90 gate. That is a known, documented failure, not a
regression.

## Related

[[codebase-map-refresh]] · [[vault-audit]] · [[(Note) Install Run and Verify]] ·
[[(Note) The Verification Harness]]
