-- The composite itemSnapshotId/lootId index keeps itemSnapshotId as the leftmost
-- column and replaces the old single-column lookup without blocking writes.
DROP INDEX CONCURRENTLY IF EXISTS "LootItem_itemSnapshotId_idx";
