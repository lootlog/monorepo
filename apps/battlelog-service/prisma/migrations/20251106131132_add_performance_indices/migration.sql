-- CreateIndex
CREATE INDEX "battle_warriors_originalId_idx" ON "battle_warriors"("originalId");

-- CreateIndex
CREATE INDEX "battle_warriors_name_idx" ON "battle_warriors"("name");

-- CreateIndex
CREATE INDEX "battle_warriors_battleId_team_idx" ON "battle_warriors"("battleId", "team");

-- CreateIndex
CREATE INDEX "battles_userId_createdAt_idx" ON "battles"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "battles_world_createdAt_idx" ON "battles"("world", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "battles_userId_world_createdAt_idx" ON "battles"("userId", "world", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "battles_characterId_createdAt_idx" ON "battles"("characterId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "battles_public_createdAt_idx" ON "battles"("public", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "battles_id_idx" ON "battles"("id");
