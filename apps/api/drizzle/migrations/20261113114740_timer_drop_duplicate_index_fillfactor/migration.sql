-- The migrator runs in a transaction, which does not support CONCURRENTLY.
-- Timer_guildId_world_deletedAt_maxSpawnTime_idx leads with the same guildId.
DROP INDEX "Timer_guildId_maxSpawnTime_idx";--> statement-breakpoint
-- Leave page room for updated tuple versions. Applies to new pages; existing
-- pages keep their layout until the table is rewritten.
ALTER TABLE "Timer" SET (fillfactor = 80);
