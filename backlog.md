# Keeper — Backlog

> Priority: **High** → must-have or blocking. **Medium** → meaningful value, not urgent. **Low** → nice-to-have or exploratory.
> Complexity: **S** = hours, **M** = 1–2 days, **L** = 3–5 days, **XL** = 1+ week.

---

## High Priority

- [ ] **Web Hosting** · `M`
  Deploy to production web hosting. **Recommended: Railway Hobby ($5/month)** — container-based (no serverless cold starts or function timeouts), includes managed Postgres within the $5 credit, excellent Next.js DX, no vendor lock-in. Alternative: Vercel Hobby (free, personal/non-commercial use only per ToS) + Neon free tier (0.5 GB, auto-suspends between queries — 100–500ms cold start on first query after idle). Steps: push to GitHub → connect Railway → provision Railway Postgres → set `DATABASE_URL`, `AUTH_SECRET`, and OAuth credentials as environment variables → deploy. Do not use Vercel for commercial use; use Railway or upgrade to Vercel Pro ($20/month) if revenue-generating.

- [ ] **iOS App Store Distribution** · `XL`
  Ship Keeper to the iOS App Store. **Recommended approach: Capacitor (load from remote hosted URL).** Capacitor wraps the existing Next.js web app in a native WebView — ~90% code reuse. Loading from the hosted domain (not local static bundle) means cookie-based NextAuth v5 sessions work identically to the browser with zero auth changes. Key constraints: Server Actions don't execute in the Capacitor shell (they're server-side); mutations must go through explicit API routes (`src/app/api/`) alongside existing Server Actions. Steps: (1) `npm install @capacitor/core @capacitor/cli @capacitor/ios`; (2) set `server.url` in `capacitor.config.ts` to hosted domain; (3) add Capacitor plugins for push notifications and secure storage; (4) enroll in Apple Developer Program ($99/year, required); (5) submit via Xcode + App Store Connect. **Long-term path:** if native feel becomes critical (scroll physics, animations), migrate to a Solito monorepo (Next.js web + Expo React Native mobile sharing hooks/types/business logic — but UI components are written twice). Avoid full Swift rewrite — zero code reuse, expensive.
  - Auth note: With Capacitor + remote URL, no auth changes needed. If ever moving to a true native React Native build, add a `/api/mobile-token` endpoint that issues a short-lived JWT (15 min) from the existing NextAuth session; store it in iOS Keychain via `capacitor-secure-storage-plugin`. Never store tokens in `localStorage`.
  - Security note: iOS app hits the Next.js server (Railway/Vercel) via HTTPS — never expose `DATABASE_URL` or a raw DB connection. Rate-limit auth endpoints even at small scale.
  - Cost summary at <50 users: Railway $5/month + Apple Developer $99/year ≈ **~$13/month all-in**.

- [ ] **Deployment** · `M`
  Push to GitHub, connect to Vercel. Provision Vercel Postgres and update `DATABASE_URL`.

- [ ] **Authentication** · `L`
  Re-enable auth gates (currently bypassed with `DEV_USER`). Configure actual Google Provider client IDs and a real SMS OTP service (e.g., Twilio Verify). Remove `src/lib/dev-user.ts` and restore `auth()` calls in all server actions, pages, and API routes. Search for `TODO:` comments to find every bypass point.

- [ ] **Workload Visibility** · `M`
  A quiet "who's done what" summary (past 7 and 30 days): tasks completed, check-ins logged, vitals updated, per family member. No gamification — just data. Addresses the unspoken "I'm doing more than you" tension that 40% of caregiver families report. No competitor app has built this well. *Source: AARP caregiver sibling conflict research.*

- [ ] **Notifications — Real Integrations** · `M`
  Replace `lib/notifications.ts` console logs with actual Resend (email) and Twilio (SMS). Batch non-urgent task updates into a morning digest (8am) rather than firing on every change. Medical/urgent tasks notify immediately.

- [ ] **Server Action Input Validation** · `S`
  Add zod schemas for all Server Action inputs (`createTask`, `updateTask`, `upsertVitalInfo`, `updateProfile`). Currently accepting raw unvalidated input from clients. *Found in UAT 2026-03-18.*

- [ ] **Loading & Error States for All Routes** · `S`
  Add `loading.tsx`, `error.tsx`, and `not-found.tsx` to each route group under `(app)/`. Currently no visual feedback during navigation or error recovery. *Found in UAT 2026-03-18.*

---

## Medium Priority

- [ ] **Activity Feed** · `M`
  Unified chronological feed: task created, assigned, completed, check-in logged, vital updated. Every competitor uses a feed as the connective tissue between family members. Simple card-per-event, avatar + action + timestamp. No social reactions needed — just visibility. *Pattern validated across: CaringBridge, Caring Village, ianacare, Carely.*

- [x] **Color-Coded Family Members** · `S` *(Done: User.color field + MemberAvatar component + colored initials on task cards)*

- [ ] **One-Tap Check-In** · `S`
  A single button on the home screen: "I visited today — all good" or "I visited — flagged a concern." Logs a timestamped entry visible to the whole family. *Deprioritized from High: not blocking, deferred until core UX is polished.*

- [ ] **Recurring Tasks** · `M`
  Toggle on a task for weekly/monthly recurrence (e.g., pill pickup, doctor follow-up). Auto-recreate on completion. Most families have 3–5 recurring care tasks that shouldn't require manual re-entry. *Gap identified in: CareZone shutdown feedback and Reddit caregiving threads.*

