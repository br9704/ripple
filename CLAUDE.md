# CLAUDE.md — Development Agent Instructions

> This file is the operating contract for any Claude Code agent working in this repository.
> Read this file in full before taking any action on any file.

---

## 1. Sources of Truth

Two canonical documents govern everything built in this project. They override your assumptions, prior context, and inline code comments.

| Document | Purpose |
|----------|---------|
| `PRD.md` | Product requirements, feature specs, data models, design system, privacy rules |
| `MASTERPLAN.md` | Sprint structure, task breakdown, implementation order, current status |

**If there is ambiguity about what to build: check the PRD.**
**If there is ambiguity about what to do next: check the MASTERPLAN.**
**If neither document answers it: stop and ask the user.**

---

## 3. Repository Setup (First Session Only)

Before any code is written, the repository must be initialised and the first commit made.

```bash
git init
git remote add origin <repo-url>   # user provides this
```

The initial commit must include all scaffold files and the three documentation files:

```bash
git add .
git commit -m "chore: initial project scaffold with PRD, CLAUDE, and MASTERPLAN"
git push -u origin main
```

The initial commit message must reference all three docs. The repo is not considered set up until the push has succeeded and the remote shows the initial commit.

## 2. Sprint Tracking Protocol

After completing **every sprint or subsprint**, you must update `MASTERPLAN.md` to mark it done before moving on. No exceptions.

### Marking a Task Complete

```markdown
<!-- BEFORE -->
- [ ] S2.1 — Set up Supabase schema migrations

<!-- AFTER -->
- [x] S2.1 — Set up Supabase schema migrations ✅ (March 2026 — used uuid-ossp extension for gen_random_uuid)
```

### Rules

1. **Never skip the mark.** Even if the next task is obvious, mark the current one complete first.
2. **Mark subsprint components individually.** A sprint is not done until every subtask is checked.
3. **Add a brief note** after the checkmark for any deviation from the plan, version choice, or known limitation.
4. **Deferred tasks:** mark `⏭️ DEFERRED:` and explain why.
5. **Discovered subtasks:** add them as nested items under the original task before continuing.
6. **Update docs before committing.** README and any relevant documentation must be updated to reflect the completed sprint before any `git commit` runs. See the full sequence in Section 11.
7. **Commit and push after docs are updated.** Code commit first, then MASTERPLAN commit. Always two separate commits. See Section 11 for the exact sequence.

### Example of a Well-Tracked Sprint

```markdown
- [x] S3.1 — Supabase Realtime channel setup ✅
  - [x] S3.1.1 — Create channel with correct campus slug naming ✅
  - [x] S3.1.2 — Subscribe on mount, unsubscribe on unmount ✅
  - [x] S3.1.3 — Handle reconnect on network restore ✅
  - [⏭️] S3.1.4 — Fallback to 30s polling ⏭️ DEFERRED: not needed at current scale, revisit Phase 2
- [x] S3.2 — Broadcast payload validation ✅
```

---

## 4. Deployment Philosophy — PWA First

**This project ships as a PWA. There is no native app.**

- The **Service Worker** is infrastructure, not polish. It must be set up in Phase 0 — before feature work starts.
- **Offline is not an error state.** The app must render cached content when offline. A blank screen or unhandled fetch error is a bug.
- **All UI is mobile-first, touch-first.** Design for a 375px touch screen before any other viewport. No hover-only interactions.
- **iOS Safari is a first-class target.** Features that work on Chrome Android but break on iOS Safari are bugs. Camera API, file picker, PWA install, and push notifications all behave differently — handle each explicitly.
- **The Service Worker must never break the app.** If the SW causes a caching or stale asset bug, fixing it takes priority over any feature work.

There is no React Native version. No Swift version. No Capacitor wrapper. The PWA is the product.

---

## 5. Privacy Rules

The privacy rules for this specific project are defined in the PRD. Read and follow them.

These universal rules apply regardless of what the PRD says:

