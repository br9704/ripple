---
id: fb7078da-12bc-45bd-b544-f6b8005e3b5b
title: "Sources"
type: index
project: "RIPPLE"
tags:
  - "#index"
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

# Sources

Everything this vault was built from. **All of it is local and read-only.** No network fetch was
performed at any point.

## Codebase reference

| | |
|---|---|
| Reference name | `RIPPLE` |
| Resolved path | `/Users/brunojaamaa/Desktop/RIPPLE` |
| Resolve with | `flint resolve codebase RIPPLE` |
| Declared in | `flint.toml` under `[references].codebases` |
| Status | ✓ fulfilled |

`Sources/Repos/` and `Sources/Bundles/` are Flint's own directories and are currently empty. No
external source or bundle has been imported.

## Primary documents read

All paths are absolute and none of these files was copied into the vault.

| Document | Lines | What it gave |
|---|---|---|
| `/Users/brunojaamaa/Desktop/RIPPLE/README.md` | 268 | Product, architecture diagram, the build story, every gate with its command, limitations, status |
| `/Users/brunojaamaa/Desktop/RIPPLE/MASTERPLAN.md` | 1,090 | Sprints 0 to 22, ADR log, known risks, owner-gated backlog |
| `/Users/brunojaamaa/Desktop/RIPPLE/PRD.md` | 1,471 | Six personas, phasing, feature specs |
| `/Users/brunojaamaa/Desktop/RIPPLE/PROJECT.json` | n/a | Metrics, honest field, decisions, ownerGated list |
| `/Users/brunojaamaa/Desktop/RIPPLE/package.json` | n/a | Dependencies and all 20 scripts |
| `/Users/brunojaamaa/Desktop/RIPPLE/.github/workflows/verify.yml` | n/a | CI structure and its inline reasoning |
| `/Users/brunojaamaa/Desktop/RIPPLE/docs/evidence/gates.json` | n/a | Measured gate results with machine and date |
| `/Users/brunojaamaa/Desktop/RIPPLE/vercel.json` | n/a | Rewrites and cache headers |
| `/Users/brunojaamaa/Desktop/RIPPLE/.gitignore` | n/a | The `!.env.test` re-inclusion and its comment |
| `/Users/brunojaamaa/Desktop/RIPPLE/.env.example` | n/a | ⚠️ Variable **names** only |
| `/Users/brunojaamaa/Desktop/RIPPLE/.env.test` | 8 lines | ⚠️ **Header only**, to confirm it states it holds no secrets. It does |

Directory listings were taken across `src/`, `supabase/`, `scripts/`, `public/`, `docs/` and
`.github/`, and table names were extracted from `supabase/migrations/*.sql` by grep. No SQL file
was read in full.

## Hub documents read

| Document | What it gave |
|---|---|
| `/Users/brunojaamaa/Desktop/Main Vault/Main/Mesh/Notes/Projects/(Note) RIPPLE.md` | The prior view, now corrected. See [[(Note) Hub Note Corrections]] |

## Git commands used

Read-only only, per ground rule 1.

```
git branch -a
git status --short
git remote -v
git ls-files
git log --oneline origin/main..HEAD
git log --oneline -30 --pretty=format:"%h|%ad|%s"
git rev-list --count HEAD
git shortlog -sne HEAD
git show --stat 9c96de1
git show 9c96de1
```

⚠️ No `push`, `commit`, `stash`, `checkout`, `clean`, `reset` or `worktree` write of any kind.

## Never opened

`.env.local` · `node_modules/` · `dist/` · `.git/` internals · `.claude/settings.local.json` ·
`ENGINEERPROMPT.md` and `DOCS-ENGINEERPROMPT.md` (mode 600, gitignored, not needed).

## Related

[[(Report) Build Log]] · [[(Report) Gaps & Questions]] · [[(Map) Master Map]]
