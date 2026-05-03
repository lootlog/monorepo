-- AlterTable
ALTER TABLE "Timer" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Timer_guildId_world_deletedAt_maxSpawnTime_idx" ON "Timer"("guildId", "world", "deletedAt", "maxSpawnTime");
