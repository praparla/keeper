# CLAUDE.md — Keeper Project Development Principles

> Next.js 16 (App Router) · Prisma · NextAuth v5 · React 19 · Tailwind CSS · TypeScript

---

## Agent Workflow: Explore → Plan → Code → Verify

Never blindly write code. Always follow this loop:

1. **Explore** — Search the codebase. Find relevant files, understand existing patterns before touching anything.
2. **Plan** — Assess the blast radius (how many files touched, how long it takes). For significant changes, present 2–3 high-level approaches with pros/cons and ask for human approval before writing code.
3. **Code** — Implement following the rules below.
4. **Verify** — Run `npm run build` and `npm run lint`. Fix all failures before declaring the task complete.

**Read before edit:** Always read a file before editing it, even if it was read earlier in the conversation.

**Ask for options first.** On non-trivial tasks, propose approaches before writing code. The human needs to evaluate options — don't assume the first plausible approach is the right one.

---

## Communication Style

- **Concise output.** No filler, no apologies, no moralizing. Skip generic advice.
- **Show your work.** Use short internal monologues to break down complex problems.
- **Fail loud.** Never use catch-all exception handlers that silently swallow errors. Always raise or log explicitly.

---

## Architecture Principles

- **No over-engineering.** Only make changes directly requested or clearly necessary. Keep solutions simple.
- **Single source of truth.** Constants, configs, and shared types derive from one place.
- **Modular design.** Separate concerns: data fetching, business logic, and presentation are distinct layers.
- **Server-first.** Prefer React Server Components and Server Actions over client-side data fetching. Move to the client only when interactivity requires it.
- **Cost-optimized.** Stay on free tiers and use the cheapest resources that meet requirements.
- **Document subsystems.** Maintain a `docs/` folder with notes on non-obvious subsystems, design decisions, and correct CLI invocations. One line of documentation prevents repeated mistakes.

---

## Next.js App Router Standards

- **Server Components by default.** Only add `"use client"` when the component needs hooks, event handlers, or browser APIs.
- **Server Actions for mutations.** Define data mutations as Server Actions in `src/lib/actions/`. Never POST to an API route for simple CRUD — use Server Actions.
- **Route organization.** App routes live in `src/app/`. Shared layouts use `layout.tsx`. Auth-protected routes go under `src/app/(app)/`.
- **Data fetching.** Fetch data in Server Components or Server Actions. Pass data down as props; don't re-fetch in child components.
- **Error boundaries.** Add `error.tsx` and `not-found.tsx` alongside `page.tsx` for every route that can fail.
- **Loading states.** Add `loading.tsx` for routes with async data fetches. Use Suspense boundaries for partial loading.
- **`next/navigation` only in Client Components.** `useRouter`, `usePathname`, `useSearchParams` require `"use client"`.
- **Build check:** Run `npm run build` after significant changes to catch type errors and build-time failures early.

---

## Prisma & Database Standards

- **Schema is the source of truth.** All data shape changes go through `prisma/schema.prisma` first, then `npm run db:push` or a migration.
- **Never write raw SQL** unless Prisma cannot express the query. Use Prisma Client exclusively.
- **Seed data lives in `prisma/seed.ts`.** Re-seeding must be idempotent — use `upsert` not `create` in seeds.
- **Single Prisma Client instance.** Import from `src/lib/db.ts` only. Never instantiate `PrismaClient` directly in components or actions.
- **Transactions for multi-step writes.** Use `prisma.$transaction([...])` when multiple writes must succeed or fail together.
- **Check relations before deleting.** Respect cascade rules. Deleting a parent record may cascade to children — verify intent.
- **After schema changes:** Run `npm run db:generate` to regenerate the Prisma client, then `npm run db:push` to sync the DB.

---

## Authentication & Authorization (NextAuth v5)

- **Session check in every protected Server Action.** Call `auth()` at the top of every action that reads or writes user data. Throw or return an error if no session exists.
- **Never trust client-supplied user IDs.** Always derive the acting user from `session.user.id`, not from request body or URL params.
- **Auth config lives in `src/lib/auth.ts`.** Do not duplicate auth logic elsewhere.
- **Environment variables for secrets.** `AUTH_SECRET`, `DATABASE_URL`, and any OAuth credentials must be in `.env.local` only, never committed.

---

## Testing & Validation

**Tests are mandatory with every code change.** Bug fix → regression test. New feature → feature tests. Refactor → confirm existing tests still pass.

### Setup (not yet installed — add when writing first tests)
Recommended stack: **Vitest** + **@testing-library/react** + **@testing-library/user-event**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

### What to test
- **Server Actions** — unit test business logic and DB interactions (mock Prisma with `vitest.mock`)
- **Utility functions** (`src/lib/utils.ts`, etc.) — pure functions are easiest to test; test them thoroughly
- **React components** — test user interactions and conditional rendering, not implementation details
- **Auth guards** — verify that unauthenticated requests to Server Actions are rejected

