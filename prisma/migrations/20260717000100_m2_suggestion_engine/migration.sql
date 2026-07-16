-- M2 suggestion engine: additive only. New template/suggestion/suppression tables,
-- a JobRun observability table, and the Task→Suggestion provenance FK (the
-- Task.suggestionId column already exists from the M1 expand migration).

CREATE TYPE "TemplateCategory" AS ENUM ('HOME_SEASONAL', 'HOME_SAFETY', 'MEDICAL_ADMIN', 'VEHICLE', 'FINANCIAL_ADMIN');
CREATE TYPE "TriggerType" AS ENUM ('SEASONAL_WINDOW', 'FIXED_DATE', 'INTERVAL', 'ONE_TIME_AGE', 'WEATHER');
CREATE TYPE "IntervalAnchor" AS ENUM ('ASSUME_DUE', 'START_FRESH');
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'SNOOZED', 'DISMISSED', 'EXPIRED');
CREATE TYPE "DismissReason" AS ENUM ('NOT_APPLICABLE', 'SELF_HANDLED', 'NOT_NOW');

CREATE TABLE "SuggestionTemplate" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reasonTemplate" TEXT NOT NULL,
  "category" "TemplateCategory" NOT NULL,
  "triggerType" "TriggerType" NOT NULL,
  "windowStartMonth" INTEGER,
  "windowStartDay" INTEGER,
  "windowEndMonth" INTEGER,
  "windowEndDay" INTEGER,
  "intervalDays" INTEGER,
  "intervalAnchor" "IntervalAnchor",
  "leadDays" INTEGER NOT NULL DEFAULT 14,
  "minAge" INTEGER,
  "requiresFacts" JSONB,
  "climateSensitive" BOOLEAN NOT NULL DEFAULT false,
  "defaultTaskType" "TaskType" NOT NULL DEFAULT 'Household',
  "defaultRecurrence" "Recurrence" NOT NULL DEFAULT 'NONE',
  "sourceUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "catalogVersion" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "SuggestionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Suggestion" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "recipientId" TEXT,
  "templateId" TEXT,
  "cycleKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3),
  "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "snoozedUntil" TIMESTAMP(3),
  "dismissReason" "DismissReason",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuggestionSuppression" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "templateSlug" TEXT NOT NULL,
  "reason" "DismissReason" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuggestionSuppression_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobRun" (
  "id" TEXT NOT NULL,
  "job" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "ok" BOOLEAN,
  "counts" JSONB,
  "error" TEXT,
  CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SuggestionTemplate_slug_key" ON "SuggestionTemplate"("slug");
CREATE UNIQUE INDEX "Suggestion_templateId_cycleKey_key" ON "Suggestion"("templateId", "cycleKey");
CREATE INDEX "Suggestion_circleId_status_idx" ON "Suggestion"("circleId", "status");
CREATE UNIQUE INDEX "SuggestionSuppression_recipientId_templateSlug_key" ON "SuggestionSuppression"("recipientId", "templateSlug");
CREATE INDEX "JobRun_job_startedAt_idx" ON "JobRun"("job", "startedAt");

ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "CareCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CareRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SuggestionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SuggestionSuppression" ADD CONSTRAINT "SuggestionSuppression_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CareRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
