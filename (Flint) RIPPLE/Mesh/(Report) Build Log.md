---
id: 2104e45a-3f38-491c-b85d-b088fda039f9
title: "Build Log"
type: report
project: "RIPPLE"
tags:
  - "#report"
  - "#project"
  - "#ld/living"
  - "#stack/react"
  - "#status/dormant"
  - "#cluster/university"
status: dormant
created: "2026-08-17"
updated: "2026-08-17"
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/(Flint) RIPPLE"
---

# Build Log 🚀

**Vault built 2026-08-17 by `claude:subagent-ripple-flint`, as part of the BRUNO HQ phase 2 wave
2 build.** flint-cli **0.6.0-dev.21**.

## What was run

| Step | Command | Result |
|---|---|---|
| Hazard check | `find /Users/brunojaamaa/Desktop/RIPPLE -type f -flags +dataless` | **0** dataless files. Safe to read |
| Log | `obsidianlog.mjs --op vault-init` | Row written to `RIPPLE/OBSIDIANLOG.md` and hub rollup |
| Init | `flint init "RIPPLE" --path "/Users/brunojaamaa/Desktop/RIPPLE" --no-open` | ✓ Created `(Flint) RIPPLE/`, registered in `~/.nuucognition/flint/` |
| Sync | `flint sync` | ✓ Cloned `.obsidian/`, applied 2 shards (`flint`, `orbh`) |
| Reference | `flint reference codebase "RIPPLE" "/Users/brunojaamaa/Desktop/RIPPLE"` | ✓ Added |
| Fulfill | `flint fulfill codebase "RIPPLE" "/Users/brunojaamaa/Desktop/RIPPLE"` | ✓ Fulfilled |
| Resolve | `flint resolve codebase RIPPLE` | ✓ Resolves to `/Users/brunojaamaa/Desktop/RIPPLE`, one worktree |
| Audit | Read-only pass over the codebase | Logged as `audit` |
| Notes | 42 notes authored | Logged as `note-create` |
| Verify | Custom Node script | Logged as `verify` |
| Sync | `flint sync` | ✓ |

## Deviations

**1. `flint resolve` needs the legacy two-argument form.** `flint resolve RIPPLE` and
`flint resolve codebase-RIPPLE` both fail on 0.6.0-dev.21:

```
✘ Could not resolve reference "codebase-RIPPLE": The flattened token name part
  "RIPPLE" must contain lowercase letters or digits separated by single underscores.
```

The universal-address form requires a lowercase, underscore-separated name part, and this Flint
is registered as uppercase `RIPPLE`. **The working form is `flint resolve codebase RIPPLE`.**
Installed CLI wins over docs, so this is documented rather than worked around by renaming.

**2. `obsidianlog.mjs` resolves the project log from `cwd`, not from `--project`.** The first
`vault-init` call was made from the hub directory and wrote its row into the hub's own
`OBSIDIANLOG.md` rather than creating one at the project root. Re-run from
`/Users/brunojaamaa/Desktop/RIPPLE`, it behaved correctly and created
`/Users/brunojaamaa/Desktop/RIPPLE/OBSIDIANLOG.md`. Recorded in the vault `CLAUDE.md` so it does
not recur.

**3. `.env.test` was opened, deliberately and narrowly.** The brief instructed verifying that it
carries a header stating it holds no secrets, without reading further. ✅ **The header exists**
and reads *"Committed on purpose. These are not secrets and never reach a network."* Eight
header lines were read and nothing beyond them. No value from that file appears anywhere in this
vault.

## Verification results

Script: `verify.mjs`, run against the vault root with `(Map) Master Map` as the reachability
root. It parses every frontmatter block as YAML, resolves every `[[wikilink]]` against the note
set, walks the link graph for orphans, and sweeps body copy for em dashes. Code spans and fenced
blocks are stripped before link extraction so documentation examples are not counted.

| Check | Target | Result |
|---|---|---|
| Frontmatter parses as YAML | 0 errors | ✅ **0** |
| Required keys present on every note | `id` `title` `type` `project` `tags` `status` `created` `updated` | ✅ **0 missing** |
| `id` is a lowercase UUID | every note | ✅ **0 violations** |
| Tag list items quoted | every note | ✅ **0 unquoted** |
| Empty tag lists | 0 | ✅ **0** |
| `status` in the allowed set | `active` `dormant` `shipped` `archived` | ✅ **0 violations** |
| `health` is exactly `green`/`amber`/`red` | Project Summary | ✅ `amber`, nuance in `health_note` |
| Broken wikilinks | 0 | ✅ **0** |
| Orphans, unreachable from Master Map | 0 | ✅ **0** |
| Em dashes in body copy | 0 | ✅ **0** |
| Every folder documented or excluded | see [[(Report) Folder Audit]] | ✅ all 9 top-level folders accounted for |

