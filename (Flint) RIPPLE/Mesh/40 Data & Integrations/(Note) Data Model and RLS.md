---
id: 9f23ccc1-031c-4ca7-a94b-189e85273a15
title: "Data Model and RLS"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/supabase/migrations"
---

# Data Model and RLS

**16 tables across 27 migrations, verified by 102 assertions against real PostgreSQL 17.11 with
0 failures.** RLS is the security boundary, not a setting on top of one. Committed and
executable. Never hosted.

## The tables

| Table | Holds |
|---|---|
| `councils` | The five Melbourne pilot councils |
| `council_boundaries` | ⚠️ Placeholder bounding boxes, not ABS polygons, and they overlap |
| `cities` | Multi-city scaffolding from Sprint 20 |
| `reports` | The core record. Category, confidence, status, priority, geometry, `reporter_token` |
| `report_photos` | Original and confirmation photos |
| `upvotes` | "I see this too", feeding the priority score |
| `comments` | Threads |
| `comment_flags` | Flag-based moderation |
| `status_history` | Written by a trigger, never by hand |
| `user_notifications` | Opt-in email against a reporter token |
| `badges_earned` | Gamification, Sprint 19 |
| `leaderboard_optin` | Opt-in only, by design |
| `ai_correction_log` | `{ai_category, ai_confidence, final_category}`. The accuracy instrument |
| `crew_assignment` records | Council-side dispatch, Sprint 24 migration |
| `referral_codes` · `referrals` | Growth, Sprint 26 migration. RLS-on-with-no-policies |
| `council_digest_log` | Weekly digest sends |

## Migrations, in order

`001_councils` · `002_council_boundaries` · `003_reports` · `004_report_photos` ·
`005_upvotes` · `006_comments` · `007_status_history` · `008_user_notifications` ·
`009_badges_earned` · `010_rls_policies` · `011_triggers` · `012_find_nearby_reports` ·
`013_storage_bucket` · `014_enable_realtime` · `015_rls_scope_reporter_token` ·
`016_fulltext_search` · `017_status_history_trigger` · `018_comment_moderation` ·
`019_fix_confirmation` · `020_council_auth` · `021_badges` · `022_cities` ·
`023_ai_correction_log` · `024_crew_assignment` · `025_column_privileges_reporter_token` ·
`026_streaks_and_referrals` · `027_weekly_digest`

Seed: `supabase/seed/001_melbourne_councils.sql`. Storage: `supabase/storage.sql`.

## The four security findings, in order

This sequence is the most instructive thing in the repository.

**1. Two RLS policies named `_own` were written `USING (true)`.** Any anonymous caller could
delete anyone's upvote, and every stored notification email was world-readable. Fixed in
migration `015`, and the fix was recorded as proven by attack.

**2. It was not proven.** A later audit ran the whole chain rather than its second half and
found `reports.reporter_token` world-readable. **RLS is row-level, and a policy of `USING (true)`
filters no columns.** A token could be harvested off the public map, replayed as the
`x-reporter-token` header, and used to read a stranger's notification email and delete their
upvote. All four steps succeeded. The migration's own header comment asserted, in writing, that
tokens were not handed out.

**3. The obvious repair does nothing.** `REVOKE SELECT (reporter_token) ON reports FROM anon`
**silently fails to do anything** when a table-level `GRANT SELECT` already exists. Table-level
and column-level privileges live in separate ACLs, and a column revoke cannot subtract from a
table grant. It raises no error and reports success.

Written that way, the migration, its comment and the plan entry describing it would all have
asserted a fix that did not exist, and nothing short of an after-the-fact attack would have
noticed. Migration `025` does it correctly, and `src/lib/columnPrivileges.test.ts` asserts it.

**4. The tests were the reason it hid.** The RLS tests declared the attacker's token as a
literal fixture, so they proved the attack failed without ever testing whether the credential
could be obtained. See [[(Note) The Gates That Could Not Fail]].

## The priority trigger bug

Migration `017` called `calculate_priority(NEW.id)` from a **`BEFORE UPDATE`** trigger, where the
table still holds the old row. The function re-read the status it was in the middle of replacing,
so the status penalty never applied. **That is precisely the bug the migration exists to fix,
reintroduced one line below the comment describing it.**

Caught on the **first run** of `pnpm verify:db`. Invisible to code review, and it would have been
invisible in production too, in the direction that keeps resolved reports ranked as urgent on a
council dashboard.

## Design rules encoded in the schema

- **Community consensus flags "fixed", it does not set it.** Three confirmation photos set
  `community_suggests_fixed` and stop there. Consensus is evidence, not authority. The status
  belongs to the council.
- **Status history is written by a trigger**, so it cannot be skipped by a code path that forgot.
- **Full-text search is a generated `tsvector` column with a GIN index**, so it cannot drift from
  its source. That is the whole argument against the Elasticsearch sync pipeline.
- **Referral tables are RLS-on-with-no-policies**, because a readable code-to-token mapping would
  be a token dictionary.
- **Realtime requires `ALTER PUBLICATION supabase_realtime ADD TABLE reports`**, added in
  migration `014`. Without it the subscription connects and receives nothing, so the failure is
  invisible. `supabase/test/03_realtime.sql` reads a `pgoutput` replication slot directly and
  asserts **13 frames: 1 INSERT, 2 UPDATE, 1 DELETE**.

## Data gaps ❓

| Gap | Detail |
|---|---|
| Council boundaries | Placeholder bounding boxes that overlap. Real ABS polygons are **OG7** |
| `ml-models` storage bucket | Referenced in `PRD.md` § 7.1 and **no migration defines it** |
| Terms page legal content | **12** `[PLACEHOLDER]` markers in `src/constants/terms.ts`. **OG10** |

## Related

[[(Note) The Verification Harness]] · [[(Note) The Gates That Could Not Fail]] ·
[[(Note) External Services]] · [[(Note) Owner-Gated Backlog]] ·
[[(Index) 40 Data & Integrations]]
