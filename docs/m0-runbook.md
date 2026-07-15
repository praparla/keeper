# M0 auth and tenancy cutover

Repository work is complete when CI passes. Production work is complete only after every checkbox below is observed against the real deployment.

## Preflight

- [ ] Take a Railway Postgres backup and restore it into a disposable database.
- [ ] Record counts for `User`, `Task`, and `VitalInfo`.
- [ ] Create the Supabase project and set `DATABASE_URL` (transaction pooler) plus `DIRECT_URL` (session pooler).
- [ ] Create Google OAuth web credentials. Add local and production origins plus `/api/auth/callback/google` redirect URIs.
- [ ] Set every variable shown in `.env.example` in Vercel. Never commit real values.

## Migrate

```bash
npm ci
npm run db:migrate:deploy
npm run db:seed
```

The two M0 migrations intentionally preserve `Account`, `Session`, and `VerificationToken`. Better Auth writes to separate `Auth*` tables during the cutover.

Verify before traffic switch:

- [ ] `Task.circleId` and `VitalInfo.circleId` have zero nulls.
- [ ] Preflight row counts still match.
- [ ] Existing tasks and health info appear inside the migrated Family circle.

## Acceptance

- [ ] Pranava signs in with Google and reaches the Family circle.
- [ ] A fresh Google user reaches onboarding, not family data.
- [ ] Invite link is single-use, expires after seven days, and joins the intended circle.
- [ ] A user from another circle cannot read, update, delete, assign, or export Family rows even with a known row ID.
- [ ] Sign-out works and a session survives a browser restart.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build` pass in CI.

Keep Railway warm for one week. Switch back to Railway and restore the backup if auth or tenancy acceptance fails. Remove legacy auth tables only in a later, separately reviewed migration.
