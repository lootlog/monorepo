/*
  Warnings:

  - You are about to drop the column `config` on the `UserLootlogConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserLootlogConfig" DROP COLUMN "config";

-- CreateTable
CREATE TABLE "UserLootlogPlayerConfig" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "userLootlogConfigId" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLootlogPlayerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLootlogPlayerConfig_userId_guildId_key" ON "UserLootlogPlayerConfig"("userId", "guildId");

-- AddForeignKey
ALTER TABLE "UserLootlogPlayerConfig" ADD CONSTRAINT "UserLootlogPlayerConfig_accountId_characterId_fkey" FOREIGN KEY ("accountId", "characterId") REFERENCES "Player"("accountId", "characterId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLootlogPlayerConfig" ADD CONSTRAINT "UserLootlogPlayerConfig_userLootlogConfigId_fkey" FOREIGN KEY ("userLootlogConfigId") REFERENCES "UserLootlogConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
