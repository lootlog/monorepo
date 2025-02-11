-- AlterTable
ALTER TABLE "UserLootlogPlayerConfig" ADD COLUMN     "canAddLoot" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canAddTimer" BOOLEAN NOT NULL DEFAULT true;