1. **No analytics libraries** without explicit instruction from the user. This means no Google Analytics, Hotjar, Mixpanel, or any third-party tracking script.
2. **No PII in logs.** Never log email addresses, names, phone numbers, or device identifiers to the console or any logging service.
3. **Server-side API keys stay server-side.** Any key that must not be exposed to the client goes in Supabase Edge Function secrets only — never in a `VITE_` prefixed environment variable.
4. **Do not modify the privacy architecture** described in the PRD without explicit user instruction. If implementation pressure pushes you toward a shortcut (e.g. "just store the coordinates temporarily"), stop and flag it to the user.

---

## 6. Code Standards

### TypeScript
- Strict mode enabled — no `any` without a comment explaining why
- All component props explicitly typed with interfaces (not inline types for complex shapes)
- String literal unions for all fixed value sets (statuses, categories, roles, etc.) — not plain `string`
- Zod for runtime validation of all Edge Function inputs and external API responses

### React
- Functional components only — no class components
- Custom hooks for all data-fetching and business logic — keep components presentational
- Components stay under 150 lines — extract into hooks and utilities when they grow
- Co-locate tests: `ComponentName.test.tsx` sits next to `ComponentName.tsx`

### File Structure
```
src/
  components/     Reusable UI components
  hooks/          Custom React hooks (data fetching, subscriptions, device APIs)
  lib/            Supabase client, third-party wrappers, utility functions
  pages/          Top-level route components
  types/          Shared TypeScript interfaces and type aliases
  stores/         Zustand global state stores
  constants/      App-wide constants (colours, thresholds, config values)
  workers/        Web Workers (offload heavy computation from main thread)
supabase/
  migrations/     SQL migrations, numbered sequentially: 001_, 002_, etc.
  functions/      Edge Functions (Deno)
  seed/           Seed data scripts
```

### Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Types and interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database tables: `snake_case`
- Edge Functions: `kebab-case`

### CSS / Tailwind
- Tailwind utility classes for all styling
- No inline styles except for truly dynamic values (e.g. Mapbox paint properties driven by live data)
- CSS custom properties in `index.css` for the design system tokens defined in the PRD
- Dark theme by default — no light mode unless the PRD specifies it
- Mobile-first: base styles are for mobile, `sm:` / `md:` / `lg:` for larger viewports

### Commits
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Atomic commits — one logical change per commit
- Reference the sprint: `feat(S3.2): implement offline report queue with IndexedDB`

---

## 7. Environment Variables

Never commit secrets. Rules:

- `VITE_` prefix: safe for the client bundle (Supabase URL, Mapbox token, etc.)
- No prefix: server-side only, set in Supabase Edge Function secrets dashboard
- `.env.local` is gitignored — all secrets live there locally
- Document every variable in `.env.example` (empty values) and `README.md`

---

## 8. What NOT to Do

- **Do not push code or open PRs** without explicit instruction from the user
- **Do not send emails or messages** on behalf of the user
- **Do not modify `PRD.md`** unless the user explicitly asks
- **Do not modify `CLAUDE.md`** unless the user explicitly asks
- **Do not skip writing types** to save time — type safety is non-negotiable
- **Do not install packages** outside the PRD tech stack without checking with the user first
- **Do not hardcode** API keys, IDs, or environment-specific values in source code
- **Do not proceed to the next sprint** if the current sprint has failing tests or broken core functionality
- **Do not suggest React Native, Swift, or Capacitor** — the PWA is the product

---

## 9. Testing Expectations

- **Unit tests:** all utility functions, hooks with complex logic, any algorithm (scoring, ranking, classification mapping, geo detection)
- **Integration tests:** Supabase Edge Functions using the Deno test runner
- **E2E tests (Phase 2+):** Playwright for critical user paths — specified per-project in the MASTERPLAN
- **No test, no merge.** Every new utility function or hook with business logic needs a corresponding test file

---

## 10. When You're Stuck

1. Check the PRD — it likely addresses it
2. Check the MASTERPLAN — sprint notes may have relevant context
3. Check the open questions section at the bottom of the PRD
4. Stop and ask the user — never silently make an architectural or product decision

---

## 11. Definition of Done (Per Sprint)

A sprint is done when **all of the following are completed in this exact order**:

