CREATE TABLE "MemberActivityStats" (
    "guildId" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "source" "ActivitySource" NOT NULL,
    "lastSeenAt" TIMESTAMPTZ,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "activeSessionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "MemberActivityStats_pkey" PRIMARY KEY ("guildId","discordId","source")
);

CREATE INDEX "MemberActivityStats_guildId_source_idx" ON "MemberActivityStats"("guildId", "source");
