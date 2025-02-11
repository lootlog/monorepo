/*
  Warnings:

  - You are about to drop the `UserLootlogPlayerConfig` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `guildId` to the `UserLootlogConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerId` to the `UserLootlogConfig` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserLootlogPlayerConfig" DROP CONSTRAINT "UserLootlogPlayerConfig_playerId_fkey";

-- DropForeignKey
ALTER TABLE "UserLootlogPlayerConfig" DROP CONSTRAINT "UserLootlogPlayerConfig_userLootlogConfigId_fkey";

-- AlterTable
ALTER TABLE "UserLootlogConfig" ADD COLUMN     "canAddLoot" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canAddTimer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "guildId" TEXT NOT NULL,
ADD COLUMN     "playerId" TEXT NOT NULL;

-- DropTable
DROP TABLE "UserLootlogPlayerConfig";
