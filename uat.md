# UAT Baseline — Keeper

_Created: 2026-03-18_
_Last run: 2026-03-18_

## Project Info
- **Stack**: Next.js 16 (App Router, Turbopack) + Prisma 6 (SQLite) + NextAuth v5 + Tailwind CSS
- **Dev server**: `npm run dev` → http://localhost:3000
- **Entry point**: `src/app/page.tsx` (redirects to `/dashboard`)
- **Key routes**: `/dashboard`, `/vital-info`, `/settings`, `/login`
- **Auth**: Bypassed via `DEV_USER` for local dev

## Critical Flows (run every time)

1. **Dashboard loads with tasks**: Visit `/dashboard` → see "Hey, [name]" greeting, Active tab with Unassigned Needs and My Upcoming Tasks sections. Verify task cards show badges, avatars, and action buttons.
2. **Create task via FAB**: Click (+) FAB → fill title → submit → toast "Task added!" → task appears in Unassigned Needs.
3. **Assign task**: Click "Assign to Me" on an unassigned task → toast "X is on it!" → task moves to My Upcoming Tasks.
4. **Resolve task**: Click "Resolve" on an assigned task → toast "Task resolved!" → task moves to History tab.
5. **Edit task**: Click pencil icon on a task → edit dialog opens → modify fields → Save → toast "Task updated!".
6. **Delete task**: Click pencil icon → Delete → confirm → toast "Task deleted" → task disappears.
7. **Health Info loads**: Navigate to `/vital-info` → all seeded categories appear (Allergies, Doctors, Emergency Contacts, Insurance, Medications) with correct icons.
8. **Edit vital info**: Click edit icon on a category → textarea appears → modify → save → toast "Updated!".
9. **Settings loads**: Navigate to `/settings` → profile card shows name/email (disabled), editable phone number, notification toggles, Save Changes + Sign Out buttons.
10. **Bottom nav works**: Tap Home/Health/Settings → correct page loads, active tab highlighted in teal.

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
| Login | 2026-03-18 | Stable (auth not functional in dev) |
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
- Sign Out button calls `signOut()` from next-auth — not functional in dev mode with `DEV_USER` bypass.
- No tests exist yet — test infrastructure not set up (vitest not installed).
