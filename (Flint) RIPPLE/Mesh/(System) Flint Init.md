---
id: 59bee255-2c3f-4855-8e0b-5ce6540c4432
title: "Flint Init"
type: system
project: "RIPPLE"
tags:
  - "#system"
  - "#f/init"
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

# Flint Init

**This vault documents `/Users/brunojaamaa/Desktop/RIPPLE`, the Ripple civic reporting PWA.** It
is a knowledge layer over a codebase, not the codebase. Nothing here is imported by anything that
runs.

## What this Flint is

| | |
|---|---|
| Flint name | `RIPPLE`, registered in `~/.nuucognition/flint/` |
| Vault path | `/Users/brunojaamaa/Desktop/RIPPLE/(Flint) RIPPLE` |
| Codebase | `/Users/brunojaamaa/Desktop/RIPPLE`, referenced as codebase `RIPPLE` |
| Cluster | `university`, shared with PULSE |
| Parent hub | [[(Guide) BRUNO HQ]] |
| Built | 2026-08-17, flint-cli 0.6.0-dev.21 |

Resolve the codebase from anywhere with `flint resolve codebase RIPPLE`.

## Read it in this order

1. [[(Report) Project Summary]] for the verdict and the numbers.
2. [[(Map) Master Map]] for everything else, with a "start here if you want to" table.
3. [[(Report) Gaps & Questions]] for what the repository does not answer.

If you only read one note that is not a summary, read
[[(Note) The Gates That Could Not Fail]].

## The rules this vault was built under

- **Read-only outside the vault.** Nothing in the codebase was moved, renamed, deleted or
  reformatted. The single exception is `/Users/brunojaamaa/Desktop/RIPPLE/OBSIDIANLOG.md`, which
  this build appends operation rows to by design.
- **Git was read, never written.** Only `log`, `show`, `show --stat`, `status`, `branch`,
  `remote -v`, `rev-list` and `shortlog`. ⚠️ **Nothing was pushed.** The one unpushed commit is
  unpushed on purpose because the remote is public. See [[(Note) The Unpushed Commit]].
- **No invented facts.** Anything the repository does not state carries a `> [!todo]` callout
  naming where the search happened, and a row in [[(Report) Gaps & Questions]].
- **No secrets.** Environment variable **names** only. `.env.local` was never opened.
  `.env.test` was read only far enough to confirm its "committed on purpose, these are not
  secrets" header, which ✅ exists.
- **No large files copied.** Screenshots, Lighthouse reports and build output are linked by
  absolute path via `source_path:`.
- **Repo wins over note.** Where the hub note and the repository disagree, the repository is
  recorded. Nine corrections in [[(Note) Hub Note Corrections]], and four internal masterplan
  inconsistencies in [[(Report) Gaps & Questions]].

## Sections

`00 Overview` · `10 Architecture` · `20 Codebase Map` · `30 Setup & Run` ·
`40 Data & Integrations` · `50 Decisions & ADRs` · `60 Roadmap, Tasks & Ideas` ·
`70 Ops, Deploy & Env` · `90 Reference`

There is no `80 Testing & Quality` section. Verification is this project's defining property and
is covered by [[(Note) The Verification Harness]] under `20 Codebase Map`, next to the code it
asserts against.

## Shards

Four project shards live in `Shards/`. Each is an instruction, meant to be acted on when
referenced.

[[codebase-map-refresh]] · [[changelog-from-git]] · [[onboarding-guide]] · [[vault-audit]]

## Related

[[(Map) Master Map]] · [[(Report) Project Summary]] · [[(Report) Build Log]] ·
[[(Guide) BRUNO HQ]]
