# CLAUDE.md — Keeper Project Development Principles

> Next.js 16 (App Router) · Prisma · Better Auth · React 19 · Tailwind CSS · TypeScript

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

## Authentication & Authorization (Better Auth)

- **Session check in every protected Server Action.** Use `requireUser()` or `requireCircleContext()` from `src/lib/access.ts`. Throw if no session or membership exists.
- **Never trust client-supplied user IDs.** Always derive the acting user from `session.user.id`, not from request body or URL params.
- **Auth config lives in `src/lib/auth.ts`.** Do not duplicate auth logic elsewhere.
- **Preserve legacy auth tables during cutover.** Better Auth uses `AuthSession`, `AuthAccount`, and `AuthVerification`; remove old NextAuth tables only after production sign-in succeeds.
- **Environment variables for secrets.** `AUTH_SECRET`, `DATABASE_URL`, and any OAuth credentials must be in `.env.local` only, never committed.
- **`authClient` methods resolve `{ data, error }`, they don't throw.** A `try/catch` around `authClient.signIn.social(...)` / `authClient.signOut(...)` never fires on failure — check the returned `error` field instead (see `login-client.tsx` for the pattern). Caught this the hard way wrapping `signOut` in a dead try/catch during the 2026-07-15 code-review pass.
- **`requireCircleContext()`/`getMembership()` are wrapped in React's `cache()`.** A layout guard and a child page can both call them in the same request without doubling the DB round-trip — don't remove the `cache()` wrapper when touching `src/lib/access.ts`, and use it for any new per-request lookup shared between a layout and its pages.

---

## Testing & Validation

**Tests are mandatory with every code change.** Bug fix → regression test. New feature → feature tests. Refactor → confirm existing tests still pass.

### Setup
Vitest, Testing Library, jsdom, and CI are installed. Tests live beside sources as `*.test.ts(x)`.

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
- **Log every agent run to `docs/agent-runs.md`.** Standing practice (since 2026-07-14): any session that uses subagents, research fan-outs, or workflows appends an entry there — purpose, tokens, tool uses, wall time, result quality, and a token-efficiency verdict (including the cheaper route that would have been as accurate). Used to evaluate across sessions which agent shapes earn their tokens. Template at the top of that file.
- **Size code-review agent fan-out to the diff, not to a flat "high effort" default.** Cap fan-out width to 2-3 concurrent agents without asking — a wide burst (8-10+) risks server-side rate-limit errors *and* burns tokens on redundant angles that rediscover the same bug from different lenses. Before invoking `/code-review` at "high" or above on a large diff, scope it down explicitly: pick 2-4 finder angles that fit the actual risk surface (e.g. correctness + auth/tenancy for a Server Action change; skip efficiency/altitude/reuse passes unless the diff is genuinely architectural), and skip the separate 1-vote verify pass — read the flagged lines yourself instead of spawning a verifier per finding. A prior repo (`coding-best-practices/PROMPTING.md`) logged the identical mistake: an 8-angle review on an 11-file diff cost ~980K tokens across 14 calls, with 3 of 8 angles independently re-finding the same two bugs — a single manual read would have caught both for near-zero cost. Reserve the full multi-angle sweep for changes that touch auth, money, or data-loss paths across many files; a routine feature diff gets 2-3 targeted agents or a manual pass.
- **Inline before subagent.** A subagent costs ~25-40K tokens of orchestration overhead before it does anything useful. Don't spawn one for a bounded lookup, a small file read, or anything a `grep`/`Read` call answers directly — reserve agents for genuine multi-file synthesis or open-ended research.

---

## Deployment transition

**Current production:** `keeper-production-a8ea.up.railway.app` on Railway. **Target:** Vercel + Supabase after the M0 runbook is completed and verified.
**Railway project:** `modest-warmth` · GitHub auto-deploy from `pranava0x0/keeper` (main branch; repo was `praparla/keeper` — renamed, old URL redirects for git but confuses `gh`, so keep remotes pointed at the new name)
**Region:** europe-west4-drams3a

### How deploys work
- Every `git push origin main` triggers an auto-deploy on Railway.
- Build pipeline is now `prisma generate` → `next build`. Schema migrations and seed runs are explicit release steps; preview builds never mutate production.
- The seed is idempotent (uses `upsert` for users, `deleteMany` + `create` for vital info).

### Environment variables (set on Railway, not in code)
- `DATABASE_URL` — references `${{Postgres.DATABASE_URL}}` (internal hostname, used at **runtime**)
- `DATABASE_PUBLIC_URL` — references `${{Postgres.DATABASE_PUBLIC_URL}}` (public proxy, used at **build time**)
- `AUTH_SECRET` — generated with `openssl rand -base64 32`

### Critical: the build never mutates the database
**The build script is `prisma generate && next build` — it does NOT run `prisma db push`, migrations, or the seed.** A `git push origin main` auto-deploys, but that deploy only compiles code; it cannot cause data loss because it never touches schema or rows. This was a deliberate change (2026-07-15): schema migrations and seeds are **explicit release steps**, never part of preview/production builds. Do not reintroduce `db push` into `build` — an earlier version of this note showed exactly that, and it triggered a false data-loss alarm during the M0 merge.

Schema changes reach production via reviewed migrations only:
```
DATABASE_URL=$DATABASE_PUBLIC_URL npm run db:migrate:deploy    # applies prisma/migrations/* in order
DATABASE_URL=$DATABASE_PUBLIC_URL npm run db:seed              # demo data only, idempotent
```
Any Prisma command run manually against a build/release environment must use `DATABASE_PUBLIC_URL` (Railway's private `*.railway.internal` network is unavailable during builds/CI). At runtime the app uses the fast internal `DATABASE_URL`. Migration playbooks: `docs/m0-runbook.md` (tenancy cutover), `docs/m1-runbook.md` (care model + VitalInfo re-scope).

### Switching from SQLite to PostgreSQL
When migrating the Prisma datasource:
1. Change `provider` to `"postgresql"` and `url` to `env("DATABASE_URL")` in `prisma/schema.prisma`.
2. No schema changes needed — Prisma's SQLite and PostgreSQL schemas are compatible for this project's types.
3. The first `prisma migrate deploy` release step (not the build) creates all tables.

### Current state (as of 2026-07-15)
- **M0** (auth/tenancy foundations): Better Auth Google sign-in, circle tenancy, onboarding, and single-use invite links are implemented. Production still needs OAuth credentials, the M0 migrations applied, and the two-user acceptance test in `docs/m0-runbook.md` before the bypass removal is operationally complete.
- **M1** (care model): `CareRecipient` + profile facts, medications with a refill loop, appointments + providers, conditions, per-recipient `VitalInfo` (moved off circle scope), and task recurrence (materialized-next-instance) are implemented. IA is now four tabs (Today · Calendar · Parents · Family). Design pass applied: evergreen/parchment/clay almanac palette, serif content voice. Migration playbook: `docs/m1-runbook.md`. The stepped onboarding interview + the "first 5 suggestions" reveal are **M2** (they need the suggestion engine).
