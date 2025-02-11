/*
  Warnings:

  - You are about to drop the column `guildId` on the `UserLootlogConfig` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserLootlogConfig" DROP CONSTRAINT "UserLootlogConfig_guildId_fkey";

-- AlterTable
ALTER TABLE "UserLootlogConfig" DROP COLUMN "guildId";
