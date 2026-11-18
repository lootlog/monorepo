-- The columns are nullable, so these are metadata-only and take no rewrite of
-- the existing rows. The API fills them on every record it writes from here
-- on; the loot list keeps reading LootItem and LootNpc until the backfill has
-- filled the rest (see drizzle/README.md).
--
-- No index on the new columns yet: the backfill updates every row, and an
-- index on a column that changes forces a non-HOT update that rewrites every
-- index of the table.
ALTER TABLE "OrganizationLootRecord" ADD COLUMN "lootRarityMask" smallint;--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" ADD COLUMN "npcTypeMask" smallint;--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" ADD COLUMN "npcVisibility" int4multirange;
