ALTER TABLE "UserTimerSettings"
ADD COLUMN "alwaysVisibleExpiredTimers" JSONB NOT NULL DEFAULT '{}';
