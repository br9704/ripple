---
id: cc272249-3e0f-4326-af17-94b729f70573
title: "The Unpushed Commit"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/.git"
---

# The Unpushed Commit ⚠️

**One commit sits on local `main` ahead of `origin/main`. It is documentation only. It is safe to
publish.** The repository is **public** at `github.com/br9704/ripple`, so pushing publishes it
immediately.

Working tree is **clean**, zero dirty files. Branch is `main`, tracking `origin/main`.

## `9c96de1` docs: link the case study on brunojaamaa.dev

2026-08-15 23:03 +1000. **2 files changed, 5 insertions, 0 deletions.**

```
PROJECT.json | 1 +
README.md    | 4 ++++
```

`PROJECT.json` gains one key inside its existing `links` object:

```json
"caseStudy": "https://brunojaamaa.dev/projects/ripple",
```

`README.md` gains a four-line centred paragraph linking the same URL, placed after the install
snippet.

That is the entire diff.

## Verdict 🟢 safe

No credentials, no tokens, no private paths, no personal data beyond a public portfolio domain
already named in `package.json` under `author` and in the README's own byline. **5 added lines**,
all documentation.

Note that this is the **exact same commit**, on the same day, ten seconds apart, as PULSE's
`ca676cf`. Both link a case study on `brunojaamaa.dev`. They were made together and they should
be decided together.

## Why it was held back anyway

The commit does one substantive thing: it announces a case study at
`https://brunojaamaa.dev/projects/ripple`. Pushing puts that link in the README of a public
repository and in the machine-readable `PROJECT.json` that portfolio tooling reads.

> [!todo] Missing, not found in the repository
> Whether `brunojaamaa.dev/projects/ripple` is live. Nothing in the repo records the state of
> that page, and this vault does not fetch the network. If the page does not exist yet, pushing
> publishes a broken link on the front page of a public repo.

**That is the decision, and it is a publishing decision rather than a security one.** Confirm the
case study page is live, then push. There is nothing else in the commit to weigh.

## What is already public and stays public

For completeness, since the repo is public and this often gets conflated with the push decision:

- `.env.test` is committed on purpose and carries a header saying so. It holds placeholder values
  that resolve to nothing. Verified. See [[(Note) Deploy and Environment]].
- The Supabase **anon key** is public by design per `PRD.md` § 10.3. It is not in the repo, but
  it is not a secret when it does reach a bundle.
- The Mapbox token is public by design. Its mitigation is a **referrer restriction**, not
  secrecy.
- The dead Supabase project ref `nexccbcmziiltysfcmzi` appears in `MASTERPLAN.md` and
  `supabase/.temp/`. It refers to a deleted project and grants nothing.

## Ground rule observed

Nothing in this vault pushed, committed, stashed, checked out, cleaned or reset anything. Only
`git log`, `git show --stat`, `git show`, `git status`, `git branch`, `git remote -v`,
`git rev-list` and `git shortlog` were used. `git worktree list` via `flint resolve` shows one
worktree, `main` at the project root, and nothing stale.

## Related

[[(Note) Git History]] · [[(Note) Deploy and Environment]] ·
[[(Report) Project Summary]] · [[(Index) 70 Ops, Deploy & Env]]
