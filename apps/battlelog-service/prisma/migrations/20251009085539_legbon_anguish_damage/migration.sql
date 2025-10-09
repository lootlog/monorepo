-- AlterTable
ALTER TABLE "battle_warriors" ADD COLUMN     "legbonAnguishDamageTaken" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "battles" ALTER COLUMN "statistics" DROP DEFAULT;
