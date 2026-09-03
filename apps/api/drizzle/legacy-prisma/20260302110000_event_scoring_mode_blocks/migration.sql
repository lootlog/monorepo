DO $$
BEGIN
  CREATE TYPE "EventScoringMode" AS ENUM ('SIMPLE', 'ADVANCED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "scoringMode" "EventScoringMode" NOT NULL DEFAULT 'SIMPLE';

ALTER TABLE "Event"
ALTER COLUMN "scoringRules" DROP NOT NULL,
ALTER COLUMN "scoringRules" DROP DEFAULT;

UPDATE "Event"
SET
  "scoringMode" = 'SIMPLE',
  "scoringRules" = NULL;
