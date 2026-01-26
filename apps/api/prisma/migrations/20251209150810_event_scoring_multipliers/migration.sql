-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "bettorsMultipliers" JSONB,
ADD COLUMN     "mapsCountMultipliers" JSONB,
ADD COLUMN     "timeOfDayMultipliers" JSONB;
