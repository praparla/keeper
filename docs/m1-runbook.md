# M1 care-model migration

Repository work is complete when CI passes. Production work is complete only after every checkbox below is observed against the real deployment.

The M1 schema adds the care model (recipients, facts, providers, conditions, medications, appointments) and — the one **destructive** transition — moves `VitalInfo` from circle-scoped to recipient-scoped (drops `VitalInfo.circleId`). Two reviewed migrations follow the expand → backfill → verify → contract pattern:

- `20260716000100_m1_expand` — additive only: new tables, new nullable `Task`/`VitalInfo` columns. Safe against existing rows.
- `20260716000200_m1_recipient_contract` — backfills a placeholder `CareRecipient` ("Parent") per circle that has vital info, attaches every `VitalInfo` row to it, **aborts** (`RAISE EXCEPTION`) if any row is left unscoped, then drops `circleId` and enforces the recipient FK.

> ⚠️ Never run `prisma db push` against production for this — `db push` would try to drop `VitalInfo.circleId` before the backfill runs, losing the link between vital info and its circle. Use `migrate deploy` so the backfill SQL executes in order. The build script does not touch the DB (see `CLAUDE.md`); migrations are an explicit release step.

## Preflight

- [ ] Take a production Postgres backup and restore it into a disposable database. **Run the full migration against that copy first** and confirm it completes without the abort exception.
- [ ] Record counts for `User`, `Task`, `VitalInfo`, and (expected 0 pre-M1) `CareRecipient`.
- [ ] Note how many distinct circles currently own `VitalInfo` rows — that equals the number of placeholder recipients the backfill will create.
- [ ] Confirm M0 migrations are already applied in production (M1 builds on the M0 schema).

## Migrate

```bash
npm ci
DATABASE_URL=$DATABASE_PUBLIC_URL npm run db:migrate:deploy
```

Verify before traffic switch:

- [ ] `VitalInfo.recipientId` has zero nulls; `VitalInfo.circleId` column no longer exists.
- [ ] Every pre-migration `VitalInfo` row is still present (count matches preflight) and now reachable via its circle's placeholder `CareRecipient`.
- [ ] `CareRecipient` count == number of circles that had vital info.
- [ ] `Task` row count unchanged; `Task.recipientId` is null for pre-existing rows (expected — recipient is optional).
- [ ] New enums exist: `ResidenceType`, `FactSource`, `ApptStatus`, `Recurrence`.

## Post-migration

- [ ] (Optional) Rename each placeholder "Parent" recipient to the real person, or merge into a recipient created through onboarding. The placeholder exists only so v1 vital info has a home; it is safe to edit in the Parents hub.
- [ ] Demo/catalog seeds are **not** part of this migration. Run `npm run db:seed` only against non-production environments.

## Acceptance

- [ ] Parents tab lists each recipient; the switcher works with 1–4 recipients.
- [ ] A medication with a refill interval and a `lastFilledAt` inside the lead window surfaces a "Refill …" task; "Mark filled" resolves it and resets the cycle.
- [ ] Completing a recurring task immediately materializes the next instance with the correct next due date.
- [ ] "What Keeper knows" shows every fact with provenance; correcting one persists.
- [ ] A member from another circle cannot read or mutate this circle's recipients, meds, appointments, providers, conditions, or vital info even with a known row ID.
- [ ] Doctor's-brief CSV export includes each recipient's vital info (now grouped by recipient).
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build` pass in CI.

## Rollback

Restore from the preflight backup. Because the contract migration drops `VitalInfo.circleId`, there is no forward reverse-migration once new writes begin — roll back by restore, not by reverse SQL. Keep the pre-M1 backup for one week after cutover.
