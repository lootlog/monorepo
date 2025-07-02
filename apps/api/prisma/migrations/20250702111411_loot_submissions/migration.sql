/*
  Warnings:

  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Npc` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Player` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "Npc";

-- DropTable
DROP TABLE "Player";

-- CreateTable
CREATE TABLE "LootSubmission" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LootSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Loot_uniqueId_idx" ON "Loot"("uniqueId");

-- CreateIndex
CREATE INDEX "Loot_createdAt_idx" ON "Loot"("createdAt");

-- AddForeignKey
ALTER TABLE "LootSubmission" ADD CONSTRAINT "LootSubmission_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootSubmission" ADD CONSTRAINT "LootSubmission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
