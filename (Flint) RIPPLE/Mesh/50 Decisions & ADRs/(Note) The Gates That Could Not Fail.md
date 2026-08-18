---
id: cecc54af-653a-4259-8a24-90740851e2cc
title: "The Gates That Could Not Fail"
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

# The Gates That Could Not Fail ⚠️

**Four of this project's own green checks could never have failed.** That sentence is
`PROJECT.json`'s stated headline, and it is the most reusable idea in either of Bruno's two
university-cluster repositories.

## The four

| Gate | Why it could not fail |
|---|---|
| **Typecheck** | `npx tsc --noEmit` ran against the **root** `tsconfig.json`, a solution file with `"files": []` plus project references, which `--noEmit` does not traverse. It **checked zero files** and exited 0. A real build was failing at the same time |
| **PWA navigation fallback** | The check used the regex `/navigateFallback\|offline\.html/`, which **accepts either answer** and could therefore never detect the wrong one |
| **RLS security** | The tests declared the attacker's token as a **literal fixture**, so they proved the attack failed without ever testing whether the credential could be obtained |
| **Column revoke** | `REVOKE SELECT (col) FROM anon` **cannot subtract from a table-level `GRANT`**. Separate ACLs. It raises no error and reports success either way |

All four were green. Not one of them could have failed.

## The question worth asking

> **What would this have to look like to fail?**

If there is no answer, it is not a gate. That is the line the masterplan lands on, and it is the
whole lesson of the August audit.

## The March baseline

In March 2026 this repository reported **twenty sprints complete**. The completion criterion
offered was *"TypeScript and ESLint pass with zero errors"*, which for a codebase with **zero
test files** measures compilation rather than correctness, against a `CLAUDE.md` § 9 rule reading
**"no test, no merge"**.

An audit in August measured the repository against its own checkmarks instead of trusting them:

- **Seven** subtask claims were individually false (S0.2, S0.3, S0.9, S4.4, S4.5, S5.7, S6.5).
- **Zero** test files existed.
- The Supabase project the entire backend was written against returned NXDOMAIN from two
  independent resolvers. Because Supabase keeps *paused* projects resolving, that meant
  **deleted**.

## What the repairs turned up

Worse than the bookkeeping:

- **GPS failure was an unrecoverable dead end.** At the eight-second timeout the hook cleared its
  loading flag while latitude was still null, rendering the location line as blank space and
  leaving Submit permanently disabled. No error, no way forward.
- **All eight Edge Function validation messages were unreachable**, because `supabase-js` does
  not parse non-2xx bodies. Users saw "Edge Function returned a non-2xx status code" instead of
  "Note exceeds 140 character limit".
- **The offline queue flushed only while the user was sitting on `/report`.**
- **Rate limiting was `localStorage` theatre**, defeated by one devtools click.
- **Two RLS policies named `_own` were `USING (true)`**, so any anonymous caller could delete
  anyone's upvote and every stored notification email was world-readable.

## Then execution replaced assertion

A throwaway local PostgreSQL harness now applies every migration and attacks the result as
`anon`. It caught a real defect on its **first run**: the `BEFORE UPDATE` priority trigger
described in [[(Note) Data Model and RLS]].

## The documentation pass found three more

This is the part that matters, because the documentation pass ran the gates rather than reading
them:

1. **`pnpm build` was broken at `HEAD`**, a type error in the LiteRT wrapper, hidden by the
   vacuous typecheck. Fixing the gate paid for itself within the hour: made real, it immediately
   caught **7** errors that had been invisible. The fix for *those* was to move tests into their
   own TypeScript project rather than grant the app Node types, because a component that imported
   `fs` would otherwise typecheck cleanly and fail only in a browser.
2. **The service worker served the offline page to online users.** `navigateFallback` pointed at
   `/offline.html`, and a workbox `NavigationRoute` matches every navigation, so with the worker
   in control every route but `/` returned "You're offline right now" over a working network. It
   hid because `/` matches the precached shell directly and in-app link clicks issue no
   navigation request, leaving broken exactly the deep-link surface that shared reports exist to
   provide.
3. **The Lighthouse score on record was a desktop-preset number.** On the mobile preset this
   product actually targets, Performance is **68**, not 92.

## The contrast finding

The most on-the-nose one. Measuring the palette against the background found **three** colour
tokens below the WCAG AA floor `PRD.md` requires, **in an app whose stated purpose includes
reporting accessibility hazards**.

The first attempt at the fix changed nothing a user would ever see, because the palette is
defined in **three places** and only one was edited. One failing value had already been found and
fixed once before, in a different token, with the measurement still sitting in a comment beside
it.

And **Lighthouse scored Accessibility 100 throughout**, because it grades what is painted on the
route it audits, and a declined report is not on the feed's first screen. That 100 is real, and
it means "nothing failing was visible", not "nothing fails".

## The coverage lesson from Sprint 21

Every audit up to Sprint 21 compared the **marks** to the **code**. None compared the **PRD** to
the code. A plan can only certify what it contains, so "every task in this plan is complete" is a
statement about coverage of the plan and says nothing about coverage of the product.

Reading `PRD.md` against the source found **six requirements that no task had ever been written
for**. Not deferred, not declined, not owner-gated. Simply never tracked, and therefore invisible
to a completion count that read 220 of 220.

**The strongest claim available before Sprint 21 was "the plan is finished." It was not "the
product is."**

## Even the counts drifted

The masterplan's own status table read `220` tasks and `169 tests / 19 files` while the gate
table three paragraphs below it read `181 tests / 20 files`. Two counts of the same thing, in the
same document, disagreeing. Both were true when written and neither was re-measured. The `0 open`
cell was also false: two `- [ ]` boxes survived the session that declared zero, because the
counter was written by hand rather than derived from `grep -c`.

Every figure in both tables was re-measured by running the gate on 2026-08-15.

## Related

[[(Note) The Verification Harness]] · [[(Note) Data Model and RLS]] ·
[[(Note) The Five Load-Bearing Decisions]] · [[(Note) Git History]] ·
[[(Index) 50 Decisions & ADRs]]
