# MOTION.md — RIPPLE
# The animation specification. Read with `CLAUDE.md` and `MASTERPLAN.md`; this is binding, not decorative.

> Motion is not polish on this project. **The product promise is "on-device AI files the report in 3 seconds."** Three seconds of a user staring at a frozen screen is a failure; three seconds of legible machine-thinking is the demo. The animation *is* the feature.

---

## Inherited system (from `~/bruno-portfolio/CLAUDE.md` — do not deviate)

```
Easing        ease-out or linear ONLY. No bounce. No spring. No overshoot.
Duration      nothing over 600ms. Most things 150–400ms.
Scroll reveal fade + 16px translate-up, 400ms ease-out, 60ms stagger per child
Loader        [████████░░░] 72%  — █ filled, ░ empty, monospace
Typing        40ms/char, then a 500ms blinking cursor
Status pulse  opacity .3 → 1 → .3, 2s ease-in-out, infinite
Page change   2px bar sweeps left→right 300ms · hold 50ms · off right 200ms
Colour        monochrome. Green ONLY for live/confirmed state. No other accent.
```

**Hard accessibility rules, non-negotiable:** nothing flashes more than 3×/second · `prefers-reduced-motion: reduce` makes *everything* static (no exceptions, including the scan sweep) · every animated state must also be readable as text for screen readers · no animation blocks input.

---

## The signature motif: the ripple

The product is called Ripple. **One motion idea carries the whole brand: concentric rings expanding outward from a point of impact.** Use it deliberately and sparingly — three places only:

1. **Report submitted** — rings expand once from the submit button, 600ms, fading as they grow.
2. **Upvote** — a single fast ring from the tapped marker, 300ms. This is the most-repeated interaction in the app; it must feel light.
3. **New report arrives on the live map** — a ring from the new marker's position, so peripheral vision catches it without a modal.

Rings are 1px, monochrome, `border-radius: 50%` (the *only* place radius is allowed), scale 0→1 with opacity 1→0, ease-out. Never more than one ripple animating per surface at a time — queue or drop, never stack.

---

## Sprint 7 — the AI classification sequence (the hero moment)

This is the animation that makes the tagline true. It has four phases and a hard budget.

**Total budget: ≤3,000ms from shutter to result.** Instrument it; if the model is slower than the budget, the animation must not pretend otherwise — extend the scan phase honestly rather than showing a fake completion.

```
PHASE 1 · CAPTURE          0–150ms    Shutter: viewport flashes to bg colour for 60ms,
                                      photo scales 1.04 → 1.0 as it settles. Haptic if available.

PHASE 2 · SCAN             150ms → inference complete
                                      A 1px horizontal line sweeps top→bottom across the photo,
                                      1200ms per pass, linear, looping. Behind it the image is
                                      at 60% opacity; in front, 100% — so the line reads as
                                      "being read". Beneath: `> analysing...` typing at 40ms/char.
                                      A [████░░░░░░░░] bar fills to 90% over the expected
                                      inference time and HOLDS at 90% until the real result
                                      arrives, then snaps to 100% in 120ms.
                                      NEVER fake completion. The hold is the honest signal.

PHASE 3 · RESULT           +0–400ms   Scan line completes its current pass (never cut mid-sweep —
                                      it looks like a crash), then fades 120ms.
                                      AIResultCard enters: fade + 16px up, 400ms ease-out.
                                      ConfidenceBar fills 0 → score, 500ms ease-out, with the
                                      percentage counting up in sync (integer steps, monospace,
                                      tabular figures so it doesn't jitter).

PHASE 4 · SETTLE           +200ms     Category icon and name fade in, 200ms, 60ms after the bar.
```

### Confidence tiers get *different* motion — the motion is the message

| Confidence | Behaviour |
|---|---|
| **≥ 85%** | Card snaps in decisively. Bar fills fast (350ms). Green tick fades in at the end. Reads as certain. |
| **60–84%** | Card enters normally but the prompt `> does this look right?` types out beneath it, and the category label carries the 2s status pulse. Reads as asking. |
| **< 60%** | Two option cards fan in with a 60ms stagger, neither emphasised, no green. Bar is dimmed. Reads as offering a choice, not a verdict. |

The override picker slides up as a sheet, 280ms ease-out, backdrop fading to 60%.

---

## Per-surface specification

**Camera / capture (Sprint 3)** — Shutter as above. Permission-denied state fades in, never jumps. Torch/flip controls have no motion beyond a 150ms opacity change on press.

**GPS / reverse geocoding (Sprint 4)** — While resolving, the address line shows the typing cursor with `> locating...`. On resolve, the text cross-fades 200ms. Never show a spinner for location; the typing line already communicates work.

**Map (Sprint 6, 9)** — Markers drop in on first paint with a 40ms stagger, scale 0.8→1, 250ms ease-out; cap the stagger at 20 markers then render the rest instantly (a 200-marker cascade is a jank machine). Cluster expand/collapse: 300ms ease-out on scale and position. Heatmap opacity transitions 400ms linear when filters change — never snap. Filter chips: 150ms border/background change only.

**Feed & report cards (Sprint 10)** — Standard scroll reveal, 60ms stagger. Skeleton loaders pulse at 1.6s, not faster.

**Status tracking (Sprint 13)** — `reported → acknowledged → fixed` renders as a segmented bar. On status change the newly-filled segment fills left→right over 400ms, and only then does the label cross-fade. Green appears **only** on `fixed`.

**"Fixed!" photo confirmation (Sprint 15)** — Before/after cross-fade over 600ms on tap-and-hold, scrubable. This is the emotional payoff of the whole product; it deserves the full 600ms.

**PWA install / offline (Sprint 16, 21)** — Offline banner slides down 200ms and stays; it must never animate repeatedly or it becomes noise. Queued-report count changes with a 150ms cross-fade.

---

## Rules that will otherwise be broken

- **No spinners anywhere.** The system has terminal loaders and typing lines; a generic spinner breaks the language.
- **No skeleton that animates faster than 1.6s.** Faster reads as anxious.
- **Nothing animates on the critical input path.** A user tapping "submit" twice because the button was mid-transition is a bug.
- **Every animated state needs a static equivalent** for reduced-motion and for screenshots — the case study needs stills that still read.
- **Instrument the budget.** Log real capture→result timing in dev; if p95 exceeds 3,000ms, that is a masterplan finding, not something to hide behind a longer animation.

---

## Acceptance (add to the Sprint 7 gate)

- [ ] Capture → result measured on a mid-range Android, p50 and p95 reported
- [ ] Scan loop never cuts mid-sweep; loader holds at 90% and never fakes completion
- [ ] All three confidence tiers visibly differ in motion, verified by recording
- [ ] `prefers-reduced-motion: reduce` produces a fully static path from capture to result
- [ ] Nothing flashes >3×/s (verify the scan line and the pulse)
- [ ] 200-marker map does not drop frames on a mid-range device
