ALTER TABLE "EventKillPoint"
ADD COLUMN "manualAdjustmentPoints" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "EventRanking"
ADD COLUMN "manualAdjustmentPoints" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "EventPointsEditHistory"
ADD COLUMN "comment" TEXT;
