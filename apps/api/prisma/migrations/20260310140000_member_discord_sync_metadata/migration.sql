ALTER TABLE "Member"
ADD COLUMN "lastDiscordSyncAt" TIMESTAMP(3),
ADD COLUMN "lastDiscordAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastDiscordStatus" TEXT;

UPDATE "Member"
SET
  "lastDiscordSyncAt" = "updatedAt",
  "lastDiscordAttemptAt" = "updatedAt",
  "lastDiscordStatus" = CASE
    WHEN "active" THEN 'SUCCESS'
    ELSE 'INACTIVE'
  END;
