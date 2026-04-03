-- CreateEnum
CREATE TYPE "NotificationOwnerType" AS ENUM ('GUILD', 'USER');

-- CreateEnum
CREATE TYPE "NotificationProvider" AS ENUM ('DISCORD');

-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('CHANNEL', 'DM');

-- CreateEnum
CREATE TYPE "NotificationTriggerType" AS ENUM ('TIMER_BEFORE_SPAWN', 'NPC_SPAWNED', 'WATCHED_ITEM_DROPPED');

-- CreateEnum
CREATE TYPE "NotificationJobKind" AS ENUM ('SCHEDULED', 'INSTANT');

-- CreateEnum
CREATE TYPE "NotificationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'BLOCKED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DiscordGuildSyncStatus" AS ENUM ('SYNCED', 'SYNCING', 'FAILED', 'STALE', 'NOT_FOUND');

-- CreateTable
CREATE TABLE "NotificationTarget" (
    "id" SERIAL NOT NULL,
    "ownerType" "NotificationOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "provider" "NotificationProvider" NOT NULL,
    "targetType" "NotificationTargetType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT,
    "guildName" TEXT,
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canSend" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastDeliveryAt" TIMESTAMP(3),
    "lastDeliveryError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" SERIAL NOT NULL,
    "ownerType" "NotificationOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "triggerType" "NotificationTriggerType" NOT NULL,
    "guildId" TEXT,
    "world" TEXT,
    "name" TEXT,
    "filters" JSONB,
    "leadTimeMinutes" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "dedupeWindowSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRuleTarget" (
    "ruleId" INTEGER NOT NULL,
    "targetId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRuleTarget_pkey" PRIMARY KEY ("ruleId","targetId")
);

-- CreateTable
CREATE TABLE "NotificationJob" (
    "id" TEXT NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "targetId" INTEGER NOT NULL,
    "ownerType" "NotificationOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "jobKind" "NotificationJobKind" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "NotificationJobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "sourceEventId" TEXT,
    "payloadSnapshot" JSONB NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "blockedReason" TEXT,
    "providerMessageId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchedItem" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationRuleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordGuildChannelSnapshot" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "parentId" TEXT,
    "position" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canSend" BOOLEAN NOT NULL DEFAULT true,
    "hasRequiredPermissions" BOOLEAN NOT NULL DEFAULT false,
    "requiredPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grantedPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordGuildChannelSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordGuildSyncState" (
    "guildId" TEXT NOT NULL,
    "status" "DiscordGuildSyncStatus" NOT NULL DEFAULT 'STALE',
    "hasRequiredPermissions" BOOLEAN NOT NULL DEFAULT false,
    "requiredPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grantedPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channelCount" INTEGER NOT NULL DEFAULT 0,
    "selectableChannelCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordGuildSyncState_pkey" PRIMARY KEY ("guildId")
);

-- CreateIndex
CREATE INDEX "NotificationTarget_ownerType_ownerId_active_idx" ON "NotificationTarget"("ownerType", "ownerId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTarget_ownerType_ownerId_provider_targetType_ex_key" ON "NotificationTarget"("ownerType", "ownerId", "provider", "targetType", "externalId");

-- CreateIndex
CREATE INDEX "NotificationRule_ownerType_ownerId_enabled_idx" ON "NotificationRule"("ownerType", "ownerId", "enabled");

-- CreateIndex
CREATE INDEX "NotificationRule_guildId_world_triggerType_enabled_idx" ON "NotificationRule"("guildId", "world", "triggerType", "enabled");

-- CreateIndex
CREATE INDEX "NotificationRuleTarget_targetId_idx" ON "NotificationRuleTarget"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationJob_idempotencyKey_key" ON "NotificationJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationJob_ruleId_status_idx" ON "NotificationJob"("ruleId", "status");

-- CreateIndex
CREATE INDEX "NotificationJob_targetId_status_idx" ON "NotificationJob"("targetId", "status");

-- CreateIndex
CREATE INDEX "NotificationJob_ownerType_ownerId_status_scheduledFor_idx" ON "NotificationJob"("ownerType", "ownerId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "NotificationJob_status_scheduledFor_idx" ON "NotificationJob"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedItem_notificationRuleId_key" ON "WatchedItem"("notificationRuleId");

-- CreateIndex
CREATE INDEX "WatchedItem_userId_enabled_idx" ON "WatchedItem"("userId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedItem_userId_itemId_key" ON "WatchedItem"("userId", "itemId");

-- CreateIndex
CREATE INDEX "DiscordGuildChannelSnapshot_guildId_active_canSend_idx" ON "DiscordGuildChannelSnapshot"("guildId", "active", "canSend");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordGuildChannelSnapshot_guildId_channelId_key" ON "DiscordGuildChannelSnapshot"("guildId", "channelId");

-- AddForeignKey
ALTER TABLE "NotificationRule" ADD CONSTRAINT "NotificationRule_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRuleTarget" ADD CONSTRAINT "NotificationRuleTarget_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NotificationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRuleTarget" ADD CONSTRAINT "NotificationRuleTarget_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "NotificationTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NotificationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "NotificationTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedItem" ADD CONSTRAINT "WatchedItem_notificationRuleId_fkey" FOREIGN KEY ("notificationRuleId") REFERENCES "NotificationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordGuildChannelSnapshot" ADD CONSTRAINT "DiscordGuildChannelSnapshot_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordGuildSyncState" ADD CONSTRAINT "DiscordGuildSyncState_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
