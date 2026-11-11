DROP INDEX "LootNpc_lootId_idx";--> statement-breakpoint
DROP INDEX "LootNpc_npcSnapshotId_idx";--> statement-breakpoint
DROP INDEX "OrganizationLootRecord_guildId_archivedAt_lootId_idx";--> statement-breakpoint
CREATE INDEX "LootNpc_lootId_npcSnapshotId_idx" ON "LootNpc" ("lootId","npcSnapshotId");--> statement-breakpoint
CREATE INDEX "LootNpc_npcSnapshotId_lootId_idx" ON "LootNpc" ("npcSnapshotId","lootId");--> statement-breakpoint
CREATE INDEX "OrganizationLootRecord_guildId_lootId_id_active_idx" ON "OrganizationLootRecord" ("guildId","lootId","id") WHERE "archivedAt" IS NULL;