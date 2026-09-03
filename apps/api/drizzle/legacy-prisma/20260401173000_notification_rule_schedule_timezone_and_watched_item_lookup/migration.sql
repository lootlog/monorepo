ALTER TABLE "NotificationRule"
ADD COLUMN "scheduleTimezone" TEXT;

UPDATE "NotificationRule"
SET "scheduleTimezone" = 'Europe/Warsaw'
WHERE "triggerType" = 'SCHEDULED_MESSAGE'
  AND "ownerType" = 'GUILD'
  AND "scheduleTimezone" IS NULL;

CREATE INDEX "WatchedItem_itemId_enabled_idx"
ON "WatchedItem"("itemId", "enabled");
