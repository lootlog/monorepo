ALTER TABLE "EventKillPoint"
ADD COLUMN "confirmationExpiredAcknowledgedAt" TIMESTAMP(3);

CREATE INDEX "Member_globalUserId_guildId_active_idx"
ON "Member"("globalUserId", "guildId", "active");
