# Engineer Prompt — RIPPLE
# `~/Desktop/RIPPLE` · github.com/br9704/ripple · *"Snap a pothole; on-device AI files the report in 3 seconds. No account."*

> **Paste this into a fresh Claude Code session at `~/Desktop/RIPPLE`.**
> This project **already has** `MASTERPLAN.md`, `CLAUDE.md`, and `PRD.md`. You are **not** starting fresh and you are **not** rewriting them. You are resuming a stalled build and deepening the plan.

---

## Where this actually stands (measured, not assumed)

- Last commit `8d74b07`, Sprint 6 complete (live community map — Mapbox GL JS, clustering, Realtime, app shell)
- **79 tasks `[x]`, 92 tasks `[ ]`** — roughly 46% through the plan
- **The next unchecked sprint is Sprint 7: AI Image Classification** (S7.1–S7.7): TensorFlow.js + MobileNetV2, IndexedDB model caching, `useAIClassification` hook, `AIResultCard`, `ConfidenceBar`, confidence thresholds (≥85% prominent / 60–84% "does this look right?" / <60% show top 2), category override with correction logging
- **Not deployed. No live URL.** The portfolio lists it as `IN DEVELOPMENT` with a password-protected case study.

**The blunt read:** Sprint 7 is the entire product thesis. The one-liner promises *"on-device AI files the report in 3 seconds"* — and the on-device AI is the next unbuilt sprint. Everything before it is a photo-and-map app. **This is the single highest-leverage unbuilt thing across all of Bruno's projects**, because it's the sprint that makes the tagline true.

---

## Phase 1 — Research and verify before touching code

1. Read `MASTERPLAN.md` fully, then `CLAUDE.md`, then `PRD.md` (§6 Feature Specs, §7 Technical Architecture, §13 Privacy & Ethics — the privacy claims constrain the AI design).
2. Run the app. Confirm Sprints 0–6 actually work end-to-end: camera capture, GPS + reverse geocoding, report submission, the live map. **Verify the `[x]` marks are true.** If a checked task doesn't actually work, mark it `[~]` with a note — a masterplan that lies is worse than none.
3. Check the Supabase project state: schema, RLS policies, storage buckets, Realtime config. Confirm what's provisioned vs. what the plan assumes.
4. **Research the S7 stack before committing to it.** TensorFlow.js + MobileNetV2 was chosen at plan time — verify it's still the right call in 2026 for browser-side image classification. Compare against: transformers.js (ONNX Runtime Web), WebNN API availability, MediaPipe Image Classifier, and whether a small fine-tuned model beats a generic ImageNet backbone for the actual category set. Report the comparison with real numbers: model size over the wire, first-load time, inference latency on a mid-range Android, accuracy on the target categories.
5. **The 3-second claim is a spec, not a slogan.** Establish the latency budget end to end: capture → resize → inference → render. If the chosen stack can't hit it on a mid-tier phone, that's a finding to raise before building, not after.

## Phase 2 — Questions (AskUserQuestion)

- **Model strategy:** generic MobileNetV2 (ships now, mediocre on civic categories) vs. a fine-tuned classifier on real pothole/graffiti/rubbish imagery (much better, needs a dataset). *This is the fork that decides Sprint 7's shape — and note the distillation project could produce exactly this model.*
- Deployment target and timing (Vercel? custom domain? when does this go live?)
- Is there a real council partner or pilot, or is this a portfolio/demo product? Changes how much of Phase 3 (Council Tools) matters.
- Sprint 12 lists **Elasticsearch** — for a PWA at this stage that's heavy. Confirm or defer.
- How real is the privacy promise? "No account" + on-device inference is the differentiator; confirm it survives Supabase Realtime and image upload.

## Phase 3 — Plan mode

Enter plan mode. Then **update `MASTERPLAN.md` in place**:
- Correct any `[x]` that verification proved false
- **Expand Sprint 7 substantially** with your Phase-1 research: chosen model + why, exact file paths, the latency budget with measured numbers, IndexedDB caching strategy and cache-invalidation, fallback when the model fails to load, the correction-logging schema (this is a dataset — design it to be useful later)
- Insert a **Sprint 7.5: Deploy** if one doesn't exist. This project has 92 unchecked tasks and no live URL; shipping something visible beats reaching Sprint 20 privately.
- Add a **Deployment & Ops** section if missing: env vars, Supabase prod config, PWA install verification, Lighthouse targets

Get the plan approved before building.

## Phase 4 — Build

Follow `CLAUDE.md`'s existing sprint protocol (it already has one, including a post-sprint manual-action reminder rule — respect it). Plus:
- Use **aethereum sync**: `share_intent` at sprint start, `declare_contract` for the classification hook's interface and the correction-log schema, `record_decision` on the model choice, `ask_human` on anything costing money or going public, `record_verification` at sprint gates
- Mark tasks live in `MASTERPLAN.md` as you go — `[ ]→[~]→[x]`, never batch at the end
- **Ship to production before Sprint 8.** A deployed half-product outperforms an undeployed full one for every purpose Bruno has.

