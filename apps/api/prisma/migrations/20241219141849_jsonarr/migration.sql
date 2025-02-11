/*
  Warnings:

  - Changed the type of `loots` on the `Loot` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `npcs` on the `Loot` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `players` on the `Loot` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Loot" DROP COLUMN "loots",
ADD COLUMN     "loots" JSONB NOT NULL,
DROP COLUMN "npcs",
ADD COLUMN     "npcs" JSONB NOT NULL,
DROP COLUMN "players",
ADD COLUMN     "players" JSONB NOT NULL;