### Coverage requirements
- Every bug fix **must** include a test that would have caught the bug
- Every new Server Action **must** have at least one happy-path test and one error-path test
- **Cover edge cases:**
  - Empty/null optional fields
  - Unauthenticated access attempts
  - Invalid input (wrong types, missing required fields)
  - Concurrent or duplicate submissions

### Running checks
```bash
npm run lint          # ESLint — fix all warnings before committing
npm run build         # Full type check + build — must pass before merging
npm run test:run      # All tests — must pass before committing
```

---

## Frontend Standards

- **Functional components + hooks only.** No class components.
- **`"use client"` at the top of the file** when the component needs interactivity. Keep client boundary as low in the tree as possible.
- **Colors, enums, and constants in a dedicated constants file** — never hardcoded inline.
- **Data transforms belong in Server Actions or utility functions**, not in components.
- **Proper loading, error, and empty states on every view.** Null values show explicit placeholders — never blank UI or missing fields.
- **All interactive elements must have visible focus indicators** for accessibility.
- **Mobile-first responsive design.** All features must work on both mobile and desktop. This app is mobile-primary — test on small viewports.
- **TypeScript strict mode.** No `any` types. If a type is complex, define it explicitly in `src/types/` or co-locate it with the feature.
- **Radix UI for primitives.** Prefer Radix UI components from `src/components/ui/` before writing custom interactive components.
- **Toast notifications via Sonner.** Use `toast.success` / `toast.error` for Server Action outcomes — not custom alert state.

---

## Error Resilience

- **Never swallow errors silently.** Log and surface them — use Sonner toasts for user-facing errors, `console.error` for server-side.
- **Validate Server Action inputs.** Never trust data from forms or client components. Validate shape and types before DB writes.
- **Track errors visibly.** Use `issues.md` in the project root — failures must be visible, not silent.

---

## Security & Credential Handling

- **Never commit secrets.** `AUTH_SECRET`, `DATABASE_URL`, OAuth credentials must never appear in committed code.
- Credentials live in `.env.local` only. Halt with a clear error if missing.
- Never log session tokens or user passwords.
- Always `.gitignore`: `.env`, `.env.local`, `credentials.json`, `secrets/`, `node_modules/`, `.next/`, `*.pyc`.
- Before committing: `git diff --cached | grep -iE "apikey|password|token|secret"`.
- **Before pushing to a remote**, audit the full commit history for leaked secrets: `git log --all -p | grep -iE "sk-|apikey|password|token|secret|DATABASE_URL|AUTH_SECRET"`. If secrets are found in history, remove them with `git filter-repo` or `BFG Repo-Cleaner` before pushing. **Never push to GitHub without verifying the entire history is clean.**
- **Password hashing.** Use `bcryptjs` (already a dependency). Never store plaintext passwords.

---

## Git Discipline

- **Commit often** at natural checkpoints — small, focused commits over large monolithic ones.
  - After each new feature is built and tests pass
  - After fixing a bug (include the regression test in the same commit)
  - After schema or dependency changes
- Write descriptive commit messages explaining *what* and *why*.
- Never commit `node_modules/`, `.next/`, `.env.local`, or Prisma migration conflicts.

---

## Issue Tracking (`issues.md`)

Maintain a living `issues.md` in the project root as an audit trail.

- Log bugs with: date, module/area, description, root cause (**code bug** vs. **test bug**), and status (Open / Fixed).
- Update entries when resolved: what the fix was + the commit that resolved it.
- **After every bug fix, add a regression test** that would have caught the bug, and reference it in `issues.md`.

---

## Backlog (`backlog.md`)

Maintain a `backlog.md` for ideas, features, and enhancements.

- When ideas come up during development, add them immediately — don't lose them.
- Each item: brief description + priority (low / medium / high).
- Review and reprioritize periodically.

---

## Working with AI Agents

- **Context engineering over prompt engineering.** Fill the context window with exactly what's needed — no more, no less. Watch for three failure modes: *context poisoning* (early errors that compound), *context distraction* (irrelevant content that buries what matters), and *context clash* (contradictory instructions).
- **Start fresh on topic switches.** Use `/clear` when moving to an unrelated problem. Break complex tasks into small steps and commit between them.
- **AI has no taste.** Actively review output for: excessive try/catch blocks, unnecessary abstractions, code bloat instead of refactoring, and poor judgment on simplicity vs. structure. These are recurring failure modes that require human correction.
- **Closed-loop validation.** After implementing, always run `npm run build` and `npm run lint` (and `npm run test:run` once tests exist) to verify the output without human intervention.
- **Keep this file current.** When something unexpected happens — a pattern that failed, a correct CLI invocation, a library quirk — add a concise note here. This file should grow incrementally as organizational scar tissue.
- **Write big plans to files.** For large tasks, write the spec to a `docs/` markdown file and review it before executing.
