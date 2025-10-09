-- AlterTable
ALTER TABLE "battle_warriors" ADD COLUMN     "auxiliaryDamageTaken" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "distanceDamageTaken" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fireDamageTaken" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "frostDamageTaken" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lightningDamageTaken" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "meleeDamageTaken" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "thirdAttDamageTaken" INTEGER NOT NULL DEFAULT 0;
