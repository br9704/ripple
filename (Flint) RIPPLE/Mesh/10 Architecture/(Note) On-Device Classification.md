---
id: d83cf3ce-3037-473a-8799-0cf29bb052ac
title: "On-Device Classification"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/src/lib/litert.ts"
---

# On-Device Classification 🟡

**The photo is classified on the phone before it uploads, in a measured 15 ms at p50 against a
3,000 ms budget.** The pipeline is complete and benchmarked. ⚠️ The model it ships with is
generic, so no accuracy claim is made.

## The pipeline

| Step | File | What happens |
|---|---|---|
| 1. Capture | `src/components/CameraCapture.tsx` | `<input type="file" capture="environment">`. The OS camera, not a `getUserMedia` reimplementation |
| 2. Preprocess | `src/lib/preprocessImage.ts` | Canvas API. **Centre crop, never squash**, so aspect ratio is preserved |
| 3. Compile and run | `src/lib/litert.ts` | `@litertjs/core`. WebGPU where available, WASM plus XNNPACK where not |
| 4. Tier the result | `src/lib/classification.ts` | Three confidence bands, tested at their exact boundaries |
| 5. Record the override | `ai_correction_log` table | `{ai_category, ai_confidence, final_category}` |

`src/lib/compressImage.ts` handles the upload-side compression, separately from the
inference-side preprocessing. The two do different jobs and are not shared.

## Measured performance

| | |
|---|---|
| Accelerator | WebGPU, falling back to WASM/XNNPACK |
| Model | EfficientNet-Lite0 int8, **5.18 MB** |
| **Inference p50** | **15 ms** |
| **Inference p95** | **22 ms** over 20 runs |
| Runtime load and compile | ~**65 ms**, once per session |
| Cold first-ever run | ~**100 ms** end to end |
| `MOTION.md` budget | **3,000 ms** |

Produced by `pnpm bench:ai`, running real LiteRT WASM against a real int8 `.tflite` in a real
browser. Recorded in `docs/evidence/gates.json` with the machine it was measured on.

⚠️ **This is a lower bound, not a phone number.** Measured on Apple Silicon with the WebGPU
accelerator. Allowing a mid-range Android to be 20 to 30 times slower puts the warm path near
**300 to 660 ms**, still inside budget, but a representative-hardware figure is not claimed
until it is measured on representative hardware. That is owner-gated item **OG6**.

## The confidence tiers

| Confidence | Behaviour |
|---|---|
| **> 85%** | Result card snaps in with a tick |
| **60 to 84%** | Types `> does this look right?` and asks |
| **< 60%** | Fans out two options, emphasises neither |

Tested at their exact boundaries in `src/lib/classification.test.ts`, which matters because an
off-by-one at 85 changes the interaction a user gets.

## Failure is a designed path

If the model is missing, the runtime fails, or a browser advertises WebGPU support and then
fails to compile, the app drops silently to the manual `CategoryPicker`. **A broken classifier
never blocks a report.** A fresh `pnpm dev` takes exactly this path, because `predev` syncs the
WASM but does not fetch the model.

## Why LiteRT.js and not TensorFlow.js

Recorded in the masterplan's Architecture Decisions Log, August 2026:

- TF.js latest is `4.22.0` from October 2024, roughly 22 months stale and effectively frozen.
  Google positions LiteRT.js as its successor and ships a migration guide.
- LiteRT.js `2.5.3` published 2026-07-17, actively maintained. **Verified against the npm
  registry, not assumed.**
- **int8 `.tflite` (~5 MB) over MobileNetV2 (~14 MB)**, cutting first load roughly threefold on
  4G, which is the binding constraint on the PRD's "under 5 s model load". int8 also
  disproportionately favours the WASM fallback, which does SIMD on packed 8-bit.
- **Preprocess with Canvas, not `@litertjs/tfjs-interop`.** Google's quickstart uses
  `runWithTfjsTensors`, reintroducing frozen TF.js purely for tensor plumbing. Confirmed by
  reading the package's own `.d.ts`.
- **Cache Storage API for the model, not IndexedDB.** IndexedDB caching was a TF.js API artefact
  (`model.save('indexeddb://')`). With a plain `.tflite` fetch, the service worker's Cache
  Storage is the native fit, and a versioned filename makes invalidation free.
- **WebNN rejected**, behind flags in every browser as of August 2026.

This supersedes `PRD.md` § 7.5 for the AI/ML row only.

## The honest gap ⚠️

**No accuracy claim is made.** The shipped model is a generic EfficientNet-Lite0 carrying
**ImageNet's thousand classes, not Ripple's ten categories**. It proves the runtime loads, the
cache works and the latency is real. Its predictions are not civic-meaningful.

A production build ships that model, so classification *runs*. It is simply not yet trustworthy,
which is exactly why the confidence tiers and the one-tap override exist. The PRD's ">70%
correct without correction" target is **unmet and unmeasured**.

The fine-tune needs roughly **500 images per category across 10 categories**, which is
owner-gated item **OG2**. Swapping it in is a one-URL change by design, because the filename is
versioned.

## Weight cost

The LiteRT WASM runtime is about **2 MB gzipped** and the model about **5 MB**, putting first
load near **7 MB** against a stated "under 5 s on 4G". The original stack comparison counted
model sizes only and omitted the runtime entirely. Mitigations are real: the model loads lazily,
never blocks a report, and is cached after first use. The budget is still exceeded, and mobile
Lighthouse Performance of **68** reflects it.

`public/litert-wasm/` holds **8** files and is gitignored, synced from `node_modules` by
`scripts/sync-litert-wasm.mjs` on both `predev` and `prebuild`. **37 MB** of it is deliberately
excluded from the service worker precache.

## Related

[[(Note) System Architecture]] · [[(Note) The Five Load-Bearing Decisions]] ·
[[(Note) Owner-Gated Backlog]] · [[(Note) The Verification Harness]] ·
[[(Index) 10 Architecture]]
