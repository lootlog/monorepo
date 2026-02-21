ALTER TABLE "Event"
ADD COLUMN "participationConfirmationMinutes" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "EventKillPoint"
ADD COLUMN "confirmationDeadlineAt" TIMESTAMP(3),
ADD COLUMN "confirmedAt" TIMESTAMP(3);

UPDATE "EventKillPoint"
SET "confirmedAt" = "createdAt"
WHERE "confirmedAt" IS NULL;

CREATE INDEX "EventKillPoint_memberId_confirmationDeadlineAt_confirmedAt_idx"
ON "EventKillPoint"("memberId", "confirmationDeadlineAt", "confirmedAt");
