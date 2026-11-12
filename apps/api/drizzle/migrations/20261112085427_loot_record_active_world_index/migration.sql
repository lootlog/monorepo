-- The loot page orders by "lootId" DESC. The index this replaces could not
-- produce that order: "archivedAt" IS NULL on a key column is not an equality
-- for ordering, and its NULLS LAST did not match DESC. The planner therefore
-- read the Organization's whole world history and sorted it for every page.
--
-- The migrator runs in a transaction, which does not support CONCURRENTLY, and
-- a plain build on this table blocks loot submissions for the whole build.
-- Build the index first on a populated database (see drizzle/README.md); the
-- guard below stops the deploy otherwise, and CREATE INDEX IF NOT EXISTS then
-- becomes a no-op.
DO $$
BEGIN
  IF (SELECT "reltuples" FROM pg_class WHERE "oid" = '"OrganizationLootRecord"'::regclass) > 100000
    AND NOT EXISTS (
      SELECT 1 FROM pg_index WHERE "indisvalid" AND "indexrelid" = to_regclass('"OrganizationLootRecord_guildId_world_lootId_active_idx"')
    )
  THEN
    RAISE EXCEPTION 'Build OrganizationLootRecord_guildId_world_lootId_active_idx concurrently first; see apps/api/drizzle/README.md';
  END IF;
END $$;--> statement-breakpoint
-- DROP INDEX locks the table until commit; fail fast instead of queueing loot
-- writes behind a long-running reader.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "OrganizationLootRecord_guildId_world_lootId_active_idx" ON "OrganizationLootRecord" ("guildId","lootWorld","lootId" DESC) WHERE "archivedAt" IS NULL;--> statement-breakpoint
-- Dropped only after the replacement exists.
DROP INDEX IF EXISTS "OrganizationLootRecord_guildId_archivedAt_world_lootId_idx";
