# Classifier models

This directory holds the on-device image classifier that Sprint 7 loads via
LiteRT.js. It is **intentionally empty of model weights** in version control.

## Expected file

```
public/models/ripple-classifier-v1.tflite
```

The path and version come from `AI_MODEL_URL` in `src/constants/config.ts`. The
version lives in the filename so that a new model is a new URL — cache
invalidation is then free, and the service worker's `CacheFirst` rule can never
serve a stale classifier.

## What happens when the file is absent

The app works. `useAIClassification` treats every failure — missing model, 404,
broken WebGPU, blocked WASM, decode error — as "classification unavailable" and
the report flow falls through to the manual category picker with a
`> classifier unavailable — pick a category` line.

This is deliberate (MASTERPLAN S7.11): **a classifier that can break the
reporting flow is worse than no classifier.** Ripple's core promise is that a
citizen can report a problem in seconds; the AI makes that faster, but it must
never be load-bearing.

## Producing the model

Two stages, per MASTERPLAN S7 and the Owner-Gated Backlog item OG2:

1. **Fine-tune** EfficientNet-Lite0 (or MobileNetV3-Small) in Keras on civic
   imagery — roughly 500 images per category across the ten PRD categories.
   MediaPipe Model Maker is unmaintained as of 2026, so this is DIY Keras.
2. **Export** to int8 `.tflite` (~5MB over the wire, versus ~14MB for the
   TensorFlow.js MobileNetV2 this replaced). int8 disproportionately favours the
   WASM fallback path, where SIMD operates on packed 8-bit integers natively.

The output labels must be in the same order as `CATEGORIES` in
`src/constants/categories.ts` — index 0 is `pothole`, index 9 is `other`.
`useAIClassification` maps model output indices to categories positionally, so a
reordered label set produces confidently wrong answers rather than an error.

## Interim behaviour

Until the fine-tuned model exists, the pipeline is complete and demonstrable but
has nothing to run. Dropping in a generic ImageNet-classed EfficientNet-Lite0
with an ImageNet→Ripple label mapping exercises the whole path end to end.

**No accuracy claim is made against PRD G2 (">70% correct without correction")
until the fine-tuned model lands.** The correction log built in S7.9 is the
instrument that will make that measurable.
