-- AlterTable
ALTER TABLE "battle_warriors" ADD COLUMN     "attacksBlocked" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "attacksEvaded" INTEGER NOT NULL DEFAULT 0;
