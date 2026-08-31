/*
  Warnings:

  - The values [LOOT_EVENT,TIMER_EVENT] on the enum `ActivityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `lootContextId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `timerContextId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the `ActivityLootContext` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ActivityTimerContext` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('CONNECT_EVENT', 'DISCONNECT_EVENT');
ALTER TABLE "Activity" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ActivityLootContext" DROP CONSTRAINT "ActivityLootContext_activityId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityLootContext" DROP CONSTRAINT "ActivityLootContext_actorSnapshotId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityTimerContext" DROP CONSTRAINT "ActivityTimerContext_activityId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityTimerContext" DROP CONSTRAINT "ActivityTimerContext_actorSnapshotId_fkey";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "lootContextId",
DROP COLUMN "timerContextId";

-- DropTable
DROP TABLE "ActivityLootContext";

-- DropTable
DROP TABLE "ActivityTimerContext";
