---
id: 11cdb4fe-458b-4c27-86ca-92de0014c71b
title: "vault-audit"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/(Flint) RIPPLE"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

# Shard: vault-audit

**Checks this vault against itself.** The hub has `hub-audit`; this is its counterpart for
`(Flint) RIPPLE`.

In the spirit of the project it documents: **every check below must have an answer to "what would
this have to look like to fail?"**

1. **Frontmatter parses.** Every `.md` under `Mesh/`, `Shards/`, `Sources/`, `Media/` and
   `Exports/` must have a YAML block that parses. Every `id` must be a lowercase UUID.
2. ⚠️ **Tag list items must be quoted.** `- "#note"`, never `- #note`. An unquoted `#` starts a
   YAML comment and silently empties the tag list. This is the single most common breakage.
3. **Broken wikilinks: 0.** Resolve every `[[link]]` against the note set. Strip fenced blocks
   and inline code first, or documentation examples count as links.
4. **Orphans: 0.** Every note must be reachable from [[(Map) Master Map]].
5. **Required keys present.** `id`, `title`, `type`, `project`, `tags`, `status`, `created`,
   `updated`, plus `source_path` where relevant.
6. **Tag order.** Kind tag first, then `#project`, `#ld/living`, `#stack/react`,
   `#status/dormant`, `#cluster/university`.
7. **`health` is exactly one of** `green`, `amber`, `red` in [[(Report) Project Summary]].
   Nuance belongs in `health_note`, never in `health`.
8. **Every `source_path` resolves on disk.**
9. **Folders documented or excluded.** Cross-check [[(Report) Folder Audit]] against a fresh
   `find` of the codebase. Every folder is one or the other, with a reason.
10. **Every `> [!todo]` callout has a row** in [[(Report) Gaps & Questions]], and vice versa.
11. **No em dashes in body copy.** House voice.
12. **No secrets.** Grep the vault for anything resembling a key, a token or a `.env` value. The
    vault should contain variable **names** only. Confirm no line of `.env.test` beyond its
    header has been transcribed.
13. **Every number in the vault traces to a command or a file.** Spot-check five. If one cannot
    be traced, it is a defect, because this project's own numbers have drifted four times.
14. Write findings into [[(Report) Build Log]], dated. Log an `audit` op. `flint sync`.

Findings become tasks. This shard reports and files. It repairs nothing except frontmatter
quoting.

## Related

[[codebase-map-refresh]] · [[changelog-from-git]] · [[onboarding-guide]] ·
[[(Report) Build Log]]
