-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "GuildDiscordNotificationConfig" (
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedByDiscordId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "GuildDiscordNotificationConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "NotificationDeliveryLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channelId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "NotificationDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildBotPermissionStatus" (
    "guildId" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "missingPermissions" JSONB NOT NULL,
    "checkedAt" TIMESTAMPTZ NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "GuildBotPermissionStatus_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "WatchlistSubscription" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userDiscordId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WatchlistSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDeliveryLog_eventId_key" ON "NotificationDeliveryLog"("eventId");

-- CreateIndex
CREATE INDEX "NotificationDeliveryLog_guildId_createdAt_idx" ON "NotificationDeliveryLog"("guildId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "NotificationDeliveryLog_status_createdAt_idx" ON "NotificationDeliveryLog"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WatchlistSubscription_guildId_enabled_idx" ON "WatchlistSubscription"("guildId", "enabled");

-- CreateIndex
CREATE INDEX "WatchlistSubscription_userDiscordId_idx" ON "WatchlistSubscription"("userDiscordId");
