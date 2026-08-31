-- DropIndex
DROP INDEX "public"."Timer_maxSpawnTime_guildId_idx";

-- CreateIndex
CREATE INDEX "Timer_guildId_maxSpawnTime_idx" ON "Timer"("guildId", "maxSpawnTime");
