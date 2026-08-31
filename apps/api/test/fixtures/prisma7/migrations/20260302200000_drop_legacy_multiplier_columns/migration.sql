ALTER TABLE "Event"
DROP COLUMN IF EXISTS "timeOfDayMultipliers",
DROP COLUMN IF EXISTS "trackersMultipliers",
DROP COLUMN IF EXISTS "mapsCountMultipliers",
DROP COLUMN IF EXISTS "trackingDurationMultipliers";

ALTER TABLE "EventKillPoint"
DROP COLUMN IF EXISTS "appliedMultiplier",
DROP COLUMN IF EXISTS "timeMultiplier",
DROP COLUMN IF EXISTS "trackersMultiplier",
DROP COLUMN IF EXISTS "mapsMultiplier",
DROP COLUMN IF EXISTS "trackingDurationMultiplier";