## The bar

Sprint 7 lands and the tagline becomes literally true: point a phone at a pothole, get a classified report in under three seconds, with no account, and the inference never leaves the device. That's a demo that survives an interview. Then deploy it and put the URL on the portfolio.

---

## Design language — DO NOT invent one, and do not ask Bruno to design

Bruno has a locked design system. Any UI you build or fix **inherits it**. Never ask him to make a design decision you can answer by reading this; never introduce a new palette, font, or motion language.

**Source of truth:** `~/bruno-portfolio/CLAUDE.md` → "Redesign Design Decisions (2026-07 · SIGNAL)". Read it before touching any visual surface.

**The system — "SIGNAL": a warm-black precision instrument.** Ryoji Ikeda data-minimalism × cassette-futurist hardware × subtle broadcast-CRT texture. It should *operate* like a beautiful old machine — directory listings, keyboard nav, instrument readouts — while staying clean and fast.

```
--bg:             #050505   warm black
--surface:        #0b0a09
--text-primary:   #f0ece4   warm white
--text-secondary: #98928a
--text-dim:       #55504a
--amber:          #ffb000   THE ONE ACCENT (phosphor)
--steel:          #2c2925   visible border
--hairline:       #1b1916   structural rules
```

**Rules, non-negotiable:**
- **Amber is used sparingly** — cursor, status dots, CTAs, focus brackets, key data. Everything else is grayscale on hairline steel.
- **No light theme.** No gradients. No shadows. No colour beyond amber.
- **Border-radius max 2px.** Effectively square.
- **Monospace for data, labels, readouts, ASCII.** Terminal/instrument voice throughout: `</section>` labels, `>` prompt prefixes, `[button →]` brackets, box-drawing `┌─┐│└┘`, loading bars `[████░░░] 72%`.
- **Motion:** ease-out or linear only. No bounce, no spring, nothing over 600ms. Scroll reveals are fade + 16px rise, 400ms, 60ms stagger.
- **No emoji in UI.** If the current code uses emoji as controls, replace them with monospace glyphs or labelled brackets.
- **A11y is a hard rule:** nothing flashes more than 3×/s, `prefers-reduced-motion` means static everything, body text is always real DOM.

If a surface currently looks unstyled or default-browser, that is a bug against this system — fix it by applying the system, not by inventing something new.

---

## MOTION.md is binding

This folder now contains `MOTION.md` — the full animation specification for this project (sequences, timings, per-surface rules, acceptance gates). Read it in Phase 1 alongside the other docs. Its acceptance checklist merges into the relevant sprint gates in the masterplan during Phase 3. Motion here is product behaviour, not polish — the spec is authored; do not invent a different animation language and do not ask Bruno to design one.

---

## Decisions locked + research corrections (Aug 2026)

**The Sprint 7 model stack changes — Bruno delegated the call, and the research is decisive:**

- **TensorFlow.js is effectively frozen** — last release v4.22.0, October 2024, ~22 months stale; Google's own blog positions LiteRT.js as its evolution and ships a migration guide. Do not build Sprint 7 on it.
- **Locked stack:** fine-tune **EfficientNet-Lite0 (or MobileNetV3-Small) in Keras → export int8 `.tflite` (~5MB over the wire) → run with `@litertjs/core` (LiteRT.js)** — WebGPU with WASM/XNNPACK fallback, released July 2026 and actively shipped. Fallback runtime if LiteRT.js fights back: **MediaPipe Tasks Vision `ImageClassifier`** (`@mediapipe/tasks-vision` 1.0+) loading the *same* `.tflite` via `createFromModelPath()` — but note MediaPipe Model Maker is unmaintained, so fine-tuning is DIY Keras either way.
- **Model caching: use the Cache Storage API in the service worker**, not IndexedDB — IndexedDB was a TF.js-ism (`model.save('indexeddb://')`). Rewrite S7.2 accordingly.
- **WebNN is not shippable** — behind flags in every browser as of Aug 2026. Ignore it.
- Latency expectation: EfficientNet-Lite0 int8 benches ~10ms native on a Pixel 6; browser WASM/WebGPU will be several-× slower but comfortably inside the 1s budget. **Benchmark on a real mid-range Android before locking the MOTION.md timings** — no published browser numbers exist.
- Update MASTERPLAN.md S7.1–S7.7 in place during Phase 3: replace TensorFlow.js/MobileNetV2/IndexedDB references with this stack.
- Training data note: the fine-tuned civic classifier could be produced by the distillation project's pipeline (open-weight teacher labelling civic imagery) — coordinate if both run.
- iOS PWA facts (shared with UniSpace): push requires Home-Screen install; use Declarative Web Push payloads (Safari 18.4+); no programmatic install prompt on iOS — build the instruction UI.
