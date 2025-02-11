/*
  Warnings:

  - You are about to drop the `_ItemToLoot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ItemToLoot" DROP CONSTRAINT "_ItemToLoot_A_fkey";

-- DropForeignKey
ALTER TABLE "_ItemToLoot" DROP CONSTRAINT "_ItemToLoot_B_fkey";

-- DropTable
DROP TABLE "_ItemToLoot";

-- CreateTable
CREATE TABLE "LootItems" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LootItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LootItems_lootId_itemId_key" ON "LootItems"("lootId", "itemId");

-- AddForeignKey
ALTER TABLE "LootItems" ADD CONSTRAINT "LootItems_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootItems" ADD CONSTRAINT "LootItems_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
