/*
  Warnings:

  - Added the required column `items` to the `Loot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `npcs` to the `Loot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `players` to the `Loot` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_lootId_fkey";

-- DropForeignKey
ALTER TABLE "Npc" DROP CONSTRAINT "Npc_lootId_fkey";

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_lootId_fkey";

-- AlterTable
ALTER TABLE "Loot" ADD COLUMN     "items" JSONB NOT NULL,
ADD COLUMN     "npcs" JSONB NOT NULL,
ADD COLUMN     "players" JSONB NOT NULL;