## Note count

**42 notes authored**, plus this vault's `CLAUDE.md` at the root.

| Location | Notes |
|---|---|
| `Mesh/` root | 8 |
| `Mesh/00 Overview/` | 3 |
| `Mesh/10 Architecture/` | 3 |
| `Mesh/20 Codebase Map/` | 4 |
| `Mesh/30 Setup & Run/` | 2 |
| `Mesh/40 Data & Integrations/` | 3 |
| `Mesh/50 Decisions & ADRs/` | 3 |
| `Mesh/60 Roadmap, Tasks & Ideas/` | 3 |
| `Mesh/70 Ops, Deploy & Env/` | 3 |
| `Mesh/90 Reference/` | 3 |
| `Shards/` | 4 |
| `Sources/` · `Media/` · `Exports/` | 1 each |

Further Markdown files exist under `Mesh/Metadata/`, `Mesh/Main/`, `Shards/Flint/` and
`Shards/Orbh/`. Those are Flint scaffold, installed by `flint init` and `flint sync`, and are not
authored by this build.

## Vault tree

```
(Flint) RIPPLE/
├── CLAUDE.md
├── flint.toml · flint.json · .gitignore
├── Exports/(Note) Exports.md
├── Media/(Note) Media.md
├── Mesh/
│   ├── (Guide) BRUNO HQ.md
│   ├── (Index) Complete File Inventory.md
│   ├── (Map) Master Map.md
│   ├── (Report) Build Log.md
│   ├── (Report) Folder Audit.md
│   ├── (Report) Gaps & Questions.md
│   ├── (Report) Project Summary.md
│   ├── (System) Flint Init.md
│   ├── 00 Overview/          (Index) + What Ripple Is · Who It Is For
│   ├── 10 Architecture/      (Index) + System Architecture · On-Device Classification
│   ├── 20 Codebase Map/      (Index) + Routes and Surfaces · The src Tree · The Verification Harness
│   ├── 30 Setup & Run/       (Index) + Install Run and Verify
│   ├── 40 Data & Integrations/ (Index) + Data Model and RLS · External Services
│   ├── 50 Decisions & ADRs/  (Index) + The Five Load-Bearing Decisions · The Gates That Could Not Fail
│   ├── 60 Roadmap, Tasks & Ideas/ (Index) + Designed and Never Built · Owner-Gated Backlog
│   ├── 70 Ops, Deploy & Env/ (Index) + Deploy and Environment · The Unpushed Commit
│   ├── 90 Reference/         (Index) + Git History · Hub Note Corrections
│   └── [scaffold] Agents/ Groups/ Main/ Metadata/ People/ Sections/
├── Shards/
│   ├── codebase-map-refresh.md
│   ├── changelog-from-git.md
│   ├── onboarding-guide.md
│   ├── vault-audit.md
│   └── [scaffold] Flint/ Orbh/ (Shards) …
├── Sources/(Index) Sources.md
└── Workspace/Repos · Workspace/Bench
```

`80 Testing & Quality` was deliberately not created. Verification is this project's defining
property and is covered by [[(Note) The Verification Harness]] inside `20 Codebase Map`, next to
the code it asserts against. Empty sections are dropped rather than padded.

## Ground rules observed

- Nothing outside the vault was moved, renamed, deleted or reformatted. The single write outside
  the vault is `/Users/brunojaamaa/Desktop/RIPPLE/OBSIDIANLOG.md`, appended by
  `obsidianlog.mjs`.
- ⚠️ **Nothing was pushed, committed, stashed, checked out, cleaned or reset.** Git was read-only
  throughout. The full command list is in [[(Index) Sources]].
- No secret was copied. `.env.local` was never opened. `.env.test` was read only far enough to
  confirm its header, per the brief.
- No large file was copied. `public/` (**42 MB**), `dist/` (**51 MB**), `docs/evidence/`
  (**810 KB** of Lighthouse JSON) and `docs/media/` are all linked by absolute path.
- Every folder in the codebase is documented or listed as excluded with a reason, in
  [[(Report) Folder Audit]].
- **12** gaps recorded in [[(Report) Gaps & Questions]] rather than filled with guesses.
- Where the hub note and the repository disagreed, the repository won. **9** corrections in
  [[(Note) Hub Note Corrections]], plus **4** internal masterplan inconsistencies logged in
  [[(Report) Gaps & Questions]].

## Related

[[(System) Flint Init]] · [[(Map) Master Map]] · [[(Report) Project Summary]] ·
[[(Index) Sources]] · [[(Report) Gaps & Questions]]
