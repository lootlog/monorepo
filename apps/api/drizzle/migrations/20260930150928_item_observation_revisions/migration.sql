-- Drain pre-revision API and seed writers before this transactional migration:
-- their ON CONFLICT (itemId, statsHash) target is intentionally removed.
-- Existing snapshots and LootItem links remain untouched. A NULL snapshotHash
-- marks a row whose name and icon came from its first writer (LOO-38).
DROP INDEX "ItemSnapshot_itemId_statsHash_key";--> statement-breakpoint
ALTER TABLE "ItemSnapshot" ADD COLUMN "gameVersion" "GameVersion";--> statement-breakpoint
ALTER TABLE "ItemSnapshot" ADD COLUMN "snapshotHash" text;--> statement-breakpoint
ALTER TABLE "LootItem" ADD COLUMN "instanceStat" text;--> statement-breakpoint
CREATE UNIQUE INDEX "ItemSnapshot_itemId_snapshotHash_key" ON "ItemSnapshot" ("itemId","snapshotHash");