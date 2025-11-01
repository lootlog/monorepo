/*
  Warnings:

  - You are about to drop the column `addTimersBlacklistGuildIds` on the `UserCharactersLootlogSettings` table. All the data in the column will be lost.
  - You are about to drop the column `collectLootBlaclistGuildIds` on the `UserCharactersLootlogSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserCharactersLootlogSettings" DROP COLUMN "addTimersBlacklistGuildIds",
DROP COLUMN "collectLootBlaclistGuildIds",
ADD COLUMN     "addTimersWhitelistGuildIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "collectLootWhitelistGuildIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
