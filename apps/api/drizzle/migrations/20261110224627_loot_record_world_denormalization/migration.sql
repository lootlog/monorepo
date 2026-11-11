-- Both columns are nullable, so these are metadata-only and take no rewrite of
-- the 15.7M existing rows. The loot list keeps joining Loot until the backfill
-- has filled them, so a null here is never read as "no world".
ALTER TABLE "OrganizationLootRecord" ADD COLUMN "lootWorld" text;--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" ADD COLUMN "lootCreatedAt" timestamp(3);--> statement-breakpoint
-- The migrator runs in a transaction, which does not support CONCURRENTLY, and
-- a plain build on this table blocks loot submissions for the whole build. On
-- an existing deployment create it by hand first:
--   CREATE INDEX CONCURRENTLY "OrganizationLootRecord_guildId_archivedAt_world_lootId_idx"
--     ON "OrganizationLootRecord" ("guildId","archivedAt","lootWorld","lootId" DESC NULLS LAST);
-- IF NOT EXISTS then makes this statement a no-op; on an empty or small
-- database it simply builds here.
CREATE INDEX IF NOT EXISTS "OrganizationLootRecord_guildId_archivedAt_world_lootId_idx" ON "OrganizationLootRecord" ("guildId","archivedAt","lootWorld","lootId" DESC NULLS LAST);--> statement-breakpoint
-- Dropped last, and only after the replacement exists. The planner never chose
-- it (idx_scan = 0 through a full production evening, 839 MB on disk): it
-- preferred the unique "OrganizationLootRecord_guildId_lootId_key" for the
-- backward scan, which stays.
DROP INDEX IF EXISTS "OrganizationLootRecord_guildId_archivedAt_lootId_idx";
