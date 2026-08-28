/*
  Warnings:

  - You are about to drop the column `items` on the `Loot` table. All the data in the column will be lost.
  - You are about to drop the column `npcs` on the `Loot` table. All the data in the column will be lost.
  - You are about to drop the column `players` on the `Loot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Loot" DROP COLUMN "items",
DROP COLUMN "npcs",
DROP COLUMN "players";
