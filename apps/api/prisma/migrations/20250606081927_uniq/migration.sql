/*
  Warnings:

  - A unique constraint covering the columns `[userId,accountId,characterId]` on the table `UserCharactersLootlogSettings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserCharactersLootlogSettings_userId_accountId_key";

-- CreateIndex
CREATE UNIQUE INDEX "UserCharactersLootlogSettings_userId_accountId_characterId_key" ON "UserCharactersLootlogSettings"("userId", "accountId", "characterId");
