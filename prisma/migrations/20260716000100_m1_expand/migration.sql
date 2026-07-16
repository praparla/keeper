-- M1 expand: additive only. New care-model tables, Task extensions, and a
-- nullable VitalInfo.recipientId. The recipient backfill + VitalInfo contract
-- (NOT NULL, drop circleId) land in the following migration after a verified backup.

CREATE TYPE "ResidenceType" AS ENUM ('HOUSE', 'CONDO', 'APARTMENT', 'FACILITY');
CREATE TYPE "FactSource" AS ENUM ('ONBOARDING', 'MANUAL', 'DISMISSAL', 'DEFAULT');
CREATE TYPE "ApptStatus" AS ENUM ('SCHEDULED', 'DONE', 'CANCELLED');
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'DAYS', 'WEEKLY', 'MONTHLY', 'YEARLY', 'SEASONAL');

CREATE TABLE "CareRecipient" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationship" TEXT,
  "birthYear" INTEGER,
  "zip" TEXT,
  "climateRegion" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
  "residenceType" "ResidenceType",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileFact" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "source" "FactSource" NOT NULL DEFAULT 'ONBOARDING',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileFact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Provider" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "specialty" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Condition" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Medication" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dose" TEXT,
  "schedule" TEXT,
  "pharmacy" TEXT,
  "prescriberId" TEXT,
  "refillIntervalDays" INTEGER,
  "lastFilledAt" TIMESTAMP(3),
  "defaultAssigneeId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "providerId" TEXT,
  "title" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "attendeeId" TEXT,
  "notes" TEXT,
  "outcome" TEXT,
  "status" "ApptStatus" NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- Task extensions (all nullable or defaulted → safe against existing rows).
ALTER TABLE "Task"
  ADD COLUMN "recipientId" TEXT,
  ADD COLUMN "priority" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "recurEveryDays" INTEGER,
  ADD COLUMN "windowStartMonth" INTEGER,
  ADD COLUMN "windowStartDay" INTEGER,
  ADD COLUMN "windowEndMonth" INTEGER,
  ADD COLUMN "windowEndDay" INTEGER,
  ADD COLUMN "suggestionId" TEXT,
  ADD COLUMN "medicationId" TEXT,
  ADD COLUMN "templateSlug" TEXT;

-- VitalInfo gains recipientId nullable now; contract migration enforces + drops circleId.
ALTER TABLE "VitalInfo" ADD COLUMN "recipientId" TEXT;

-- Indexes for new tables.
CREATE INDEX "CareRecipient_circleId_idx" ON "CareRecipient"("circleId");
CREATE UNIQUE INDEX "ProfileFact_recipientId_key_key" ON "ProfileFact"("recipientId", "key");
CREATE INDEX "Provider_recipientId_idx" ON "Provider"("recipientId");
CREATE INDEX "Condition_recipientId_idx" ON "Condition"("recipientId");
CREATE INDEX "Medication_recipientId_idx" ON "Medication"("recipientId");
CREATE INDEX "Medication_prescriberId_idx" ON "Medication"("prescriberId");
CREATE INDEX "Appointment_recipientId_startsAt_idx" ON "Appointment"("recipientId", "startsAt");
CREATE INDEX "Appointment_providerId_idx" ON "Appointment"("providerId");
CREATE UNIQUE INDEX "Task_suggestionId_key" ON "Task"("suggestionId");
CREATE INDEX "Task_recipientId_idx" ON "Task"("recipientId");
CREATE INDEX "Task_medicationId_idx" ON "Task"("medicationId");

-- Foreign keys for new tables and new Task columns (columns nullable → no backfill needed).
ALTER TABLE "CareRecipient" ADD CONSTRAINT "CareRecipient_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "CareCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileFact" ADD CONSTRAINT "ProfileFact_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CareRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CareRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CareRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CareRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_prescriberId_fkey" FOREIGN KEY ("prescriberId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_defaultAssigneeId_fkey" FOREIGN KEY ("defaultAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CareRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CareRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
