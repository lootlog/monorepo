-- Add additive scoring breakdown fields for event hero kill points
ALTER TABLE "EventKillPoint"
ADD COLUMN "groupBonusPoints" DOUBLE PRECISION,
ADD COLUMN "nightBonusPoints" DOUBLE PRECISION,
ADD COLUMN "pvpBonusPoints" DOUBLE PRECISION;
