/*
  Warnings:

  - You are about to drop the column `diedPlayers` on the `Loot` table. All the data in the column will be lost.
  - You are about to drop the `LootItems` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_LootToNpc` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_LootToPlayer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LootItems" DROP CONSTRAINT "LootItems_itemId_fkey";

-- DropForeignKey
ALTER TABLE "LootItems" DROP CONSTRAINT "LootItems_lootId_fkey";

-- DropForeignKey
ALTER TABLE "_LootToNpc" DROP CONSTRAINT "_LootToNpc_A_fkey";

-- DropForeignKey
ALTER TABLE "_LootToNpc" DROP CONSTRAINT "_LootToNpc_B_fkey";

-- DropForeignKey
ALTER TABLE "_LootToPlayer" DROP CONSTRAINT "_LootToPlayer_A_fkey";

-- DropForeignKey
ALTER TABLE "_LootToPlayer" DROP CONSTRAINT "_LootToPlayer_B_fkey";

-- AlterTable
ALTER TABLE "Loot" DROP COLUMN "diedPlayers",
ADD COLUMN     "loots" JSONB[],
ADD COLUMN     "npcs" JSONB[],
ADD COLUMN     "players" JSONB[];

-- DropTable
DROP TABLE "LootItems";

-- DropTable
DROP TABLE "_LootToNpc";

-- DropTable
DROP TABLE "_LootToPlayer";