- [ ] **Invite via SMS Link** · `M`
  Invite family members with a single SMS link. Read-only access without requiring account creation. The #1 adoption failure across all competitor apps: one sibling can't get another to sign up. Frictionless read-only join removes this blocker. *Pattern used by: Lotsa Helping Hands for volunteers.*

- [ ] **Week Calendar View** · `M`
  A native week-view calendar on mobile (not just a list). The single most-cited UI failure in Lotsa Helping Hands reviews is a broken/missing calendar on mobile. Week view as default; month as toggle. Per-person color dots. *Non-negotiable for coordination context.*

- [ ] **Structured Vital Signs** · `L`
  Evolve VitalInfo from freeform text to structured entries: BP (systolic/diastolic), weight, blood glucose, pain level 1–10, mood. Show a sparkline trend per metric. Keep data entry to 3–4 taps. *Gap from: CareMobi, which targets clinical teams not family members.*

- [ ] **Threshold Alerts** · `M`
  Auto-notify all family members if BP > 140/90 or weight changes > 5 lbs/week. Requires structured vitals above. Addresses the "I didn't know it was that bad" moment families describe. *Depends on: Structured Vital Signs.*

- [x] **Swipe Gestures on Task Cards** · `S` *(Done: right-swipe to assign/resolve with background indicator)*

- [x] **Warm Off-White / Soft Teal Design Pass** · `S` *(Done: oklch warm off-white bg + soft teal primary in globals.css)*

- [x] **Empty States on Every View** · `S` *(Done: reusable EmptyState component with icons + CTAs on dashboard and vital-info)*

- [ ] **Add New Vital Info Category** · `S`
  Add an "Add Category" button to the Health Info page so users can create new vital info entries beyond the seeded set. Currently the only way to add categories is via database seed. *Found in UAT 2026-03-18.*

- [ ] **Confirmation Dialog for Destructive Actions** · `S`
  Replace `window.confirm()` with a styled Radix AlertDialog for task deletion. The native browser confirm looks out of place on mobile and doesn't match the app's design language. *Found in UAT 2026-03-18.*

- [ ] **Doctor's Brief Includes Vital Info** · `S`
  Current CSV export only includes Medical-type tasks. Add vital info (medications, allergies, doctors) to the Doctor's Brief export for a complete picture. *Found in UAT 2026-03-18.*

---

## Low Priority

- [ ] **Skeleton Loading** · `S`
  Replace spinners with content-shaped skeleton loaders. Better perceived performance, especially on slow hospital/clinic Wi-Fi. *Visual pattern: every well-rated app uses this; every poorly-rated one still uses spinners.*

- [ ] **Pull-to-Refresh** · `S`
  Native-feeling pull-to-refresh on all list and feed views. Expected by mobile users; absence feels broken.

- [ ] **Offline / PWA Support** · `XL`
  Service worker + PWA manifest so the app works in hospitals and areas with poor connectivity. Cache the last-loaded state. *High effort, but hospitals are where the app is needed most.*

- [ ] **Doctor's Brief PDF Export** · `M`
  Generate a single-page PDF: current medications, allergies, recent vitals, upcoming appointments. Bring-to-the-doctor use case. No competitor does this simply. *Complements: Structured Vital Signs.*

- [ ] **Medical Info Vault** · `M`
  Insurance card photo, pharmacy info, advance directive document storage. Secure, family-accessible. One place for documents that are always needed in a crisis. *Gap identified in: Caring Village feature set, but their implementation is buried.*

- [ ] **Caregiver Burnout Signal** · `M`
  If one family member logs >80% of all activity over 30 days, surface a quiet prompt: "Looks like [Name] is carrying most of the load. Would you like to reassign some tasks?" No alarm, no gamification — just a gentle nudge. *Novel feature; no competitor has built this. High differentiation.*

- [ ] **AI-Powered Weekly Summary** · `L`
  LLM-generated "This week in [parent's name]'s care" digest — medications given, tasks completed, vitals trend, who was involved. Email-able to family members who are distant or less engaged. *Depends on: Activity Feed + Structured Vitals. Use Haiku for cost.*

- [ ] **Voice-to-Task** · `L`
  Speak a task and it gets created. High impact for on-the-go caregiving — hands full, can't type. *Complexity is in transcription accuracy + mobile mic permissions flow.*

---

## Deliberate Non-Goals

Features validated by competitor research as adding complexity without meaningful value for Keeper's use case. Do not build unless the use case fundamentally changes.

- Wellness / emotional journaling (Caring Village) — high setup friction, rarely used
- Volunteer community board (Lotsa Helping Hands) — out of scope for tight family coordination
- GoFundMe / financial features — scope creep
- Clinical EHR integration — creates HIPAA surface area and enterprise complexity
- AI chatbot / care plan wizard (Caring Village "Julia") — too complex for initial onboarding
- Mood emoji tracking — feels infantilizing per user reviews

---

*Research note: Competitive analysis of Lotsa Helping Hands, CaringBridge, CareZone, Cozi, Caring Village, ianacare, Carely, and CareMobi. UI/design patterns synthesized from App Store listings, Segue Technologies (Caring Village case study), AKUREY (Carely case study), JAGS 2025 caregiver app study (avg rating: 2.7/5), and AARP sibling caregiving research. Key differentiator for Keeper: sibling-first coordination, medical + tasks unified, 5-second data entry, and mobile-first minimalist design.*
