/*
  Warnings:

  - You are about to drop the `UserLootlogConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserLootlogConfig" DROP CONSTRAINT "UserLootlogConfig_userId_fkey";

-- DropTable
DROP TABLE "UserLootlogConfig";

-- CreateTable
CREATE TABLE "PlayerLootlogConfig" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "canAddLoot" BOOLEAN NOT NULL DEFAULT true,
    "canAddTimer" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerLootlogConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerLootlogConfig_userId_playerId_guildId_key" ON "PlayerLootlogConfig"("userId", "playerId", "guildId");

-- AddForeignKey
ALTER TABLE "PlayerLootlogConfig" ADD CONSTRAINT "PlayerLootlogConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
