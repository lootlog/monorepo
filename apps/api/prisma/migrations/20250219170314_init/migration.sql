/*
  Warnings:

  - You are about to drop the column `loots` on the `Loot` table. All the data in the column will be lost.
  - You are about to drop the column `npcs` on the `Loot` table. All the data in the column will be lost.
  - You are about to drop the column `players` on the `Loot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Loot" DROP COLUMN "loots",
DROP COLUMN "npcs",
DROP COLUMN "players";

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "ItemRarity" NOT NULL,
    "icon" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "prof" "Profession" NOT NULL,
    "lvl" INTEGER NOT NULL,
    "pr" INTEGER NOT NULL,
    "prc" INTEGER NOT NULL,
    "stat" TEXT NOT NULL,
    "lootId" INTEGER,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "prof" "Profession" NOT NULL,
    "lvl" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lootId" INTEGER,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Npc" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lvl" INTEGER NOT NULL,
    "prof" "Profession" NOT NULL,
    "type" "NpcType" NOT NULL,
    "margonemType" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "wt" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lootId" INTEGER,

    CONSTRAINT "Npc_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Npc" ADD CONSTRAINT "Npc_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
