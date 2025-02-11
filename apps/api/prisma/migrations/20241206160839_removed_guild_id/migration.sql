/*
  Warnings:

  - You are about to drop the column `guildId` on the `Player` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_guildId_fkey";

-- DropIndex
DROP INDEX "Player_id_guildId_idx";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "guildId";

-- CreateIndex
CREATE INDEX "Player_accountId_characterId_idx" ON "Player"("accountId", "characterId");
