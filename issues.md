# Keeper — Issues Log

_Last updated: 2026-07-16_

---

## Open Issues

### [UAT-007] Edit dialog for resolved tasks allows re-editing without clear UX
- **Severity**: low
- **Page/Section**: `/dashboard` History tab
- **Discovered**: 2026-03-18
- **Status**: open
- **Description**: Resolved tasks in the History tab still show the pencil (edit) icon. Users can open the edit dialog on resolved tasks and change their status back to Open or InProgress. This may be intentional but there's no visual differentiation or confirmation for "reopening" a task.
- **Steps to Reproduce**: Go to History tab → click pencil icon on a resolved task → change status.
- **Fix**: _(consider: hide edit on resolved tasks, or add "Reopen" button instead)_

---

## Resolved Issues

### [M2-003] Full circle sweep ran on every profile-fact tap
- **Severity**: low (perf)
- **Page/Section**: `src/lib/actions/recipient.ts` (`setFact`), `src/app/(app)/parents/parents-client.tsx` (`FactsSection`)
- **Discovered**: 2026-07-16 (M1/M2 code review)
- **Resolved**: 2026-07-16
- **Status**: resolved
- **Description**: Cycling a chip in "What Keeper knows" ran a full `sweepCircle` synchronously on every tap; rapid toggling meant N sweeps.
- **Fix**: `setFact` no longer sweeps (it still drops dependent suppressions synchronously). `FactsSection` debounces a single `refreshSuggestions()` 800ms after the last change, so rapid toggles collapse to one sweep. Bulk onboarding (`setFacts`) and `createRecipient` still regenerate immediately for the reveal.

### [M2-004] Dedupe loaded every historical suggestion
- **Severity**: low
- **Page/Section**: `src/lib/jobs/sweep.ts` (`loadCircleInputs`)
- **Discovered**: 2026-07-16 (M1/M2 code review)
- **Resolved**: 2026-07-16
- **Status**: resolved
- **Description**: The dedupe query loaded all suggestions of all statuses — an unbounded set over years.
- **Fix**: Scoped to PENDING/SNOOZED (any age, also drives expire) plus terminal rows created within a 400-day window. Older terminal rows can't collide with a current-window `cycleKey`, and `createMany({ skipDuplicates: true })` backstops any remaining edge.

### [M2-005] `dismissSuggestion` writes weren't atomic
- **Severity**: low
- **Page/Section**: `src/lib/actions/suggestion.ts` (`dismissSuggestion`)
- **Discovered**: 2026-07-16 (M1/M2 code review)
- **Resolved**: 2026-07-16
- **Status**: resolved
- **Description**: Status change + suppression + fact flips ran via `Promise.all`, not atomically.
- **Fix**: Collected as `PrismaPromise`s and run through a single `prisma.$transaction([...])`.

### [M2-006] Resolving a refill task didn't advance the med's fill date → duplicate refill next sweep
- **Severity**: medium
- **Page/Section**: `src/lib/actions/tasks.ts` (`resolveTask`)
- **Discovered**: 2026-07-16 (Codex PR review, P2)
- **Resolved**: 2026-07-16
- **Status**: resolved — **code bug**
- **Description**: A refill task carries `medicationId`. Completing it via swipe-resolve (rather than "Mark filled") only set the task to Resolved and never updated `Medication.lastFilledAt`. Because `sweepRefills` dedupes on *open* refill tasks and `isRefillDue()` still read the stale fill date, the next sweep saw the med as due with no open task and spawned a **duplicate** refill task.
- **Steps to Reproduce**: Let a refill task generate → swipe-resolve it on the board (not "Mark filled") → run the sweep → a second identical refill task appears.
- **Fix**: `resolveTask` now advances `Medication.lastFilledAt` to `now` when the resolved task has a `medicationId`. Regression tests in `src/lib/actions/tasks-recurrence.test.ts`.

### [M2-001] Nightly sweep crashes after the first accept/dismiss (dedupe missed terminal-status cycles)
- **Severity**: high
- **Page/Section**: `src/lib/jobs/sweep.ts` (`loadCircleInputs`)
- **Discovered**: 2026-07-16 (M1/M2 code review)
- **Resolved**: 2026-07-16
- **Status**: resolved — **code bug**
- **Description**: The dedupe input loaded only `PENDING`/`SNOOZED` suggestions, so once a suggestion was `ACCEPTED`/`DISMISSED`/`EXPIRED`, the next sweep re-emitted a `create` for the same `(templateId, cycleKey)`, hit the unique index, and threw — killing the whole sweep transaction. This would break suggestion generation across a circle after the very first accept/dismiss (nightly cron, on-fact-edit regenerate, and the inbox refresh button).
- **Steps to Reproduce**: Accept any suggestion → edit a fact (triggers a re-sweep) → the sweep throws a P2002 unique violation and no suggestions update.
- **Fix**: Load all suggestion statuses into the dedupe set; also switched the persist to `createMany({ skipDuplicates: true })` so concurrent sweeps can't collide either. Regression test: `src/lib/engine/evaluate.test.ts` ("does not re-create a cycle already ACCEPTED/DISMISSED").

