-- CreateEnum
CREATE TYPE "NotificationScheduleStrategy" AS ENUM ('SPAWN_WINDOW_RELATIVE');

-- CreateEnum
CREATE TYPE "NotificationScheduleAnchor" AS ENUM ('MIN_SPAWN', 'MAX_SPAWN');

-- AlterTable
ALTER TABLE "NotificationRule"
ADD COLUMN "scheduleStrategy" "NotificationScheduleStrategy",
ADD COLUMN "scheduleAnchor" "NotificationScheduleAnchor",
ADD COLUMN "scheduleOffsetMinutes" INTEGER;

-- DropColumn
ALTER TABLE "NotificationRule"
DROP COLUMN "leadTimeMinutes";
