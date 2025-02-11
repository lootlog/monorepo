/*
  Warnings:

  - You are about to drop the column `accountId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `characterId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `accountId` on the `UserLootlogPlayerConfig` table. All the data in the column will be lost.
  - You are about to drop the column `characterId` on the `UserLootlogPlayerConfig` table. All the data in the column will be lost.
  - Added the required column `playerId` to the `UserLootlogPlayerConfig` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserLootlogPlayerConfig" DROP CONSTRAINT "UserLootlogPlayerConfig_accountId_characterId_fkey";

-- DropIndex
DROP INDEX "Player_characterId_accountId_key";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "accountId",
DROP COLUMN "characterId",
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "player_id_seq";

-- AlterTable
ALTER TABLE "UserLootlogPlayerConfig" DROP COLUMN "accountId",
DROP COLUMN "characterId",
ADD COLUMN     "playerId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "UserLootlogPlayerConfig" ADD CONSTRAINT "UserLootlogPlayerConfig_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
