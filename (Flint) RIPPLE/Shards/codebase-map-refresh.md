---
id: 0a95d6db-7f3c-463c-a871-e45162363e49
title: "codebase-map-refresh"
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

# Shard: codebase-map-refresh

**Re-derives the codebase map from disk. Never from memory, never from the last version of this
vault.** This repository has already been burned twice by counts that were true when written and
never re-measured, so **recount, do not restate**.

Target: `flint resolve codebase RIPPLE`, which is `/Users/brunojaamaa/Desktop/RIPPLE`.

1. Confirm zero dataless iCloud files first:
   `find /Users/brunojaamaa/Desktop/RIPPLE -type f -flags +dataless 2>/dev/null | head -20`.
   Any output means stop, because reading one hangs indefinitely.
2. Recount files per directory, excluding `node_modules/`, `dist/`, `.git/`, `.DS_Store` and
   `public/litert-wasm/`. Update [[(Report) Folder Audit]] and
   [[(Index) Complete File Inventory]].
3. Re-list `supabase/migrations/` in full. New migrations are the most common drift, and the
   masterplan's OG1 text is **already stale** at "15 migrations" against 27 on disk.
4. Re-read `package.json`. Dependencies and the **20** scripts both feed
   [[(Note) Install Run and Verify]] and [[(Note) System Architecture]].
5. Re-read `src/App.tsx` for routes and `supabase/functions/` for endpoints. Update
   [[(Note) Routes and Surfaces]].
6. `grep -rE 'TODO|FIXME|HACK|XXX' src supabase scripts`. The recorded figure is **0** genuine
   markers, with one hit that is a comment recording an obsolete TODO.
7. **Re-run the gates rather than reading them.** `pnpm test:run`, `pnpm lint`, `pnpm build`,
   `pnpm verify:db`, `pnpm verify:pwa`. Recorded: **340 / 34 files**, 0/0/0 lint, exit 0,
   **27 migrations / 102 assertions**, **28/28**. Update `docs/evidence/gates.json` only by
   re-running its commands.
8. Check whether `src/workers/` is still empty and whether it can be deleted.
9. Log a `sync` op to `OBSIDIANLOG.md` via
   `/Users/brunojaamaa/Desktop/Main Vault/Main/Shards/tools/obsidianlog.mjs`.
10. `flint sync`.

**Read-only outside the vault.** No git writes. See [[(System) Flint Init]].

## Related

[[vault-audit]] · [[changelog-from-git]] · [[(Report) Folder Audit]] · [[(Note) The src Tree]]
