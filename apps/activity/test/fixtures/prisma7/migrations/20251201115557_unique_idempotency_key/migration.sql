/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Activity` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Made the column `accountId` on table `ActivityActorSnapshot` required. This step will fail if there are existing NULL values in that column.
  - Made the column `characterId` on table `ActivityActorSnapshot` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clanName` on table `ActivityActorSnapshot` required. This step will fail if there are existing NULL values in that column.
  - Made the column `icon` on table `ActivityActorSnapshot` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lvl` on table `ActivityActorSnapshot` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "idempotencyKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ActivityActorSnapshot" ALTER COLUMN "accountId" SET NOT NULL,
ALTER COLUMN "characterId" SET NOT NULL,
ALTER COLUMN "clanName" SET NOT NULL,
ALTER COLUMN "icon" SET NOT NULL,
ALTER COLUMN "lvl" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Activity_idempotencyKey_key" ON "Activity"("idempotencyKey");
