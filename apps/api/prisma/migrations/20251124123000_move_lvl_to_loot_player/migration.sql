/*
  Move player level from snapshots to per-loot dynamic data.
*/

-- Add lvl to LootPlayer first so we can copy data
ALTER TABLE "LootPlayer" ADD COLUMN "lvl" INTEGER;

-- Backfill from snapshots
UPDATE "LootPlayer" lp
SET "lvl" = ps."lvl"
FROM "PlayerSnapshot" ps
WHERE ps."id" = lp."playerSnapshotId";

-- Drop column from PlayerSnapshot
ALTER TABLE "PlayerSnapshot" DROP COLUMN "lvl";
