# CLAUDE.md for (Flint) RIPPLE

**This is the vault, not the codebase.** You are inside
`/Users/brunojaamaa/Desktop/RIPPLE/(Flint) RIPPLE`. The code lives one directory up at
`/Users/brunojaamaa/Desktop/RIPPLE`, which has its own `CLAUDE.md` carrying the engineering
contract, including the "no test, no merge" rule. That one governs code changes. This one governs
the vault.

## Hard rules

1. **Read-only outside this vault.** Never move, rename, delete or reformat anything under
   `/Users/brunojaamaa/Desktop/RIPPLE` except `OBSIDIANLOG.md`, which is append-only by design.
2. ⚠️ **NEVER push.** The remote `github.com/br9704/ripple` is **public**. One commit is unpushed
   on purpose. Read-only git only: `log`, `show`, `show --stat`, `status`, `branch`,
   `diff --stat`, `rev-list`, `shortlog`, `ls-files`. Never `commit`, `stash`, `checkout`,
   `clean`, `reset`, `rebase` or `merge`.
3. **Never invent a fact.** If the repository does not say it, write
   `> [!todo] Missing — not found in <where you looked>` and add a row to
   `Mesh/(Report) Gaps & Questions.md`.
4. **Never copy a secret.** Environment variable **names** only. Never open `.env.local`,
   `*.pem` or `*.key`. `.env.test` is committed on purpose and states so in its own header;
   confirming that header is the only reason to open it, and nothing past it should ever be
   transcribed into this vault.
5. **Never copy a large file.** `public/` is 42 MB and `dist/` is 51 MB. Link by absolute path in
   `source_path:`.
6. **Never touch** `node_modules/`, `dist/`, `.git/` internals, `public/litert-wasm/`,
   `coverage/`, `.cache/`, `.turbo/`, `_secrets/`, or anything matching `*silmu*`.
7. **Repo wins over note.** Where the hub disagrees with the code, the code is right. Log the
   disagreement in `Mesh/90 Reference/(Note) Hub Note Corrections.md`.
8. **Recount, never restate.** This project's own numbers have drifted four separate times.
   Every figure in this vault must trace to a command or a file on disk.

## Machine hazard

There are roughly **47,000 dataless iCloud files** on this Mac and reading one hangs
indefinitely. `timeout` does not exist here. Before any long read, check:

```bash
find <path> -type f -flags +dataless 2>/dev/null | head -20
```

`/Users/brunojaamaa/Desktop/RIPPLE` measured **0** on 2026-08-17. Re-check if that changes.

Guard long commands with:

```bash
tmo() { local t=$1; shift; ( "$@" ) & local p=$!; ( sleep "$t"; kill -9 $p 2>/dev/null ) & local w=$!; wait $p 2>/dev/null; local rc=$?; kill -9 $w 2>/dev/null; return $rc; }
```

## Note conventions

- Filenames are `(Type) Name.md`. Types: `(System)` `(Dashboard)` `(Plan)` `(Notepad)` `(Note)`
  `(Report)` `(Task)` `(Index)` `(Map)` `(Guide)`.
- **Every** note has frontmatter with a fresh lowercase UUID from `uuidgen | tr 'A-Z' 'a-z'`.
- ⚠️ **Tag list items must be quoted**: `- "#note"`. An unquoted `#` starts a YAML comment and
  silently empties the list.
- Scalars are double-quoted, except `id` and `status`.
- Required keys: `id`, `title`, `type`, `project`, `tags`, `status`, `created`, `updated`, plus
  `source_path` where relevant.
- Tag order: kind tag first, then `#project`, `#ld/living`, `#stack/react`, `#status/dormant`,
  `#cluster/university`.
- `status:` is one of `active`, `dormant`, `shipped`, `archived`. This project is `dormant`.
- Wikilinks carry the full `(Type) Name` and are never aliased. Link lists join with ` · `.

## Voice

Declarative and verdict-first. Bold the concrete numbers. British and Australian spelling. **No
em dashes in body copy.** No AI-tell words: delve, leverage, seamless, pivotal. Status labels stay
true even when unflattering, which for this project means saying that the live URL has no backend
and that mobile Lighthouse fails its own gate. Emoji from this set only: 🟢 🚀 🟡 ⚫ ⚠️ ❓.

## Logging

Every meaningful operation gets a row in `/Users/brunojaamaa/Desktop/RIPPLE/OBSIDIANLOG.md`:

```bash
cd /Users/brunojaamaa/Desktop/RIPPLE
node "/Users/brunojaamaa/Desktop/Main Vault/Main/Shards/tools/obsidianlog.mjs" \
  --actor "claude:<who>" --op <op> --target "(Flint) RIPPLE/" \
  --result "<what happened>" --trigger "<why>" \
  --project "/Users/brunojaamaa/Desktop/RIPPLE"
```

⚠️ Run it **from inside the project directory**. The tool resolves the project log relative to
`cwd`, not to `--project`.

## Flint commands that work here

```bash
flint sync                        # sync shards from flint.toml
flint reference list              # show codebase references
flint resolve codebase RIPPLE     # print the codebase path
flint list                        # all registered flints
```

⚠️ `flint resolve RIPPLE` alone fails on 0.6.0-dev.21. The universal-address form needs a
lowercase, underscored name part, so use the two-argument legacy form above.

## Start here

`Mesh/(Report) Project Summary.md` for the verdict, `Mesh/(Map) Master Map.md` for everything
else, `Mesh/(Report) Gaps & Questions.md` for what is unknown.
