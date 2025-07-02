/*
  Warnings:

  - You are about to drop the column `guildId` on the `Loot` table. All the data in the column will be lost.
  - You are about to drop the column `memberId` on the `Loot` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[lootId,guildId,memberId]` on the table `LootSubmission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guildId` to the `LootSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Loot" DROP CONSTRAINT "Loot_guildId_fkey";

-- DropForeignKey
ALTER TABLE "Loot" DROP CONSTRAINT "Loot_memberId_fkey";

-- AlterTable
ALTER TABLE "Loot" DROP COLUMN "guildId",
DROP COLUMN "memberId";

-- AlterTable
ALTER TABLE "LootSubmission" ADD COLUMN     "guildId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LootSubmission_lootId_guildId_memberId_key" ON "LootSubmission"("lootId", "guildId", "memberId");

-- AddForeignKey
ALTER TABLE "LootSubmission" ADD CONSTRAINT "LootSubmission_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
