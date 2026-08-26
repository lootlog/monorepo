-- Contract only after the backfill has proved every persisted row is usable.
ALTER TABLE "Reservation"
ALTER COLUMN "spotId" SET NOT NULL,
ALTER COLUMN "spotName" SET NOT NULL,
ALTER COLUMN "startsAt" SET NOT NULL,
ALTER COLUMN "endsAt" SET NOT NULL,
ALTER COLUMN "authorDisplayName" SET NOT NULL,
ALTER COLUMN "reservationId" DROP NOT NULL,
ALTER COLUMN "createdDate" DROP NOT NULL,
ALTER COLUMN "fromDate" DROP NOT NULL,
ALTER COLUMN "toDate" DROP NOT NULL,
ALTER COLUMN "createdBy" DROP NOT NULL;

ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_valid_time_range_check"
CHECK ("endsAt" > "startsAt"),
ADD CONSTRAINT "Reservation_reminder_minutes_check"
CHECK ("reminderMinutesBefore" IS NULL OR "reminderMinutesBefore" IN (0, 5, 15, 30));

DROP INDEX IF EXISTS "Reservation_guildId_reservationId_idx";
DROP INDEX IF EXISTS "Reservation_guildId_toDate_idx";

CREATE INDEX "Reservation_guildId_spotId_startsAt_endsAt_idx"
ON "Reservation"("guildId", "spotId", "startsAt", "endsAt");

CREATE INDEX "Reservation_guildId_endsAt_idx"
ON "Reservation"("guildId", "endsAt");

CREATE INDEX "Reservation_createdByUserId_endsAt_idx"
ON "Reservation"("createdByUserId", "endsAt");
