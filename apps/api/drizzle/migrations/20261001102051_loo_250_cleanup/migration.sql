-- LOO-252: cleanup after the LOO-250 edition repair, which ran on production
-- on 2026-10-01. Drops the repair log, which ends the rollback of its runs,
-- and the unresolved notification selections it would have recorded.
DROP TABLE "LegacyRepairSnapshot", "LegacyRepairLink", "LegacyRepairEntry", "LegacyRepairRun", "NotificationRuleUnresolvedSelection";--> statement-breakpoint
-- Revisions without an edition are left only where the repair relinked every
-- loot to an edition revision. No loot reaches them and no writer can match
-- their hashes again; a linked one aborts the migration at SET NOT NULL below.
DELETE FROM "NpcSnapshot" WHERE "gameVersion" IS NULL AND NOT EXISTS (SELECT 1 FROM "LootNpc" WHERE "LootNpc"."npcSnapshotId" = "NpcSnapshot"."id");--> statement-breakpoint
DELETE FROM "ItemSnapshot" WHERE "gameVersion" IS NULL AND NOT EXISTS (SELECT 1 FROM "LootItem" WHERE "LootItem"."itemSnapshotId" = "ItemSnapshot"."id");--> statement-breakpoint
ALTER TABLE "NpcSnapshot" DROP COLUMN "world", ALTER COLUMN "gameVersion" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ItemSnapshot" ALTER COLUMN "gameVersion" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Loot" ALTER COLUMN "gameVersion" SET NOT NULL;
