# UAT Baseline — Keeper

_Created: 2026-03-18_
_Last run: 2026-03-18_

## Project Info
- **Stack**: Next.js 16 (App Router, Turbopack) + Prisma 6 (SQLite) + NextAuth v5 + Tailwind CSS
- **Dev server**: `npm run dev` → http://localhost:3000
- **Entry point**: `src/app/page.tsx` (redirects to `/dashboard`)
- **Key routes**: `/dashboard`, `/vital-info`, `/settings`, `/login`
- **Auth**: Better Auth + Google; local runs require the values in `.env.example`

## Critical Flows (run every time)

1. **Auth and tenancy**: Visit `/dashboard` signed out → redirect to `/login`. Sign in with Google. A user without membership lands on `/onboarding`; a member reaches only their circle's data.
2. **Dashboard loads with tasks**: Visit `/dashboard` → see "Hey, [name]" greeting, Active tab with Unassigned Needs and My Upcoming Tasks sections. Verify task cards show badges, avatars, and action buttons.
3. **Create task via FAB**: Click (+) FAB → fill title → submit → toast "Task added!" → task appears in Unassigned Needs.
4. **Assign task**: Click "Assign to Me" on an unassigned task → toast "X is on it!" → task moves to My Upcoming Tasks.
5. **Resolve task**: Click "Resolve" on an assigned task → toast "Task resolved!" → task moves to History tab.
6. **Edit task**: Click pencil icon on a task → edit dialog opens → modify fields → Save → toast "Task updated!".
7. **Delete task**: Click pencil icon → Delete → confirm → toast "Task deleted" → task disappears.
8. **Health Info loads**: Navigate to `/vital-info` → only the signed-in circle's categories appear.
9. **Edit vital info**: Click edit icon on a category → textarea appears → modify → save → toast "Updated!".
10. **Settings and invite**: Notification toggles save; Copy family invite creates a single-use seven-day link; sign out returns to `/login`.
11. **Bottom nav works**: Tap Home/Health/Settings → correct page loads, active tab highlighted in teal.

## Sections & Last Tested
| Section | Last Tested | Notes |
|---------|-------------|-------|
| Dashboard - Active tab | 2026-03-18 | Stable |
| Dashboard - History tab | 2026-03-18 | Stable |
| Dashboard - Quick Add FAB | 2026-03-18 | Stable |
| Dashboard - Edit Task Dialog | 2026-03-18 | Stable |
| Dashboard - Assign/Resolve | 2026-03-18 | Stable |
| Health Info | 2026-03-18 | Stable, no add-new-category UX |
| Settings | 2026-03-18 | Stable |
| Login | Pending M0 production UAT | Google credentials required |
| Bottom Nav | 2026-03-18 | Stable |
| Mobile viewport (375px) | 2026-03-18 | Stable, layout responsive |

## Known Stable Areas
- Task CRUD (create, assign, resolve, edit, delete)
- Vital Info display and inline editing
- Settings profile display and save
- Bottom navigation
- Mobile responsive layout
- Empty states with icons and CTAs

## Known Flaky / Unstable Areas
- Turbopack cache: deleting `.next/` can cause `app-paths-manifest.json` ENOENT crash. Restarting dev server resolves it. Avoid clearing cache mid-session.

## Exploration Notes
- Swipe gestures (touch-only) not testable in desktop browser preview — test manually on mobile device.
- Doctor's Brief CSV export opens in new tab — not testable via automated preview (blocked by `window.open`). Verified code path is correct via code review.
- M0 repository checks are automated; real Google OAuth, migration, invite, and cross-circle browser flows remain pending production UAT. See `docs/m0-runbook.md`.
