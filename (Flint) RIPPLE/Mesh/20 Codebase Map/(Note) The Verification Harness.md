---
id: 57273caa-b909-4c14-8305-0af9c88291d5
title: "The Verification Harness"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/scripts"
---

# The Verification Harness 🟢

**Nine gates, each named by the command that produces it, none quoted from memory.** This is the
most transferable thing in the repository. Every figure in the README has a command beside it,
and `docs/evidence/gates.json` records the machine, the date and the tree each was measured
against.

| Command | What it proves |
|---|---|
| `pnpm test:run` | **340 tests across 34 files.** Classification tiers at their exact boundaries, council detection including the overlap tie-break, CSV formula-injection escaping, contrast ratios computed from the files on disk, and the filter and sort predicates shared by map and feed so the two cannot disagree |
| `pnpm lint` | **0** errors, **0** warnings, **0** blanket suppressions, `strictTypeChecked` plus `stylisticTypeChecked` |
| `pnpm build` | `tsc -b` across **three** TypeScript projects, then Vite. Service worker emitted, **37 MB** of LiteRT WASM correctly excluded from precache, no server-side secret name present in the bundle |
| `pnpm verify:db` | **27** migrations applied to a throwaway PostgreSQL 17.11, seed loaded, **102** assertions: 34 behavioural, 37 coverage-closure, 26 RLS, 5 Realtime. **0** failures |
| `pnpm verify:pwa` | **28 / 28** installability criteria, including the four `apple-*` tags iOS uses *instead of* the manifest |
| `pnpm verify:mobile` | **20** checks under real iPhone 14 (WebKit) and Pixel 7 (Chromium) profiles: `capture="environment"` present, 64×64 shutter against a 60 pt minimum, zero horizontal overflow |
| `pnpm verify:offline` | **18** checks. Model resolves from Cache Storage byte-identical, **5,434,517** bytes both ways, with the network cut. All five routes render from cache |
| `pnpm bench:ai` | Real LiteRT WASM against a real EfficientNet-Lite0 int8 `.tflite` in a real browser |
| `pnpm verify:lighthouse` | Both form factors, full reports written to `docs/evidence/` |

`pnpm verify` chains tests, lint, build, PWA, mobile and offline as the full local gate.

## The database harness

`scripts/verify-db.sh` provisions a throwaway local PostgreSQL, applies a Supabase-compatible
shim (`supabase/test/00_supabase_shim.sql`), runs every migration, loads the seed, and then
**attacks the result as `anon`**. No cloud account, no spend, no owner gate.

It caught a real defect on its first run: migration `017` called `calculate_priority(NEW.id)`
from a `BEFORE UPDATE` trigger, where the table still holds the old row, so the function re-read
the status it was in the middle of replacing and the status penalty never applied. **That is
precisely the bug the migration exists to fix, reintroduced one line below the comment
describing it.** Invisible to code review, and it would have been invisible in production too,
in the direction that keeps resolved reports ranked as urgent on a council dashboard.

Test files: `01_verify.sql` (behavioural), `02_rls.sql`, `03_realtime.sql`, `04_sprint21.sql`.

## The security assertions

Running as `anon` with RLS enforced, the suite first attempts to **harvest** a reporter token
from every table that exposes its rows publicly, then attempts to replay whatever it got. **The
chain is asserted broken at the harvest, not at the replay.** Before asserting that zero rows
were harvested, the harness asserts those tables are **non-empty**, so the test cannot pass by
having nothing to attack.

Four of the ten tables carrying a reporter token expose rows publicly and are protected by
column-level privileges. The other six are covered by row policies, or by RLS-on-with-no-policies
for the referral tables, where a readable code-to-token mapping would be a token dictionary. Each
of those six is confirmed non-empty and still invisible to `anon`, because "returns nothing"
proves nothing about an empty table.

Proven this way: an attacker cannot obtain a reporter token, delete another token's upvote, read
another token's notification email, forge comment authorship, or post as the council, while
reports stay publicly readable, anonymous submission still works, and a user can still see their
own upvote and notification settings.

## CI

`.github/workflows/verify.yml`, three jobs so a failure names itself: **a broken type is not a
broken migration is not a broken service worker**.

| Job | Runs |
|---|---|
| `build-and-test` | `pnpm test:run`, `pnpm lint`, `pnpm build`, `pnpm verify:pwa`, uploads `dist` |
| `browser` | Playwright installs real Chromium and WebKit, then `verify:mobile` and `verify:offline` |
| `database` | `postgres:17` service container, then `./scripts/verify-db.sh` |

CI sets three placeholder client env values inline, identical to `.env.test`, because
`src/lib/supabase.ts` throws at module init without them. The workflow comment explains that a
build made without them produces a bundle that renders nothing, which is how the first CI runs
reported "file input not present on the report flow" against a page that had in fact crashed on
boot.

**Two gates are deliberately absent from CI**, and the workflow says why:

- `bench:ai`, because a latency number from a shared CI runner is noise. Run locally.
- Real-device PWA install, because tapping Share then Add to Home Screen is irreducibly manual.

## Lighthouse, honestly

| Preset | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| **mobile**, 4G, Moto G Power class CPU | **68** | **100** | **96** | **91** |
| desktop, unthrottled | 96 | 100 | 96 | 91 |

⚠️ **The mobile run is the one that counts for a 375px-first product, and it is below the
project's own ≥90 gate**, so `pnpm verify:lighthouse` exits non-zero. FCP is 4.7 s and LCP 5.6 s
under 4G throttling. CLS is 0 and TBT is 0 ms on both presets, so this is transfer weight, not
main-thread work.

The desktop number is included because a single score with no form factor attached is how an
earlier **92** came to be quoted as though it were the whole picture. The map route is not
scored: headless Chrome software-rasterises Mapbox GL through SwiftShader, which measures the
harness rather than the app.

The Accessibility 100 is real, and it means "nothing failing was visible on the audited route",
not "nothing fails". A declined report is not on the feed's first screen.

## Related

[[(Note) The Gates That Could Not Fail]] · [[(Note) Data Model and RLS]] ·
[[(Note) Install Run and Verify]] · [[(Index) 20 Codebase Map]]
