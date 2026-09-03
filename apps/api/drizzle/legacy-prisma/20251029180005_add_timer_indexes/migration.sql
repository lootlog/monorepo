-- CreateIndex
CREATE INDEX "Timer_maxSpawnTime_guildId_idx" ON "Timer"("maxSpawnTime", "guildId");

-- CreateIndex
CREATE INDEX "Timer_world_guildId_idx" ON "Timer"("world", "guildId");

-- CreateIndex
CREATE INDEX "Timer_createdById_idx" ON "Timer"("createdById");
