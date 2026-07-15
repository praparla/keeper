-- M1 backfill + contract. Run only after the expand migration and a verified backup.
-- VitalInfo moves from circle-scoped to recipient-scoped. v1 tracked one implicit
-- person per circle, so every existing row attaches to a single placeholder
-- CareRecipient ("Parent") created per circle that has vital info.

-- 1. One placeholder recipient per circle that still has unscoped vital info.
INSERT INTO "CareRecipient" ("id", "circleId", "name", "relationship", "updatedAt")
SELECT 'm1-parent-' || MD5(vi."circleId"), vi."circleId", 'Parent', 'Parent', CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "circleId" FROM "VitalInfo" WHERE "recipientId" IS NULL) vi
ON CONFLICT ("id") DO NOTHING;

-- 2. Attach each unscoped vital-info row to its circle's placeholder recipient.
UPDATE "VitalInfo"
SET "recipientId" = 'm1-parent-' || MD5("circleId")
WHERE "recipientId" IS NULL;

-- 3. Verify: abort the whole migration if any row is still unscoped.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "VitalInfo" WHERE "recipientId" IS NULL) THEN
    RAISE EXCEPTION 'M1 abort: VitalInfo.recipientId backfill incomplete';
  END IF;
END $$;

-- 4. Contract: drop the old circle-scoped shape.
ALTER TABLE "VitalInfo" DROP CONSTRAINT "VitalInfo_circleId_fkey";
DROP INDEX "VitalInfo_circleId_category_key";
DROP INDEX "VitalInfo_circleId_idx";
ALTER TABLE "VitalInfo" DROP COLUMN "circleId";

-- 5. Enforce the recipient-scoped shape.
ALTER TABLE "VitalInfo" ALTER COLUMN "recipientId" SET NOT NULL;
CREATE UNIQUE INDEX "VitalInfo_recipientId_category_key" ON "VitalInfo"("recipientId", "category");
CREATE INDEX "VitalInfo_recipientId_idx" ON "VitalInfo"("recipientId");
ALTER TABLE "VitalInfo" ADD CONSTRAINT "VitalInfo_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CareRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
