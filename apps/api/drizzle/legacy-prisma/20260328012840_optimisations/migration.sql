-- CreateIndex
CREATE INDEX "LootComment_lootId_guildId_idx" ON "LootComment"("lootId", "guildId");

-- CreateIndex
CREATE INDEX "Member_userId_guildId_active_lastDiscordSyncAt_idx" ON "Member"("userId", "guildId", "active", "lastDiscordSyncAt");
