-- The loot list's NPC filter reads the lootIds of the chosen NPCs. With
-- "npcSnapshotId" alone every one of those rows is a heap fetch: 77k blocks for
-- the most looted NPC. Carrying "lootId" makes it an index-only scan.
--
-- The migrator runs in a transaction, which does not support CONCURRENTLY, and
-- a plain build on this table blocks loot submissions for the whole build.
-- Build the index first on a populated database (see drizzle/README.md); the
-- guard below stops the deploy otherwise, and CREATE INDEX IF NOT EXISTS then
-- becomes a no-op.
DO $$
BEGIN
  IF (SELECT "reltuples" FROM pg_class WHERE "oid" = '"LootNpc"'::regclass) > 100000
    AND NOT EXISTS (
      SELECT 1 FROM pg_index WHERE "indisvalid" AND "indexrelid" = to_regclass('"LootNpc_npcSnapshotId_lootId_idx"')
    )
  THEN
    RAISE EXCEPTION 'Build LootNpc_npcSnapshotId_lootId_idx concurrently first; see apps/api/drizzle/README.md';
  END IF;
END $$;--> statement-breakpoint
-- DROP INDEX locks the table until commit; fail fast instead of queueing loot
-- writes behind a long-running reader.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "LootNpc_npcSnapshotId_lootId_idx" ON "LootNpc" ("npcSnapshotId","lootId");--> statement-breakpoint
-- Dropped only after the replacement exists; its single column is the new
-- index's prefix.
DROP INDEX IF EXISTS "LootNpc_npcSnapshotId_idx";
