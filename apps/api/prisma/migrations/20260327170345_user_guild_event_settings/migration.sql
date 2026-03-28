-- CreateTable
CREATE TABLE "UserGuildEventSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "pinnedEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGuildEventSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserGuildEventSettings_userId_idx" ON "UserGuildEventSettings"("userId");

-- CreateIndex
CREATE INDEX "UserGuildEventSettings_guildId_idx" ON "UserGuildEventSettings"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGuildEventSettings_userId_guildId_key" ON "UserGuildEventSettings"("userId", "guildId");
