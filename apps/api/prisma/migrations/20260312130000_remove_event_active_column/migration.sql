DROP INDEX IF EXISTS "Event_guildId_active_idx";

ALTER TABLE "Event"
DROP COLUMN "active";

CREATE INDEX "Event_guildId_startsAt_endsAt_idx"
ON "Event"("guildId", "startsAt", "endsAt");
