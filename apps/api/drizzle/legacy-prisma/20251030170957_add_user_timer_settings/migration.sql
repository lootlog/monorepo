-- CreateTable
CREATE TABLE "UserTimerSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "generalConfig" JSONB NOT NULL,
    "displayConfig" JSONB NOT NULL,
    "customColors" JSONB NOT NULL,
    "timersColors" JSONB NOT NULL,
    "defaultColorNames" JSONB NOT NULL,
    "overriddenDefaultColors" JSONB NOT NULL,
    "hiddenDefaultColors" JSONB NOT NULL,
    "timerFiltersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timersSortOrder" TEXT NOT NULL DEFAULT 'desc',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTimerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGuildTimerSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "hiddenTimers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pinnedTimers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGuildTimerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTimerSettings_userId_key" ON "UserTimerSettings"("userId");

-- CreateIndex
CREATE INDEX "UserTimerSettings_userId_idx" ON "UserTimerSettings"("userId");

-- CreateIndex
CREATE INDEX "UserGuildTimerSettings_userId_idx" ON "UserGuildTimerSettings"("userId");

-- CreateIndex
CREATE INDEX "UserGuildTimerSettings_guildId_idx" ON "UserGuildTimerSettings"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGuildTimerSettings_userId_guildId_key" ON "UserGuildTimerSettings"("userId", "guildId");
