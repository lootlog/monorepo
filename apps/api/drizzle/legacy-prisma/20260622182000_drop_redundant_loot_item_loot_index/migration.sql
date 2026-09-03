-- The composite lootId/itemSnapshotId index keeps lootId as the leftmost column
-- and replaces the old single-column lookup without blocking writes.
DROP INDEX CONCURRENTLY IF EXISTS "LootItem_lootId_idx";
