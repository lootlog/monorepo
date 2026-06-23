CREATE TABLE "MemberActivitySession" (
  "guildId" TEXT NOT NULL,
  "discordId" TEXT NOT NULL,
  "source" "ActivitySource" NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT,
  "userAgent" TEXT,
  "world" TEXT,
  "connectedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MemberActivitySession_pkey" PRIMARY KEY ("guildId", "discordId", "source", "sessionId")
);

CREATE INDEX "MemberActivitySession_guildId_discordId_source_idx" ON "MemberActivitySession"("guildId", "discordId", "source");
CREATE INDEX "MemberActivitySession_guildId_source_idx" ON "MemberActivitySession"("guildId", "source");
CREATE INDEX "MemberActivitySession_lastSeenAt_idx" ON "MemberActivitySession"("lastSeenAt");

UPDATE "MemberActivityStats"
SET "activeSessionCount" = 0
WHERE "activeSessionCount" <> 0;