### [M2-002] Date-only values render a day early in negative-offset timezones
- **Severity**: medium
- **Page/Section**: `src/lib/constants.ts` (`formatAlmanacDate`), `src/components/task-card.tsx`
- **Discovered**: 2026-07-16 (M1/M2 code review)
- **Resolved**: 2026-07-16
- **Status**: resolved — **code bug**
- **Description**: Suggestion windows, task due dates, and refill run-outs are stored as UTC midnight but were formatted in the viewer's local timezone, so a Sep 1 window rendered as "Aug 31" for any US (UTC-negative) user. The engine's own reason lines already forced UTC; the display formatters did not, and `task-card` used raw `toLocaleDateString()`.
- **Steps to Reproduce**: In a UTC-negative timezone, view a suggestion with a Sep 1 window or a task due Sep 1 → it shows Aug 31.
- **Fix**: `formatAlmanacDate` now formats in UTC (date-only values); `task-card` uses it instead of raw `toLocaleDateString`. `formatAlmanacDateTime` stays local (real appointment instants).

### [UAT-002] Vital Info had no way to add new categories — addressed in M1
- **Severity**: high
- **Page/Section**: was `/vital-info`, now `/parents` → Vital info section
- **Resolved**: 2026-07-16 (M1)
- **Status**: resolved — superseded
- **Description**: v1's vital-info page could only edit seeded categories. M1 replaced it with the per-recipient Vital info section in the Parents hub, which has an explicit "Add" flow (category + details).