**1. Quality checks**
- [ ] All new functions and hooks have TypeScript types
- [ ] All new utility logic has passing unit tests
- [ ] `pnpm tsc --noEmit` passes — zero TypeScript errors
- [ ] `pnpm lint` passes — zero ESLint errors
- [ ] The feature is manually verifiable — you can describe the exact steps to test it

**2. Documentation update (before any commit)**
- [ ] `README.md` updated to reflect any new setup steps, environment variables, or features added this sprint
- [ ] `README.md` contains working relative links to `PRD.md` and `MASTERPLAN.md` — verify these are not broken
- [ ] If a new doc was created this sprint (e.g. `ARCHITECTURE.md`, `SEED_DATA.md`), it is linked from the README
- [ ] Any new environment variables added to `.env.example` with comments explaining what they are and where to get them
- [ ] MASTERPLAN "Project Status" section updated to reflect current state of the project

**3. Commit and push — in this exact sequence**
- [ ] Code committed: `git add -A && git commit -m "feat(S{N}): {sprint goal}"`
- [ ] Code pushed: `git push`
- [ ] `MASTERPLAN.md` subtasks all marked `[x] ✅`, sprint marked complete
- [ ] MASTERPLAN pushed as a separate commit: `git add MASTERPLAN.md && git commit -m "chore: mark Sprint {N} complete in MASTERPLAN" && git push`

**The order is: quality → docs → code commit → code push → MASTERPLAN update → MASTERPLAN commit → MASTERPLAN push.**

Documentation is updated before the commit, not after. The commit message should reflect a working, documented state — not "will document later." The MASTERPLAN update is always its own commit so the git history cleanly separates what was built from what was tracked.

**4. Post-sprint manual action reminder**
- [ ] After every sprint is pushed, remind the user of any manual steps they need to take. Examples: test the app locally (`pnpm dev`), add API keys, configure Supabase settings, create storage buckets, deploy Edge Functions, verify on mobile, etc.
- [ ] List these as a clear checklist so the user knows exactly what to do before the next sprint begins.

---

*This file is maintained by Bruno Jaamaa. Do not modify without instruction.*

---

## Aethereum sync — required workflow (canonical block, identical across every project)

This project coordinates through Aethereum. Account config lives at `~/.aethereum/config.json` and this machine is already logged in.

- **First session:** run `aethereum init` in the repo root and create/join this project's room.
- **`share_intent`** — one line at the start of every sprint, before any code. Marking a task complete without having shared intent for its sprint is a workflow violation.
- **`declare_contract`** — for every interface other code consumes (types, schemas, event shapes, API contracts). Bump the version when the shape changes.
- **`record_decision`** — at every architectural fork or irreversible choice, with the *why*. Future sessions read these instead of re-litigating.
- **`ask_human`** — whenever the decision is Bruno's: spending money, publishing, deleting, rewriting git history, naming, or anything with an external side effect. Do not guess and do not block — keep working other tasks until answered.
- **`record_verification`** — at every sprint gate, pass/fail with evidence.

## Masterplan discipline (canonical block)

The masterplan is the **single source of truth for sequencing**. This file is the source of truth for *rules*. Precedence on conflict: masterplan (sequencing) > CLAUDE.md (rules) > ENGINEERPROMPT.md (kickoff).

- Status keys, used live in the file as work happens: `[ ]` not started · `[~]` in progress · `[x]` complete · `[⏭]` deferred (always with a one-line reason).
- **Never delete or rewrite masterplan content.** Expand it in place — add sub-tasks, file paths, edge cases, findings. Deepen, don't replace.
- Mark tasks as you go, never batched at the end of a session.
- A sprint closes only when its acceptance criteria pass. Then: fill the **As-shipped delta** and **Deferred** notes, move the Current-sprint pointer, and update the Current-state line at the bottom of this file.
- Never skip a sprint. Never partially complete one and move on.
- Stop and report at every sprint close before starting the next.

## Honesty rules (canonical block)

- Never state a number in a README, the site, or any public copy that a committed artifact cannot back.
- Verified counts only — never restate a figure from memory.
- If a claim and the code disagree, that is a bug in one of them. Fix it or flag it; never leave it ambiguous.
- `[PLACEHOLDER — description]` for anything unknown. Never invent content.
