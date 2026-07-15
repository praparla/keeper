-- M0 backfill + contract. Run only after the expand migration and a verified backup.
INSERT INTO "CareCircle" ("id", "name", "updatedAt")
VALUES ('m0-family-circle', 'Family', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

WITH ranked_users AS (
  SELECT "id", "email", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS row_number,
    BOOL_OR("email" = 'pranava@family.dev') OVER () AS has_pranava
  FROM "User"
)
INSERT INTO "Membership" ("id", "userId", "circleId", "role")
SELECT 'm0-' || MD5("id"), "id", 'm0-family-circle',
  CASE
    WHEN "email" = 'pranava@family.dev' OR (NOT has_pranava AND row_number = 1)
      THEN 'OWNER'::"CircleRole"
    ELSE 'MEMBER'::"CircleRole"
  END
FROM ranked_users
ON CONFLICT ("userId", "circleId") DO NOTHING;

UPDATE "Task" SET "circleId" = 'm0-family-circle' WHERE "circleId" IS NULL;
UPDATE "VitalInfo" SET "circleId" = 'm0-family-circle' WHERE "circleId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Task" WHERE "circleId" IS NULL) THEN
    RAISE EXCEPTION 'M0 abort: Task.circleId backfill incomplete';
  END IF;
  IF EXISTS (SELECT 1 FROM "VitalInfo" WHERE "circleId" IS NULL) THEN
    RAISE EXCEPTION 'M0 abort: VitalInfo.circleId backfill incomplete';
  END IF;
END $$;

ALTER TABLE "Task" ALTER COLUMN "circleId" SET NOT NULL;
ALTER TABLE "VitalInfo" ALTER COLUMN "circleId" SET NOT NULL;
ALTER TABLE "Task" ADD CONSTRAINT "Task_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "CareCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VitalInfo" ADD CONSTRAINT "VitalInfo_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "CareCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Task_circleId_status_dueDate_idx" ON "Task"("circleId", "status", "dueDate");
CREATE INDEX "VitalInfo_circleId_idx" ON "VitalInfo"("circleId");
CREATE UNIQUE INDEX "VitalInfo_circleId_category_key" ON "VitalInfo"("circleId", "category");
