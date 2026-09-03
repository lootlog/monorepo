-- Support item-name filters after resolving ItemSnapshot.name to ids.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LootItem_lootId_itemSnapshotId_idx"
ON "LootItem"("lootId", "itemSnapshotId");
