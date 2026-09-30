-- The migrator runs in a transaction, which does not support CONCURRENTLY.
-- Timer_pkey is a unique btree on the same (guildId, world, timerKey) columns.
DROP INDEX "Timer_guildId_world_timerKey_idx";
