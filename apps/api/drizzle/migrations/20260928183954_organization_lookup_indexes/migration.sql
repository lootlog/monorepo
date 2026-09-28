-- The migrator runs in a transaction, which does not support CONCURRENTLY.
CREATE INDEX "LootlogConfigNpc_lootlogConfigId_idx" ON "LootlogConfigNpc" ("lootlogConfigId");--> statement-breakpoint
CREATE INDEX "Role_guildId_idx" ON "Role" ("guildId");--> statement-breakpoint
-- Take the stronger DROP INDEX lock only after both index builds finish.
DROP INDEX "Role_id_guildId_idx";