### [CR-001] Notification-preference migration didn't backfill legacy opt-outs
- **Severity**: high
- **Page/Section**: `prisma/migrations/20260715000100_m0_expand/migration.sql`
- **Discovered**: 2026-07-15 (code review of PR #1)
- **Resolved**: 2026-07-15
- **Status**: resolved — **code bug**
- **Description**: New `digestEmail`/`immediateEmail`/`weeklyEmail` columns defaulted to `true` with no backfill from the legacy `emailReminders` value they replace. A user who had previously opted out would be silently re-subscribed after migration.
- **Fix**: Added an `UPDATE` statement backfilling all three columns from `emailReminders` in the same migration.

### [CR-002] Open redirect via backslash-prefixed callbackUrl
- **Severity**: high
- **Page/Section**: `src/app/login/page.tsx`
- **Discovered**: 2026-07-15 (code review of PR #1)
- **Resolved**: 2026-07-15
- **Status**: resolved — **code bug**
- **Description**: The callback-URL guard only blocked a literal `//` prefix. A `/\evil.com` payload passes the check and browsers commonly normalize a leading `/\` to `//`, turning the post-OAuth redirect into a protocol-relative jump off-site.
- **Fix**: Replaced the string-prefix check with `/^\/(?!\/|\\)/`, which rejects both `//` and `/\` prefixes.

### [CR-003] createCircle had no protection against a concurrent double-submit
- **Severity**: high
- **Page/Section**: `src/lib/actions/circle.ts`
- **Discovered**: 2026-07-15 (code review of PR #1)
- **Resolved**: 2026-07-15
- **Status**: resolved — **code bug**
- **Description**: The duplicate-membership guard was read-then-write with no unique constraint or transaction. A double-tapped onboarding submit could create two circles for one user.
- **Fix**: Added `@@unique` (via a unique `userId` field) on `Membership` at the DB level and made `createCircle` catch the resulting `P2002` conflict instead of racing on an application-level read.

### [CR-004] Task-card assign/resolve actions had no error handling
- **Severity**: medium
- **Page/Section**: `src/components/task-card.tsx`
- **Discovered**: 2026-07-15 (code review of PR #1)
- **Resolved**: 2026-07-15
- **Status**: resolved — **code bug**
- **Description**: `assignTaskToMe`/`resolveTask` started throwing `AuthenticationError`/`AuthorizationError` in this PR, but the button handlers and swipe gesture had no try/catch — a stale session or revoked membership caused a silent no-op with no user feedback.
- **Fix**: Wrapped both handlers in try/catch with `toast.error` on failure.

### [CR-005] Onboarding/invite forms had no error boundary; invite page skipped the membership check
- **Severity**: medium
- **Page/Section**: `src/app/onboarding/`, `src/app/invite/[token]/`
- **Discovered**: 2026-07-15 (code review of PR #1)
- **Resolved**: 2026-07-15
- **Status**: resolved — **code bug**
- **Description**: `createCircle`/`acceptInvite` throw on invalid input or an expired/claimed invite, but neither route had an `error.tsx`, so failures hit Next's raw default error page. Separately, the invite page never checked whether the visiting user already had a membership, unlike every other guarded route.
- **Fix**: Added `src/app/onboarding/error.tsx` and `src/app/invite/error.tsx`, and added the same `getMembership` redirect-if-already-a-member guard used by `/onboarding`.

### [CR-006] `circle.ts` had zero test coverage
- **Severity**: medium
- **Page/Section**: `src/lib/actions/circle.ts`
- **Discovered**: 2026-07-15 (code review of PR #1)
- **Resolved**: 2026-07-15
- **Status**: resolved — **test bug** (CLAUDE.md requires a happy-path + error-path test per new Server Action)
- **Description**: `createCircle`, `createInvite`, and `acceptInvite` — the most security-sensitive new code in PR #1 (invite token validation, expiry, double-claim prevention) — shipped with no tests.
- **Fix**: Added `src/lib/actions/circle.test.ts` covering happy-path and error-path cases for all three actions.

### [CR-007] Sign-out button silently swallowed failures
- **Severity**: low
- **Page/Section**: `src/app/(app)/settings/settings-client.tsx`
- **Discovered**: 2026-07-15 (code review of PR #1)
- **Resolved**: 2026-07-15
- **Status**: resolved — **code bug**
- **Description**: The sign-out button had no error handling, unlike every other handler in the same file — a failed sign-out (offline, 5xx) looked like the button did nothing.
- **Fix**: Added an explicit `{ error }` check on `authClient.signOut()`'s result (it resolves rather than throws) with a `toast.error` on failure.

### [CR-008] `auth.ts` baseURL had no fallback, unlike the invite-link builder
- **Severity**: low
- **Page/Section**: `src/lib/auth.ts`
- **Discovered**: 2026-07-15 (code review of PR #1)
- **Resolved**: 2026-07-15
- **Status**: resolved — **code bug**
- **Description**: `baseURL` was sourced only from `BETTER_AUTH_URL`, while `circle.ts`'s invite-link builder falls back through `BETTER_AUTH_URL ?? NEXT_PUBLIC_APP_URL`. A deploy that only sets one of the two env vars would see OAuth fail while invite links still worked, making the bug look environment-specific.
- **Fix**: Matched the same fallback chain in `auth.ts`.

### [UAT-001] Dashboard tasks not filtered by family — shows all tasks globally
- **Severity**: high
- **Page/Section**: `/dashboard`
- **Discovered**: 2026-03-18
- **Resolved**: 2026-07-15
- **Status**: resolved
- **Description**: Dashboard queried `prisma.task.findMany` without any family/household filter.
- **Fix**: PR #1's circle tenancy work scopes every dashboard query by `circleId` via `requireCircleContext()`.

### [UAT-003] Empty state on Vital Info shows developer-facing text
- **Severity**: low
- **Page/Section**: `/vital-info`
- **Discovered**: 2026-03-18
- **Resolved**: 2026-03-18
- **Status**: resolved
- **Description**: Empty state message read "Run npm run db:seed to get started" — developer-facing, not user-facing.
- **Fix**: Changed to user-friendly message in `vital-info-client.tsx`.

### [UAT-004] Server Actions lack input validation
- **Severity**: high
- **Page/Section**: `src/lib/actions/tasks.ts`, `src/lib/actions/vital-info.ts`, `src/lib/actions/user.ts`
- **Discovered**: 2026-03-18
- **Resolved**: 2026-03-18
- **Status**: resolved
- **Description**: Server Actions accepted raw unvalidated input from clients.
- **Fix**: Added zod schemas for all Server Action inputs across `tasks.ts`, `vital-info.ts`, and `user.ts`.

### [UAT-005] No loading states on route navigation
- **Severity**: low
- **Page/Section**: All pages under `(app)/`
- **Discovered**: 2026-03-18
- **Resolved**: 2026-03-18
- **Status**: resolved
- **Description**: No `loading.tsx` files existed for any route.
- **Fix**: Added skeleton loading states to `/dashboard`, `/vital-info`, and `/settings`.

### [UAT-006] No error boundaries on any route
- **Severity**: low
- **Page/Section**: All pages under `(app)/`
- **Discovered**: 2026-03-18
- **Resolved**: 2026-03-18
- **Status**: resolved
- **Description**: No `error.tsx` or `not-found.tsx` existed.
- **Fix**: Added shared `error.tsx` and `not-found.tsx` to the `(app)` layout group.

### [UAT-000] Prisma 7 changed config format
- **Severity**: high
- **Page/Section**: Prisma
- **Discovered**: 2026-03-16
- **Resolved**: 2026-03-16
- **Status**: resolved
- **Description**: Prisma 7 changed config format, `url` in schema no longer supported.
- **Fix**: Downgraded to Prisma 6.
