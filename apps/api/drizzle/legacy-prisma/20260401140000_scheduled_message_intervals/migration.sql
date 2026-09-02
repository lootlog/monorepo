-- CreateEnum
CREATE TYPE "NotificationScheduleIntervalType" AS ENUM ('ONCE', 'HOURLY', 'DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "NotificationRule" ADD COLUMN "scheduleIntervalType" "NotificationScheduleIntervalType",
ADD COLUMN "scheduleIntervalValue" INTEGER,
ADD COLUMN "scheduleWeekday" INTEGER,
ADD COLUMN "scheduleTimeOfDay" TEXT,
ADD COLUMN "scheduledUntil" TIMESTAMP(3);
