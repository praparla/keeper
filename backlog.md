# Keeper — Backlog

## High Priority

- [ ] **Deployment:** Push to GitHub, connect to Vercel. Provision Vercel Postgres and update `DATABASE_URL`.
- [ ] **Authentication:** Re-enable auth gates (currently bypassed with `DEV_USER`). Configure actual Google Provider client IDs and a real SMS OTP service (e.g., Twilio Verify). Remove `src/lib/dev-user.ts` and restore `auth()` calls in all server actions, pages, and API routes. Search for `TODO:` comments to find every bypass point.
- [ ] **Notifications:** Replace `lib/notifications.ts` console logs with actual Resend (Email) and Twilio (SMS) integrations. Batch non-medical tasks into a morning digest (8am) instead of real-time for every change.
- [ ] **Workload Visibility:** Add a "Family Workload" view showing tasks per sibling over the last 30 days (completed, open, overdue). Addresses the unspoken "I'm doing more than you" tension with data.

## Medium Priority

- [ ] **Micro-Interactions:** Add swipe-to-complete gestures for mobile task cards (swipe right = resolve, swipe left = reassign).
- [ ] **Color-coded Family Members:** Assign each sibling a color (inspired by Cozi). Tasks, activity entries, and avatars tinted with their color for instant visual recognition.
- [ ] **Recurring Tasks:** Toggle for recurring tasks (weekly pill pickup, monthly doctor visit) with automatic re-creation.
- [ ] **Activity Feed:** Unified chronological feed showing all recent actions (task created, assigned, resolved, vital info updated) so everyone stays in the loop.
- [ ] **Structured Vital Signs Tracking:** Evolve VitalInfo from freeform text into structured entries (BP, weight, blood glucose, pain level 1-10, mood). Show trends with sparkline charts.
- [ ] **Threshold Alerts:** If BP > 140/90 or weight changes > 5lbs/week, auto-notify all family members.
- [ ] **Medical Info Vault Expansion:** Add pharmacy info, insurance card photo upload, advance directive document storage.

## Low Priority

- [ ] **Instant Onboarding:** Invite family members via SMS link. One tap to join, no account creation required for viewing (read-only for link holders).
- [ ] **Offline-First:** Service worker / PWA support so the app works in hospitals and areas with poor connectivity.
- [ ] **Pull-to-Refresh:** Native-feeling pull-to-refresh on all list views.
- [ ] **Skeleton Loading:** Replace spinners with content-shaped skeleton loaders for better perceived performance.
- [ ] **Doctor's Brief PDF Export:** Expand the CSV medical export to also generate a formatted PDF with medications, allergies, and recent medical tasks.
- [ ] **AI-Powered Summaries:** Use LLM to generate a "This week's care summary" for family members who weren't present.
- [ ] **Voice-to-Task:** Speak a task and it gets created (high impact for on-the-go caregiving situations).

---

*Research note: Competitive analysis of Lotsa Helping Hands, CaringBridge, CareZone, Cozi, Caring Village, ianacare, and CareMobi informed these priorities. Key differentiator for Keeper: sibling-first coordination (not single-caregiver), medical + tasks unified, and 5-second data entry.*
