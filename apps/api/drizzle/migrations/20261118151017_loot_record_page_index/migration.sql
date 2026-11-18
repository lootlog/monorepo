-- Requires the backfill to have completed: the loot list reads the rarity
-- mask, the NPC type mask and the NPC visibility from the record, and a null
-- hides the loot from everyone but the owner.
--
-- The migrator runs in one transaction, so nothing here may scan or build on a
-- populated table: every lock taken below is held until commit, and a scan
-- under ACCESS EXCLUSIVE blocks loot submissions and reads for its duration.
-- On a populated database the two slow steps therefore run beforehand, outside
-- the migrator (see drizzle/README.md), and this migration refuses to run
-- until both are done:
--
-- - "OrganizationLootRecord_listFacts_present" is added NOT VALID and then
--   validated in its own transaction, which scans under SHARE UPDATE EXCLUSIVE
--   and lets reads and writes through. It also proves the backfill finished.
-- - the index is built with CREATE INDEX CONCURRENTLY.
--
-- A small database (a new environment, a test) takes both inline.
DO $$
DECLARE
  populated boolean := (SELECT "reltuples" FROM pg_class WHERE "oid" = '"OrganizationLootRecord"'::regclass) > 100000;
  validated boolean := EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE "conrelid" = '"OrganizationLootRecord"'::regclass
      AND "conname" = 'OrganizationLootRecord_listFacts_present'
      AND "convalidated"
  );
BEGIN
  IF populated AND NOT validated THEN
    RAISE EXCEPTION 'Add and validate OrganizationLootRecord_listFacts_present first; see apps/api/drizzle/README.md';
  END IF;

  IF populated AND NOT EXISTS (
    SELECT 1 FROM pg_index WHERE "indisvalid" AND "indexrelid" = to_regclass('"OrganizationLootRecord_guildId_world_lootId_page_active_idx"')
  ) THEN
    RAISE EXCEPTION 'Build OrganizationLootRecord_guildId_world_lootId_page_active_idx concurrently first; see apps/api/drizzle/README.md';
  END IF;

  IF NOT validated THEN
    ALTER TABLE "OrganizationLootRecord" DROP CONSTRAINT IF EXISTS "OrganizationLootRecord_listFacts_present";
    ALTER TABLE "OrganizationLootRecord" ADD CONSTRAINT "OrganizationLootRecord_listFacts_present" CHECK ("lootRarityMask" IS NOT NULL AND "npcTypeMask" IS NOT NULL AND "npcVisibility" IS NOT NULL);
  END IF;
END $$;--> statement-breakpoint
-- Statements below lock the table until commit; fail fast instead of queueing
-- loot writes behind a long-running reader.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
-- A plain SET NOT NULL scans the whole table under ACCESS EXCLUSIVE. With the
-- validated constraint PostgreSQL proves each column from it and skips the
-- scan, so these are metadata-only.
ALTER TABLE "OrganizationLootRecord" ALTER COLUMN "lootRarityMask" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" ALTER COLUMN "npcTypeMask" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" ALTER COLUMN "npcVisibility" SET NOT NULL;--> statement-breakpoint
-- Redundant once the columns are NOT NULL.
ALTER TABLE "OrganizationLootRecord" DROP CONSTRAINT "OrganizationLootRecord_listFacts_present";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "OrganizationLootRecord_guildId_world_lootId_page_active_idx" ON "OrganizationLootRecord" ("guildId","lootWorld","lootId" DESC,"lootRarityMask","npcTypeMask","npcVisibility") WHERE "archivedAt" IS NULL;--> statement-breakpoint
-- Dropped only after the replacement exists: the new index has the same
-- leading keys and serves every query this one did.
DROP INDEX IF EXISTS "OrganizationLootRecord_guildId_world_lootId_active_idx";
