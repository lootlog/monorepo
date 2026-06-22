-- Support item-name loot filters by covering the ItemSnapshot -> LootItem -> Loot
-- lookup without heap fetches for lootId.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LootItem_itemSnapshotId_lootId_idx"
ON "LootItem"("itemSnapshotId", "lootId");
