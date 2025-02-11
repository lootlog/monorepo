/*
  Warnings:

  - A unique constraint covering the columns `[userId,playerId]` on the table `UserLootlogPlayerConfig` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserLootlogPlayerConfig_userId_guildId_key";

-- CreateIndex
CREATE UNIQUE INDEX "UserLootlogPlayerConfig_userId_playerId_key" ON "UserLootlogPlayerConfig"("userId", "playerId");
