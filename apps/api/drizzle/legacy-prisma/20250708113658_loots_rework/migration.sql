/*
  Warnings:

  - You are about to drop the column `guildId` on the `Loot` table. All the data in the column will be lost.
  - You are about to drop the column `memberId` on the `Loot` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Loot" DROP CONSTRAINT "Loot_guildId_fkey";

-- DropForeignKey
ALTER TABLE "Loot" DROP CONSTRAINT "Loot_memberId_fkey";

-- AlterTable
ALTER TABLE "Loot" DROP COLUMN "guildId",
DROP COLUMN "memberId";

-- CreateTable
CREATE TABLE "LootSubmission" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LootSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LootSubmission_lootId_guildId_memberId_key" ON "LootSubmission"("lootId", "guildId", "memberId");

-- CreateIndex
CREATE INDEX "Loot_uniqueId_idx" ON "Loot"("uniqueId");

-- CreateIndex
CREATE INDEX "Loot_createdAt_idx" ON "Loot"("createdAt");

-- AddForeignKey
ALTER TABLE "LootSubmission" ADD CONSTRAINT "LootSubmission_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootSubmission" ADD CONSTRAINT "LootSubmission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootSubmission" ADD CONSTRAINT "LootSubmission_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
