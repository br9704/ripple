---
id: e84d5067-60e7-4e60-afce-ea6230ea004d
title: "What Ripple Is"
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
source_path: "/Users/brunojaamaa/Desktop/RIPPLE/README.md"
---

# What Ripple Is 🟢

**Photograph a pothole. A classifier running on your phone files it, and the image never leaves
the device to be understood.** An anonymous civic infrastructure reporting PWA, Melbourne pilot,
no accounts.

## The friction it removes

Councils have the budget to fix broken infrastructure. Citizens can see what is broken. The
bridge between the two is a council web form that takes about **fifteen minutes** and wants a
full name, address and phone number, so most problems are simply never reported.

Ripple is that bridge rebuilt: open a map of everything reported nearby, tap one control,
photograph the problem, submit. **A random UUID in `localStorage` is the only identifier the
system holds.** No sign-up, no email requirement, and no way to link a report to a person.

## The three-second path

What makes three seconds possible is that classification happens on the phone before the upload.
The photo is transmitted only after Submit, and only as evidence, never as something a server has
to interpret. That is a privacy architecture first and a latency win second, but it is both:
measured warm inference is **15 ms at p50** against a **3,000 ms** budget.

Detail in [[(Note) On-Device Classification]].

## The model is treated as fallible, on purpose

The interface says so, at three thresholds:

| Confidence | What the interface does |
|---|---|
| **Above 85%** | The result card snaps in with a tick |
| **60 to 84%** | Types `> does this look right?` and asks |
| **Below 60%** | Fans out two options and emphasises neither |
| Model missing, runtime fails, or WebGPU advertised then fails to compile | Drops silently to a manual category picker |

**A broken classifier never blocks a report.** Every override is recorded as
`{ai_category, ai_confidence, final_category}` in `ai_correction_log`, which is what makes
accuracy measurable later rather than merely asserted now.

## What sits around it

- A live Mapbox map with clustering and a weighted heatmap.
- "I see this too" upvoting that feeds a priority score.
- Comment threads with flag-based moderation.
- Before-and-after photo confirmation. **Community consensus flags a report as fixed, it does
  not set it.** Three confirmation photos set `community_suggests_fixed` and stop there.
- An RLS-scoped council dashboard with analytics and CSV export.
- Reports made with no signal queue in IndexedDB and submit on reconnect **from anywhere in the
  app**, which was not true until Sprint 6.5.

The whole thing is one PWA. There is no React Native version, no Swift version, no Capacitor
wrapper.

## Honest state, in the project's own words

`PROJECT.json` carries an `honest` field. Paraphrased: the front end is deployed and the PWA,
map, offline shell and on-device classifier all work at the live URL, **but there is no backend
behind it**. The Supabase project it was built against no longer resolves and has deliberately
not been re-provisioned, so nothing that reads or writes data functions. The database layer
itself is verified by execution against local PostgreSQL 17 (**27** migrations, **102**
assertions, **0** failures). What is unverified is specifically what Supabase-the-service adds
on top: Storage, Auth, Edge Function deployment and Realtime delivery.

## Related

[[(Note) Who It Is For]] · [[(Note) On-Device Classification]] ·
[[(Note) System Architecture]] · [[(Note) The Five Load-Bearing Decisions]] ·
[[(Index) 00 Overview]]
