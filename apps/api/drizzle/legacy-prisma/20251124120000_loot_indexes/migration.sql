-- CreateIndex
CREATE INDEX "PlayerSnapshot_name_idx" ON "PlayerSnapshot"("name");

-- CreateIndex
CREATE INDEX "NpcSnapshot_name_idx" ON "NpcSnapshot"("name");

-- CreateIndex
CREATE INDEX "NpcSnapshot_type_lvl_idx" ON "NpcSnapshot"("type", "lvl");

-- CreateIndex
CREATE INDEX "LootSubmission_guildId_lootId_idx" ON "LootSubmission"("guildId", "lootId");
