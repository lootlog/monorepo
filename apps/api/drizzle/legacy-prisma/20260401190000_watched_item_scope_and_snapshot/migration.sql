ALTER TABLE "WatchedItem"
ADD COLUMN "itemIcon" TEXT NOT NULL DEFAULT '',
ADD COLUMN "itemName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "world" TEXT NOT NULL DEFAULT '';

ALTER TABLE "WatchedItem"
ALTER COLUMN "itemIcon" DROP DEFAULT,
ALTER COLUMN "itemName" DROP DEFAULT,
ALTER COLUMN "world" DROP DEFAULT;

DROP INDEX IF EXISTS "WatchedItem_userId_itemId_key";
CREATE UNIQUE INDEX "WatchedItem_userId_itemId_world_key"
ON "WatchedItem"("userId", "itemId", "world");

DROP INDEX IF EXISTS "WatchedItem_itemId_enabled_idx";
CREATE INDEX "WatchedItem_itemId_world_enabled_idx"
ON "WatchedItem"("itemId", "world", "enabled");
