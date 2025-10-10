-- AlterTable
ALTER TABLE "battle_warriors" ADD COLUMN     "fled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "battles" ADD COLUMN     "hasFlee" BOOLEAN NOT NULL DEFAULT false;
