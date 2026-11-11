-- Both columns are nullable, so these are metadata-only and take no rewrite of
-- the 15.7M existing rows. The loot list keeps joining Loot until the backfill
-- has filled them, so a null here is never read as "no world".
--
-- No index on the new columns yet: the backfill updates every row, and an
-- index on a column that changes forces a non-HOT update that rewrites every
-- index of the table (measured: 3.2 GB -> 5.6 GB). The index is built by the
-- next migration, after the backfill.
ALTER TABLE "OrganizationLootRecord" ADD COLUMN "lootWorld" text;--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" ADD COLUMN "lootCreatedAt" timestamp(3);
