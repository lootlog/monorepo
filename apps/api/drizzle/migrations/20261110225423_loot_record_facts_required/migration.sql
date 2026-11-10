-- Requires the backfill to have completed: this migration fails, and the
-- deploy stops, while any record still misses its facts. That is the point —
-- the page selection filters on these columns, so a null would silently drop
-- the record from a filtered page instead of showing a loot the Organization
-- owns.
--
-- A plain SET NOT NULL scans the whole 15.7M-row table under ACCESS EXCLUSIVE
-- and would block loot submissions for the duration. A CHECK added NOT VALID
-- is instant, VALIDATE CONSTRAINT scans under SHARE UPDATE EXCLUSIVE which
-- lets reads and writes through, and SET NOT NULL then proves itself from the
-- validated constraint without a second scan.
ALTER TABLE "OrganizationLootRecord" ADD CONSTRAINT "OrganizationLootRecord_lootFacts_present" CHECK ("lootWorld" IS NOT NULL AND "lootCreatedAt" IS NOT NULL) NOT VALID;--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" VALIDATE CONSTRAINT "OrganizationLootRecord_lootFacts_present";--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" ALTER COLUMN "lootWorld" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "OrganizationLootRecord" ALTER COLUMN "lootCreatedAt" SET NOT NULL;--> statement-breakpoint
-- Redundant once the columns are NOT NULL.
ALTER TABLE "OrganizationLootRecord" DROP CONSTRAINT "OrganizationLootRecord_lootFacts_present";
