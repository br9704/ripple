---
id: 50a048d5-cacb-4dc6-99a0-63a9cc95ab63
title: "Media"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/docs"
---

# Media

**Nothing is stored in this folder.** The project's images and evidence live in the repository
and are linked by absolute path, per the no-large-files rule.

## The four screenshots

All at `/Users/brunojaamaa/Desktop/RIPPLE/docs/media/`, all dated 2026-08-15.

| File | What it shows |
|---|---|
| `map.png` | The hero. Dark Mapbox view of central Melbourne, the amber RIPPLE wordmark, and the bracketed `[ REPORT ]` capture control |
| `report.png` | The capture and classify flow |
| `feed.png` | The chronological feed |
| `offline.png` | The offline state, which is a designed screen rather than an error |

**They are generated, not hand-captured.** `pnpm capture:media` runs
`scripts/capture-screenshots.mjs` against the production build in **real WebKit**, at an
**iPhone 14 viewport**, with **reduced motion**. That is stated in the README caption, and it
means the screenshots cannot drift from the build the way hand-taken ones do.

## The evidence folder

`/Users/brunojaamaa/Desktop/RIPPLE/docs/evidence/` is more interesting than the screenshots.

| File | Size | What it holds |
|---|---|---|
| `gates.json` | 4 KB | Every gate's measured result, with platform, Node version, PostgreSQL version, Lighthouse version and the date |
| `lighthouse-summary.json` | 1.5 KB | Both form factors, four categories each |
| `lighthouse-feed-mobile.json` | 422 KB | The **full** mobile report |
| `lighthouse-feed-desktop.json` | 388 KB | The **full** desktop report |

`gates.json` opens with a comment that is the project in miniature:

> Every figure here was produced by running the named command against the frozen tree on the
> stated date. None is carried forward from a document. Regenerate by running the commands and
> updating this file; do not edit a number here without re-running its command.

Committing **810 KB** of raw Lighthouse JSON rather than a summary line is unusual and correct:
a summary can be quoted out of context, which is exactly how an earlier desktop **92** came to
stand in for the whole picture.

⚠️ `gates.json` records **334** tests across **33** files, measured post-Sprint-21. The README
records **340** across **34**, measured after Sprint 22. Both are correct for their own tree. See
[[(Note) Git History]].

## Icons and the model

`/Users/brunojaamaa/Desktop/RIPPLE/public/` holds `favicon.svg`, `icons.svg` and three PWA icons.
`pnpm verify:pwa` asserts the icons are on disk, alongside the four `apple-*` tags iOS uses
**instead of** the manifest.

`public/models/ripple-classifier-v1.tflite` is **5,434,517 bytes** and is **gitignored**,
reproducible via `pnpm fetch:model`. `public/litert-wasm/` holds 8 generated runtime files and is
gitignored the same way. Together they are why `public/` measures **42 MB** on disk while its
tracked contents are trivial.

## Related

[[(Note) The Verification Harness]] · [[(Report) Folder Audit]] ·
[[(Index) Complete File Inventory]] · [[(Map) Master Map]]
