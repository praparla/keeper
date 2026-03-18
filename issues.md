# Keeper — Issues Log

_Last updated: 2026-03-18_

---

## Open Issues

### [UAT-001] Dashboard tasks not filtered by family — shows all tasks globally
- **Severity**: high
- **Page/Section**: `/dashboard`
- **Discovered**: 2026-03-18
- **Status**: open
- **Description**: Dashboard queries `prisma.task.findMany` without any family/household filter. All tasks from all users are shown globally. When multi-family support or real auth is added, users will see tasks from unrelated families. The current `where: { status: { not: "Resolved" } }` has no user/family scoping.
- **Steps to Reproduce**: Check `src/app/(app)/dashboard/page.tsx` lines 11-22.
- **Fix**: _(pending — blocked on auth implementation)_

### [UAT-002] Vital Info page has no way to add new categories
- **Severity**: high
- **Page/Section**: `/vital-info`
- **Discovered**: 2026-03-18
- **Status**: open
- **Description**: The Health Info page only shows categories that were pre-seeded. There is no UI to add a new vital info category — users can only edit existing entries. The empty state message says "Run npm run db:seed to get started" which is a developer-facing instruction, not user-facing.
- **Steps to Reproduce**: Delete all VitalInfo records from DB → visit `/vital-info` → see developer message with no way to add data.
- **Fix**: _(pending)_

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
