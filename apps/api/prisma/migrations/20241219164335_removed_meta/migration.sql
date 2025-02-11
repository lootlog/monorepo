/*
  Warnings:

  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Npc` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Player` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `npc` to the `Timer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PlayerLootlogConfig" DROP CONSTRAINT "PlayerLootlogConfig_playerId_fkey";

-- DropForeignKey
ALTER TABLE "Timer" DROP CONSTRAINT "Timer_npcId_fkey";

-- AlterTable
ALTER TABLE "Timer" ADD COLUMN     "npc" JSONB NOT NULL;

-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "Npc";

-- DropTable
DROP TABLE "Player";
