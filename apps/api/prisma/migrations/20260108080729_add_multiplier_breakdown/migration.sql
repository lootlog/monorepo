-- AlterTable
ALTER TABLE "EventKillPoint" ADD COLUMN     "mapsMultiplier" DOUBLE PRECISION,
ADD COLUMN     "timeMultiplier" DOUBLE PRECISION,
ADD COLUMN     "trackersMultiplier" DOUBLE PRECISION,
ADD COLUMN     "trackingDurationSeconds" INTEGER;
