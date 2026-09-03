-- Improve hot-path loot filters and kill-stat dashboard lookups.
-- CONCURRENTLY keeps these indexes from blocking writes during rollout.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ItemSnapshot_name_idx" ON "ItemSnapshot"("name");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "LootItem_hid_lootId_idx" ON "LootItem"("hid", "lootId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "NpcKillStats_guildId_world_npcType_idx" ON "NpcKillStats"("guildId", "world", "npcType");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "UserKillStats_userId_world_npcType_idx" ON "UserKillStats"("userId", "world", "npcType");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "GuildKillSummary_guildId_world_npcType_idx" ON "GuildKillSummary"("guildId", "world", "npcType");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "UserKillStatsBucket_userId_world_npcType_periodStart_idx" ON "UserKillStatsBucket"("userId", "world", "npcType", "periodStart");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "NpcKillStatsBucket_guildId_world_npcType_periodStart_idx" ON "NpcKillStatsBucket"("guildId", "world", "npcType", "periodStart");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "GuildKillSummaryBucket_guildId_world_npcType_periodStart_idx" ON "GuildKillSummaryBucket"("guildId", "world", "npcType", "periodStart");
