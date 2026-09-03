-- AlterEnum
ALTER TYPE "NotificationTriggerType" ADD VALUE 'SCHEDULED_MESSAGE';

-- AlterEnum
ALTER TYPE "NotificationScheduleStrategy" ADD VALUE 'FIXED_DATETIME';

-- AlterTable
ALTER TABLE "NotificationRule" ADD COLUMN "scheduledAt" TIMESTAMP(3);
