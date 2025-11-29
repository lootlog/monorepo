-- AlterTable
ALTER TABLE "UserGuildTimerSettings" ADD COLUMN     "soundEnabledTimers" TEXT[] DEFAULT ARRAY[]::TEXT[];
