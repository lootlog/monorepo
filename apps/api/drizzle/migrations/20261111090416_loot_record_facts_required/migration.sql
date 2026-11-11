-- Requires the backfill to have completed: this migration fails, and the
-- deploy stops, while any record still misses its facts. That is the point —
-- the page selection filters on these columns, so a null would silently drop
-- the record from a filtered page instead of showing a loot the Organization
-- owns.
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
      SELECT 1 FROM pg_index WHERE "indisvalid" AND "indexrelid" = to_regclass('"OrganizationLootRecord_guildId_archivedAt_world_lootId_idx"')
    )
  THEN
    RAISE EXCEPTION 'Build OrganizationLootRecord_guildId_archivedAt_world_lootId_idx concurrently first; see apps/api/drizzle/README.md';
  END IF;
END $$;--> statement-breakpoint
-- Statements below lock the table until commit; fail fast instead of queueing
-- loot writes behind a long-running reader.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
-- A plain SET NOT NULL scans the whole table under ACCESS EXCLUSIVE and would
-- block loot submissions for the duration. A CHECK added NOT VALID is instant,
-- VALIDATE CONSTRAINT scans under SHARE UPDATE EXCLUSIVE which lets reads and
-- writes through, and SET NOT NULL then proves itself from the validated
-- constraint without a second scan.
ALTER TABLE "OrganizationLootRecord" ADD CONSTRAINT "OrganizationLootRecord_lootFacts_present" CHECK ("lootWorld" IS NOT NULL AND "lootCreatedAt" IS NOT NULL) NOT VALID;--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" VALIDATE CONSTRAINT "OrganizationLootRecord_lootFacts_present";--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" ALTER COLUMN "lootWorld" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" ALTER COLUMN "lootCreatedAt" SET NOT NULL;--> statement-breakpoint
-- Redundant once the columns are NOT NULL.
ALTER TABLE "OrganizationLootRecord" DROP CONSTRAINT "OrganizationLootRecord_lootFacts_present";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "OrganizationLootRecord_guildId_archivedAt_world_lootId_idx" ON "OrganizationLootRecord" ("guildId","archivedAt","lootWorld","lootId" DESC NULLS LAST);--> statement-breakpoint
-- Dropped last, and only after the replacement exists. The planner never chose
-- it (idx_scan = 0 through a full production evening, 839 MB on disk): it
-- preferred the unique "OrganizationLootRecord_guildId_lootId_key" for the
-- backward scan, which stays.
DROP INDEX IF EXISTS "OrganizationLootRecord_guildId_archivedAt_lootId_idx";
