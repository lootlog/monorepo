-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('OWNER', 'ADMIN', 'LOOTLOG_MANAGE', 'LOOTLOG_ACCESS', 'LOOTLOG_LOOTS_READ', 'LOOTLOG_LOOTS_WRITE', 'LOOTLOG_LOOTS_ARCHIVE', 'LOOTLOG_LOOTS_TITANS_READ', 'LOOTLOG_LOOTS_HEROES_READ', 'LOOTLOG_TIMERS_READ', 'LOOTLOG_TIMERS_WRITE', 'LOOTLOG_TIMERS_RESET', 'LOOTLOG_TIMERS_DELETE', 'LOOTLOG_TIMERS_TITANS_READ', 'LOOTLOG_TIMERS_HEROES_READ', 'LOOTLOG_RESERVATIONS_READ', 'LOOTLOG_RESERVATIONS_WRITE', 'LOOTLOG_MEMBERS_READ', 'LOOTLOG_ONLINE_PLAYERS_READ', 'LOOTLOG_PRESENCE_LOCATION_READ', 'LOOTLOG_CHAT_READ', 'LOOTLOG_CHAT_WRITE', 'LOOTLOG_CHAT_TITANS_READ', 'LOOTLOG_CHAT_HEROES_READ', 'LOOTLOG_NOTIFICATIONS_READ', 'LOOTLOG_NOTIFICATIONS_SEND', 'LOOTLOG_NOTIFICATIONS_TITANS_READ', 'LOOTLOG_NOTIFICATIONS_HEROES_READ', 'LOOTLOG_EVENTS_MANAGE', 'LOOTLOG_EVENTS_READ', 'LOOTLOG_EVENTS_WRITE', 'LOOTLOG_DOCS_READ', 'LOOTLOG_DOCS_WRITE');

-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('OWNER', 'ADMIN', 'USER', 'BOT');

-- CreateEnum
CREATE TYPE "NpcType" AS ENUM ('COMMON', 'ELITE', 'ELITE2', 'ELITE3', 'HERO', 'EVENT_HERO', 'TITAN', 'COLOSSUS', 'NPC');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('ONE_HAND_WEAPON', 'TWO_HAND_WEAPON', 'ONE_AND_HALF_HAND_WEAPON', 'DISTANCE_WEAPON', 'HELP_WEAPON', 'WAND_WEAPON', 'ORB_WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'RING', 'NECKLACE', 'SHIELD', 'NEUTRAL', 'CONSUME', 'GOLD', 'KEYS', 'QUEST', 'RENEWABLE', 'ARROWS', 'TALISMAN', 'BOOK', 'BAG', 'BLESS', 'UPGRADE', 'RECIPE', 'COINAGE', 'QUIVER', 'OUTFITS', 'PETS', 'TELEPORTS');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('UNIQUE', 'HEROIC', 'LEGENDARY', 'UPGRADED');

-- CreateEnum
CREATE TYPE "Profession" AS ENUM ('WARRIOR', 'PALADIN', 'HUNTER', 'MAGE', 'BLADE_DANCER', 'TRACKER');

-- CreateEnum
CREATE TYPE "LootSource" AS ENUM ('LOOTBOX', 'DIALOG', 'FIGHT');

-- CreateEnum
CREATE TYPE "LootShareSource" AS ENUM ('NONE', 'ITEM_OWNER', 'CHAT_MESSAGE');

-- CreateEnum
CREATE TYPE "TimerHistoryAction" AS ENUM ('CREATE', 'RESET', 'DELETE', 'RESTORE');

-- CreateEnum
CREATE TYPE "GuildDocumentHistoryAction" AS ENUM ('SAVE', 'DELETE', 'RESTORE');

-- CreateEnum
CREATE TYPE "RefreshJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationOwnerType" AS ENUM ('GUILD', 'USER');

-- CreateEnum
CREATE TYPE "NotificationProvider" AS ENUM ('DISCORD');

-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('CHANNEL', 'DM');

-- CreateEnum
CREATE TYPE "NotificationTriggerType" AS ENUM ('TIMER_BEFORE_SPAWN', 'NPC_SPAWNED', 'WATCHED_ITEM_DROPPED', 'SCHEDULED_MESSAGE');

-- CreateEnum
CREATE TYPE "NotificationScheduleStrategy" AS ENUM ('SPAWN_WINDOW_RELATIVE', 'FIXED_DATETIME');

-- CreateEnum
CREATE TYPE "SettingsScopeType" AS ENUM ('USER', 'GAME_ACCOUNT', 'CHARACTER', 'GUILD');

-- CreateEnum
CREATE TYPE "NotificationScheduleAnchor" AS ENUM ('MIN_SPAWN', 'MAX_SPAWN');

-- CreateEnum
CREATE TYPE "NotificationScheduleIntervalType" AS ENUM ('ONCE', 'HOURLY', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "NotificationJobKind" AS ENUM ('SCHEDULED', 'INSTANT', 'TEST');

-- CreateEnum
CREATE TYPE "NotificationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'BLOCKED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DiscordGuildSyncStatus" AS ENUM ('SYNCED', 'SYNCING', 'FAILED', 'STALE', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "CoverageGapType" AS ENUM ('UNASSIGNED', 'UNCOVERED');

-- CreateEnum
CREATE TYPE "EventScoringMode" AS ENUM ('SIMPLE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "PointsEditType" AS ENUM ('KILL_POINT', 'RANKING');

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "ownerId" TEXT NOT NULL,
    "vanityUrl" TEXT,
    "notificationRuleLimit" INTEGER NOT NULL DEFAULT 20,
    "publicStatsCardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reservationMaxDurationMinutes" INTEGER NOT NULL DEFAULT 180,
    "reservationMinDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "reservationTimeGranularityMinutes" INTEGER NOT NULL DEFAULT 15,
    "reservationMaxAdvanceDays" INTEGER NOT NULL DEFAULT 7,
    "reservationActiveLimitPerSpot" INTEGER NOT NULL DEFAULT 3,
    "documentLimit" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" INTEGER,
    "position" INTEGER,
    "permissions" "Permission"[] DEFAULT ARRAY[]::"Permission"[],
    "lvlRangeFrom" INTEGER DEFAULT 0,
    "lvlRangeTo" INTEGER DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" "MemberType" NOT NULL DEFAULT 'USER',
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "banner" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "globalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastDiscordSyncAt" TIMESTAMP(3),
    "lastDiscordAttemptAt" TIMESTAMP(3),
    "lastDiscordStatus" TEXT,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timer" (
    "createdById" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "timerKey" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "minSpawnTime" TIMESTAMP(3) NOT NULL,
    "maxSpawnTime" TIMESTAMP(3) NOT NULL,
    "latestRespBaseSeconds" INTEGER NOT NULL DEFAULT 0,
    "latestRespawnRandomness" INTEGER NOT NULL DEFAULT 0,
    "tempId" TEXT,
    "wasReset" BOOLEAN NOT NULL DEFAULT false,
    "npc" JSONB NOT NULL,
    "windowOpenedAt" TIMESTAMP(3),
    "actorCharacterSnapshotId" INTEGER,
    "actorCharacterLvl" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timer_pkey" PRIMARY KEY ("guildId","world","timerKey")
);

-- CreateTable
CREATE TABLE "Loot" (
    "id" SERIAL NOT NULL,
    "uniqueId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "source" "LootSource" NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lootShare" JSONB NOT NULL DEFAULT '{}',
    "lootShareSource" "LootShareSource" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "Loot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSnapshot" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "statsHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "lvl" INTEGER,
    "rarity" "ItemRarity",
    "itemType" TEXT,
    "statRaw" TEXT NOT NULL,
    "statsSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootItem" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "itemSnapshotId" INTEGER NOT NULL,
    "hid" TEXT NOT NULL,

    CONSTRAINT "LootItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSnapshot" (
    "id" SERIAL NOT NULL,
    "world" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prof" "Profession",
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimerHistoryEntry" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "timerKey" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npc" JSONB NOT NULL,
    "action" "TimerHistoryAction" NOT NULL,
    "actorMemberId" INTEGER NOT NULL,
    "actorCharacterSnapshotId" INTEGER,
    "actorCharacterLvl" INTEGER,
    "minSpawnTime" TIMESTAMP(3),
    "maxSpawnTime" TIMESTAMP(3),
    "latestRespBaseSeconds" INTEGER,
    "latestRespawnRandomness" INTEGER,
    "wasReset" BOOLEAN,
    "windowOpenedAt" TIMESTAMP(3),
    "timerCreatedById" INTEGER,
    "timerActorCharacterSnapshotId" INTEGER,
    "timerActorCharacterLvl" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimerHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootPlayer" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "playerSnapshotId" INTEGER NOT NULL,
    "lvl" INTEGER,
    "hpp" INTEGER,

    CONSTRAINT "LootPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpcSnapshot" (
    "id" SERIAL NOT NULL,
    "npcId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NpcType",
    "lvl" INTEGER,
    "icon" TEXT,
    "wt" INTEGER,
    "margonemType" INTEGER,
    "prof" "Profession",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NpcSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootNpc" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "npcSnapshotId" INTEGER NOT NULL,

    CONSTRAINT "LootNpc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationLootRecord" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedByMemberId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationLootRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootSubmission" (
    "id" SERIAL NOT NULL,
    "organizationLootRecordId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LootSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootComment" (
    "id" SERIAL NOT NULL,
    "organizationLootRecordId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LootComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootlogConfigNpc" (
    "id" SERIAL NOT NULL,
    "lootlogConfigId" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "allowedRarities" "ItemRarity"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LootlogConfigNpc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootlogConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LootlogConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "spotName" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "authorDisplayName" TEXT NOT NULL,
    "authorAvatarUrl" TEXT,
    "reminderMinutesBefore" INTEGER,
    "comment" TEXT,
    "reservationId" TEXT,
    "createdDate" TIMESTAMP(3),
    "fromDate" TIMESTAMP(3),
    "toDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationShare" (
    "id" TEXT NOT NULL,
    "firstGuildId" TEXT NOT NULL,
    "secondGuildId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationShareInvitation" (
    "id" TEXT NOT NULL,
    "sourceGuildId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "targetGuildId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationShareInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPinnedReservationSpot" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPinnedReservationSpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCharactersLootlogSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "catchingGuildIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCharactersLootlogSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildsOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hiddenGuildIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "theme" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettingDocument" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "scopeType" "SettingsScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "overrides" JSONB NOT NULL DEFAULT '{}',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGameAccountSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGameAccountSettings_pkey" PRIMARY KEY ("id")
);

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
    "contentTemplate" TEXT,
    "scheduleStrategy" "NotificationScheduleStrategy",
    "scheduleAnchor" "NotificationScheduleAnchor",
    "scheduleOffsetMinutes" INTEGER,
    "scheduledAt" TIMESTAMP(3),
    "scheduleIntervalType" "NotificationScheduleIntervalType",
    "scheduleIntervalValue" INTEGER,
    "scheduleWeekday" INTEGER,
    "scheduleTimeOfDay" TEXT,
    "scheduledUntil" TIMESTAMP(3),
    "scheduleTimezone" TEXT,
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
    "itemName" TEXT NOT NULL,
    "world" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "MemberRefreshJob" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" "RefreshJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "processedMembers" INTEGER NOT NULL DEFAULT 0,
    "failedMembers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MemberRefreshJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTimerSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "generalConfig" JSONB NOT NULL,
    "displayConfig" JSONB NOT NULL,
    "customColors" JSONB NOT NULL,
    "timersColors" JSONB NOT NULL,
    "alwaysVisibleExpiredTimers" JSONB NOT NULL DEFAULT '{}',
    "defaultColorNames" JSONB NOT NULL,
    "overriddenDefaultColors" JSONB NOT NULL,
    "hiddenDefaultColors" JSONB NOT NULL,
    "timerFiltersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "colorFiltersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timersSortOrder" TEXT NOT NULL DEFAULT 'asc',
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGuildTimerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSoundSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "masterVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "notificationsVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "detectorVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "timersVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "pingsVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notificationsConfig" JSONB NOT NULL DEFAULT '{}',
    "detectorConfig" JSONB NOT NULL DEFAULT '{}',
    "timersConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSoundSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "basePointsPerKill" INTEGER NOT NULL DEFAULT 1,
    "assignmentTimeoutMinutes" INTEGER NOT NULL DEFAULT 5,
    "participationConfirmationMinutes" INTEGER NOT NULL DEFAULT 0,
    "mapAssignmentCap" INTEGER,
    "scoringMode" "EventScoringMode" NOT NULL DEFAULT 'SIMPLE',
    "scoringRules" JSONB,
    "rulebookMarkdown" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPinnedEvent" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPinnedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMapLocation" (
    "id" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMapLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMap" (
    "id" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "locationId" TEXT,
    "mapId" INTEGER NOT NULL,
    "mapName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMapCoverageGap" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "gapType" "CoverageGapType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "hadAssignedMembers" BOOLEAN,

    CONSTRAINT "EventMapCoverageGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMapAssignmentHistory" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "EventMapAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventHeroNpc" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "npcId" INTEGER,
    "npcName" TEXT NOT NULL,
    "npcIcon" TEXT,
    "npcLvl" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventHeroNpc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPresenceLog" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "isAfk" BOOLEAN NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "EventPresenceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventHeroKill" (
    "id" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "killedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minSpawnTimeAtKill" TIMESTAMP(3) NOT NULL,
    "maxSpawnTimeAtKill" TIMESTAMP(3) NOT NULL,
    "timerCreatedById" INTEGER,
    "isManualClose" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EventHeroKill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventKillPoint" (
    "id" TEXT NOT NULL,
    "killId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "basePoints" DOUBLE PRECISION NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "manualAdjustmentPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trackingDurationSeconds" INTEGER,
    "trackingDurationPercentage" DOUBLE PRECISION,
    "confirmationDeadlineAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmationExpiredAcknowledgedAt" TIMESTAMP(3),
    "timeOnMapSeconds" INTEGER NOT NULL,
    "afkPercentage" DOUBLE PRECISION NOT NULL,
    "wasPresent" BOOLEAN NOT NULL,
    "bonusBreakdown" JSONB,
    "mapPresenceData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventKillPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRanking" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "heroNpcName" TEXT NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manualAdjustmentPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "totalTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "avgAfkPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsModified" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPointsEditHistory" (
    "id" TEXT NOT NULL,
    "rankingId" TEXT NOT NULL,
    "previousPoints" DOUBLE PRECISION NOT NULL,
    "newPoints" DOUBLE PRECISION NOT NULL,
    "editType" "PointsEditType" NOT NULL,
    "editedByUserId" TEXT NOT NULL,
    "comment" TEXT,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPointsEditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRespawnWindowSummary" (
    "id" TEXT NOT NULL,
    "heroNpcId" TEXT NOT NULL,
    "killId" TEXT,
    "windowOpenedAt" TIMESTAMP(3) NOT NULL,
    "windowClosedAt" TIMESTAMP(3) NOT NULL,
    "minSpawnTime" TIMESTAMP(3) NOT NULL,
    "maxSpawnTime" TIMESTAMP(3) NOT NULL,
    "wasManualClose" BOOLEAN NOT NULL DEFAULT false,
    "totalWindowSeconds" INTEGER NOT NULL,
    "totalCoverageSeconds" INTEGER NOT NULL,
    "totalUncoveredSeconds" INTEGER NOT NULL,
    "totalUnassignedSeconds" INTEGER NOT NULL,
    "coveragePercentage" DOUBLE PRECISION NOT NULL,
    "memberStats" JSONB NOT NULL,
    "mapStats" JSONB NOT NULL,
    "gapsTimeline" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRespawnWindowSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapTemplate" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildDocument" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByMemberId" TEXT NOT NULL,
    "updatedByMemberId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildDocumentHistory" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "action" "GuildDocumentHistoryAction" NOT NULL DEFAULT 'SAVE',
    "actorMemberId" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildDocumentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpcKillStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcProf" TEXT,
    "npcIcon" TEXT,
    "memberKills" INTEGER NOT NULL DEFAULT 0,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpcKillStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKillStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcProf" TEXT,
    "npcIcon" TEXT,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKillStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildKillSummary" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcProf" TEXT,
    "npcIcon" TEXT,
    "uniqueKills" INTEGER NOT NULL DEFAULT 0,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildKillSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKillStatsBucket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcProf" TEXT,
    "npcIcon" TEXT,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKillStatsBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpcKillStatsBucket" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcProf" TEXT,
    "npcIcon" TEXT,
    "memberKills" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpcKillStatsBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildKillSummaryBucket" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcType" "NpcType" NOT NULL,
    "npcLvl" INTEGER NOT NULL,
    "npcProf" TEXT,
    "npcIcon" TEXT,
    "uniqueKills" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "lastKilledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildKillSummaryBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MemberToRole" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MemberToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EventMapToMember" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EventMapToMember_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_vanityUrl_key" ON "Guild"("vanityUrl");

-- CreateIndex
CREATE INDEX "Guild_vanityUrl_idx" ON "Guild"("vanityUrl");

-- CreateIndex
CREATE INDEX "Role_id_guildId_idx" ON "Role"("id", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_id_guildId_key" ON "Role"("id", "guildId");

-- CreateIndex
CREATE INDEX "Member_id_guildId_idx" ON "Member"("id", "guildId");

-- CreateIndex
CREATE INDEX "Member_userId_guildId_active_lastDiscordSyncAt_idx" ON "Member"("userId", "guildId", "active", "lastDiscordSyncAt");

-- CreateIndex
CREATE INDEX "Member_globalUserId_guildId_active_idx" ON "Member"("globalUserId", "guildId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_guildId_key" ON "Member"("userId", "guildId");

-- CreateIndex
CREATE INDEX "Timer_guildId_world_timerKey_idx" ON "Timer"("guildId", "world", "timerKey");

-- CreateIndex
CREATE INDEX "Timer_npcId_guildId_idx" ON "Timer"("npcId", "guildId");

-- CreateIndex
CREATE INDEX "Timer_guildId_maxSpawnTime_idx" ON "Timer"("guildId", "maxSpawnTime");

-- CreateIndex
CREATE INDEX "Timer_guildId_world_deletedAt_maxSpawnTime_idx" ON "Timer"("guildId", "world", "deletedAt", "maxSpawnTime");

-- CreateIndex
CREATE INDEX "Timer_world_guildId_idx" ON "Timer"("world", "guildId");

-- CreateIndex
CREATE INDEX "Timer_createdById_idx" ON "Timer"("createdById");

-- CreateIndex
CREATE INDEX "Timer_actorCharacterSnapshotId_idx" ON "Timer"("actorCharacterSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "Loot_uniqueId_key" ON "Loot"("uniqueId");

-- CreateIndex
CREATE INDEX "Loot_createdAt_idx" ON "Loot"("createdAt");

-- CreateIndex
CREATE INDEX "Loot_world_createdAt_idx" ON "Loot"("world", "createdAt");

-- CreateIndex
CREATE INDEX "Loot_world_id_idx" ON "Loot"("world", "id");

-- CreateIndex
CREATE INDEX "ItemSnapshot_name_idx" ON "ItemSnapshot"("name");

-- CreateIndex
CREATE INDEX "ItemSnapshot_rarity_lvl_idx" ON "ItemSnapshot"("rarity", "lvl");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSnapshot_itemId_statsHash_key" ON "ItemSnapshot"("itemId", "statsHash");

-- CreateIndex
CREATE INDEX "LootItem_lootId_itemSnapshotId_idx" ON "LootItem"("lootId", "itemSnapshotId");

-- CreateIndex
CREATE INDEX "LootItem_hid_lootId_idx" ON "LootItem"("hid", "lootId");

-- CreateIndex
CREATE INDEX "LootItem_itemSnapshotId_lootId_idx" ON "LootItem"("itemSnapshotId", "lootId");

-- CreateIndex
CREATE INDEX "PlayerSnapshot_world_name_idx" ON "PlayerSnapshot"("world", "name");

-- CreateIndex
CREATE INDEX "PlayerSnapshot_accountId_characterId_idx" ON "PlayerSnapshot"("accountId", "characterId");

-- CreateIndex
CREATE INDEX "PlayerSnapshot_name_idx" ON "PlayerSnapshot"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSnapshot_world_accountId_characterId_snapshotHash_key" ON "PlayerSnapshot"("world", "accountId", "characterId", "snapshotHash");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_guildId_world_timerKey_createdAt_idx" ON "TimerHistoryEntry"("guildId", "world", "timerKey", "createdAt");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_guildId_world_createdAt_idx" ON "TimerHistoryEntry"("guildId", "world", "createdAt");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_actorMemberId_idx" ON "TimerHistoryEntry"("actorMemberId");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_actorCharacterSnapshotId_idx" ON "TimerHistoryEntry"("actorCharacterSnapshotId");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_timerCreatedById_idx" ON "TimerHistoryEntry"("timerCreatedById");

-- CreateIndex
CREATE INDEX "TimerHistoryEntry_timerActorCharacterSnapshotId_idx" ON "TimerHistoryEntry"("timerActorCharacterSnapshotId");

-- CreateIndex
CREATE INDEX "LootPlayer_lootId_idx" ON "LootPlayer"("lootId");

-- CreateIndex
CREATE INDEX "LootPlayer_playerSnapshotId_idx" ON "LootPlayer"("playerSnapshotId");

-- CreateIndex
CREATE INDEX "NpcSnapshot_name_idx" ON "NpcSnapshot"("name");

-- CreateIndex
CREATE INDEX "NpcSnapshot_type_lvl_idx" ON "NpcSnapshot"("type", "lvl");

-- CreateIndex
CREATE UNIQUE INDEX "NpcSnapshot_npcId_name_key" ON "NpcSnapshot"("npcId", "name");

-- CreateIndex
CREATE INDEX "LootNpc_lootId_idx" ON "LootNpc"("lootId");

-- CreateIndex
CREATE INDEX "LootNpc_npcSnapshotId_idx" ON "LootNpc"("npcSnapshotId");

-- CreateIndex
CREATE INDEX "OrganizationLootRecord_lootId_idx" ON "OrganizationLootRecord"("lootId");

-- CreateIndex
CREATE INDEX "OrganizationLootRecord_guildId_archivedAt_lootId_idx" ON "OrganizationLootRecord"("guildId", "archivedAt", "lootId");

-- CreateIndex
CREATE INDEX "OrganizationLootRecord_archivedByMemberId_idx" ON "OrganizationLootRecord"("archivedByMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationLootRecord_guildId_lootId_key" ON "OrganizationLootRecord"("guildId", "lootId");

-- CreateIndex
CREATE INDEX "LootSubmission_memberId_idx" ON "LootSubmission"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "LootSubmission_organizationLootRecordId_memberId_key" ON "LootSubmission"("organizationLootRecordId", "memberId");

-- CreateIndex
CREATE INDEX "LootComment_organizationLootRecordId_createdAt_idx" ON "LootComment"("organizationLootRecordId", "createdAt");

-- CreateIndex
CREATE INDEX "LootComment_memberId_idx" ON "LootComment"("memberId");

-- CreateIndex
CREATE INDEX "Reservation_guildId_spotId_startsAt_endsAt_idx" ON "Reservation"("guildId", "spotId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Reservation_guildId_endsAt_idx" ON "Reservation"("guildId", "endsAt");

-- CreateIndex
CREATE INDEX "Reservation_createdByUserId_endsAt_idx" ON "Reservation"("createdByUserId", "endsAt");

-- CreateIndex
CREATE INDEX "ReservationShare_firstGuildId_revokedAt_idx" ON "ReservationShare"("firstGuildId", "revokedAt");

-- CreateIndex
CREATE INDEX "ReservationShare_secondGuildId_revokedAt_idx" ON "ReservationShare"("secondGuildId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationShare_firstGuildId_secondGuildId_key" ON "ReservationShare"("firstGuildId", "secondGuildId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationShareInvitation_tokenHash_key" ON "ReservationShareInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "ReservationShareInvitation_sourceGuildId_createdAt_idx" ON "ReservationShareInvitation"("sourceGuildId", "createdAt");

-- CreateIndex
CREATE INDEX "ReservationShareInvitation_targetGuildId_idx" ON "ReservationShareInvitation"("targetGuildId");

-- CreateIndex
CREATE INDEX "ReservationShareInvitation_expiresAt_idx" ON "ReservationShareInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "UserPinnedReservationSpot_userId_guildId_pinnedAt_idx" ON "UserPinnedReservationSpot"("userId", "guildId", "pinnedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserPinnedReservationSpot_userId_guildId_spotId_key" ON "UserPinnedReservationSpot"("userId", "guildId", "spotId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCharactersLootlogSettings_userId_accountId_characterId_key" ON "UserCharactersLootlogSettings"("userId", "accountId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "UserSettingDocument_userId_domain_idx" ON "UserSettingDocument"("userId", "domain");

-- CreateIndex
CREATE INDEX "UserSettingDocument_userId_scopeType_scopeId_idx" ON "UserSettingDocument"("userId", "scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettingDocument_userId_domain_scopeType_scopeId_key" ON "UserSettingDocument"("userId", "domain", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "UserGameAccountSettings_userId_idx" ON "UserGameAccountSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGameAccountSettings_userId_accountId_key" ON "UserGameAccountSettings"("userId", "accountId");

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
CREATE INDEX "WatchedItem_itemId_world_enabled_idx" ON "WatchedItem"("itemId", "world", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedItem_userId_itemId_world_key" ON "WatchedItem"("userId", "itemId", "world");

-- CreateIndex
CREATE INDEX "DiscordGuildChannelSnapshot_guildId_active_canSend_idx" ON "DiscordGuildChannelSnapshot"("guildId", "active", "canSend");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordGuildChannelSnapshot_guildId_channelId_key" ON "DiscordGuildChannelSnapshot"("guildId", "channelId");

-- CreateIndex
CREATE INDEX "MemberRefreshJob_guildId_idx" ON "MemberRefreshJob"("guildId");

-- CreateIndex
CREATE INDEX "MemberRefreshJob_status_idx" ON "MemberRefreshJob"("status");

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

-- CreateIndex
CREATE UNIQUE INDEX "UserSoundSettings_userId_key" ON "UserSoundSettings"("userId");

-- CreateIndex
CREATE INDEX "UserSoundSettings_userId_idx" ON "UserSoundSettings"("userId");

-- CreateIndex
CREATE INDEX "Event_guildId_startsAt_endsAt_idx" ON "Event"("guildId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Event_world_idx" ON "Event"("world");

-- CreateIndex
CREATE INDEX "UserPinnedEvent_userId_pinnedAt_idx" ON "UserPinnedEvent"("userId", "pinnedAt" DESC);

-- CreateIndex
CREATE INDEX "UserPinnedEvent_eventId_idx" ON "UserPinnedEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPinnedEvent_userId_eventId_key" ON "UserPinnedEvent"("userId", "eventId");

-- CreateIndex
CREATE INDEX "EventMapLocation_heroNpcId_order_idx" ON "EventMapLocation"("heroNpcId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "EventMapLocation_heroNpcId_name_key" ON "EventMapLocation"("heroNpcId", "name");

-- CreateIndex
CREATE INDEX "EventMap_mapId_idx" ON "EventMap"("mapId");

-- CreateIndex
CREATE INDEX "EventMap_mapName_idx" ON "EventMap"("mapName");

-- CreateIndex
CREATE INDEX "EventMap_locationId_idx" ON "EventMap"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMap_heroNpcId_mapId_key" ON "EventMap"("heroNpcId", "mapId");

-- CreateIndex
CREATE INDEX "EventMapCoverageGap_mapId_gapType_endedAt_idx" ON "EventMapCoverageGap"("mapId", "gapType", "endedAt");

-- CreateIndex
CREATE INDEX "EventMapCoverageGap_heroNpcId_endedAt_idx" ON "EventMapCoverageGap"("heroNpcId", "endedAt");

-- CreateIndex
CREATE INDEX "EventMapCoverageGap_heroNpcId_startedAt_idx" ON "EventMapCoverageGap"("heroNpcId", "startedAt");

-- CreateIndex
CREATE INDEX "EventMapCoverageGap_mapId_startedAt_idx" ON "EventMapCoverageGap"("mapId", "startedAt");

-- CreateIndex
CREATE INDEX "EventMapAssignmentHistory_mapId_assignedAt_idx" ON "EventMapAssignmentHistory"("mapId", "assignedAt");

-- CreateIndex
CREATE INDEX "EventMapAssignmentHistory_heroNpcId_assignedAt_idx" ON "EventMapAssignmentHistory"("heroNpcId", "assignedAt");

-- CreateIndex
CREATE INDEX "EventMapAssignmentHistory_memberId_idx" ON "EventMapAssignmentHistory"("memberId");

-- CreateIndex
CREATE INDEX "EventHeroNpc_npcId_idx" ON "EventHeroNpc"("npcId");

-- CreateIndex
CREATE UNIQUE INDEX "EventHeroNpc_eventId_npcName_key" ON "EventHeroNpc"("eventId", "npcName");

-- CreateIndex
CREATE INDEX "EventPresenceLog_mapId_memberId_idx" ON "EventPresenceLog"("mapId", "memberId");

-- CreateIndex
CREATE INDEX "EventPresenceLog_mapId_endedAt_isAfk_memberId_idx" ON "EventPresenceLog"("mapId", "endedAt", "isAfk", "memberId");

-- CreateIndex
CREATE INDEX "EventPresenceLog_startedAt_endedAt_idx" ON "EventPresenceLog"("startedAt", "endedAt");

-- CreateIndex
CREATE INDEX "EventHeroKill_heroNpcId_idx" ON "EventHeroKill"("heroNpcId");

-- CreateIndex
CREATE INDEX "EventHeroKill_heroNpcId_killedAt_idx" ON "EventHeroKill"("heroNpcId", "killedAt");

-- CreateIndex
CREATE INDEX "EventHeroKill_killedAt_idx" ON "EventHeroKill"("killedAt");

-- CreateIndex
CREATE INDEX "EventKillPoint_memberId_idx" ON "EventKillPoint"("memberId");

-- CreateIndex
CREATE INDEX "EventKillPoint_memberId_confirmationDeadlineAt_confirmedAt_idx" ON "EventKillPoint"("memberId", "confirmationDeadlineAt", "confirmedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventKillPoint_killId_memberId_key" ON "EventKillPoint"("killId", "memberId");

-- CreateIndex
CREATE INDEX "EventRanking_eventId_totalPoints_idx" ON "EventRanking"("eventId", "totalPoints" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "EventRanking_eventId_memberId_heroNpcName_key" ON "EventRanking"("eventId", "memberId", "heroNpcName");

-- CreateIndex
CREATE INDEX "EventPointsEditHistory_rankingId_editedAt_idx" ON "EventPointsEditHistory"("rankingId", "editedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "EventRespawnWindowSummary_killId_key" ON "EventRespawnWindowSummary"("killId");

-- CreateIndex
CREATE INDEX "EventRespawnWindowSummary_heroNpcId_idx" ON "EventRespawnWindowSummary"("heroNpcId");

-- CreateIndex
CREATE INDEX "EventRespawnWindowSummary_windowClosedAt_idx" ON "EventRespawnWindowSummary"("windowClosedAt");

-- CreateIndex
CREATE INDEX "MapTemplate_guildId_idx" ON "MapTemplate"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "MapTemplate_guildId_name_key" ON "MapTemplate"("guildId", "name");

-- CreateIndex
CREATE INDEX "GuildDocument_guildId_deletedAt_updatedAt_idx" ON "GuildDocument"("guildId", "deletedAt", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "GuildDocument_guildId_deletedAt_idx" ON "GuildDocument"("guildId", "deletedAt" DESC);

-- CreateIndex
CREATE INDEX "GuildDocumentHistory_documentId_version_idx" ON "GuildDocumentHistory"("documentId", "version");

-- CreateIndex
CREATE INDEX "GuildDocumentHistory_documentId_editedAt_idx" ON "GuildDocumentHistory"("documentId", "editedAt" DESC);

-- CreateIndex
CREATE INDEX "GuildDocumentHistory_guildId_editedAt_idx" ON "GuildDocumentHistory"("guildId", "editedAt" DESC);

-- CreateIndex
CREATE INDEX "NpcKillStats_guildId_idx" ON "NpcKillStats"("guildId");

-- CreateIndex
CREATE INDEX "NpcKillStats_guildId_npcType_idx" ON "NpcKillStats"("guildId", "npcType");

-- CreateIndex
CREATE INDEX "NpcKillStats_guildId_world_npcType_idx" ON "NpcKillStats"("guildId", "world", "npcType");

-- CreateIndex
CREATE INDEX "NpcKillStats_memberId_idx" ON "NpcKillStats"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "NpcKillStats_guildId_memberId_world_npcId_key" ON "NpcKillStats"("guildId", "memberId", "world", "npcId");

-- CreateIndex
CREATE INDEX "UserKillStats_userId_idx" ON "UserKillStats"("userId");

-- CreateIndex
CREATE INDEX "UserKillStats_userId_npcType_idx" ON "UserKillStats"("userId", "npcType");

-- CreateIndex
CREATE INDEX "UserKillStats_userId_world_npcType_idx" ON "UserKillStats"("userId", "world", "npcType");

-- CreateIndex
CREATE UNIQUE INDEX "UserKillStats_userId_world_npcId_key" ON "UserKillStats"("userId", "world", "npcId");

-- CreateIndex
CREATE INDEX "GuildKillSummary_guildId_idx" ON "GuildKillSummary"("guildId");

-- CreateIndex
CREATE INDEX "GuildKillSummary_guildId_npcType_idx" ON "GuildKillSummary"("guildId", "npcType");

-- CreateIndex
CREATE INDEX "GuildKillSummary_guildId_world_npcType_idx" ON "GuildKillSummary"("guildId", "world", "npcType");

-- CreateIndex
CREATE UNIQUE INDEX "GuildKillSummary_guildId_world_npcId_key" ON "GuildKillSummary"("guildId", "world", "npcId");

-- CreateIndex
CREATE INDEX "UserKillStatsBucket_userId_periodStart_idx" ON "UserKillStatsBucket"("userId", "periodStart");

-- CreateIndex
CREATE INDEX "UserKillStatsBucket_userId_npcType_periodStart_idx" ON "UserKillStatsBucket"("userId", "npcType", "periodStart");

-- CreateIndex
CREATE INDEX "UserKillStatsBucket_userId_world_npcType_periodStart_idx" ON "UserKillStatsBucket"("userId", "world", "npcType", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UserKillStatsBucket_userId_world_npcId_periodStart_key" ON "UserKillStatsBucket"("userId", "world", "npcId", "periodStart");

-- CreateIndex
CREATE INDEX "NpcKillStatsBucket_guildId_periodStart_idx" ON "NpcKillStatsBucket"("guildId", "periodStart");

-- CreateIndex
CREATE INDEX "NpcKillStatsBucket_guildId_npcType_periodStart_idx" ON "NpcKillStatsBucket"("guildId", "npcType", "periodStart");

-- CreateIndex
CREATE INDEX "NpcKillStatsBucket_guildId_world_npcType_periodStart_idx" ON "NpcKillStatsBucket"("guildId", "world", "npcType", "periodStart");

-- CreateIndex
CREATE INDEX "NpcKillStatsBucket_memberId_periodStart_idx" ON "NpcKillStatsBucket"("memberId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "NpcKillStatsBucket_guildId_memberId_world_npcId_periodStart_key" ON "NpcKillStatsBucket"("guildId", "memberId", "world", "npcId", "periodStart");

-- CreateIndex
CREATE INDEX "GuildKillSummaryBucket_guildId_periodStart_idx" ON "GuildKillSummaryBucket"("guildId", "periodStart");

-- CreateIndex
CREATE INDEX "GuildKillSummaryBucket_guildId_npcType_periodStart_idx" ON "GuildKillSummaryBucket"("guildId", "npcType", "periodStart");

-- CreateIndex
CREATE INDEX "GuildKillSummaryBucket_guildId_world_npcType_periodStart_idx" ON "GuildKillSummaryBucket"("guildId", "world", "npcType", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "GuildKillSummaryBucket_guildId_world_npcId_periodStart_key" ON "GuildKillSummaryBucket"("guildId", "world", "npcId", "periodStart");

-- CreateIndex
CREATE INDEX "_MemberToRole_B_index" ON "_MemberToRole"("B");

-- CreateIndex
CREATE INDEX "_EventMapToMember_B_index" ON "_EventMapToMember"("B");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_actorCharacterSnapshotId_fkey" FOREIGN KEY ("actorCharacterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootItem" ADD CONSTRAINT "LootItem_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootItem" ADD CONSTRAINT "LootItem_itemSnapshotId_fkey" FOREIGN KEY ("itemSnapshotId") REFERENCES "ItemSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_actorCharacterSnapshotId_fkey" FOREIGN KEY ("actorCharacterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_timerCreatedById_fkey" FOREIGN KEY ("timerCreatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_timerActorCharacterSnapshotId_fkey" FOREIGN KEY ("timerActorCharacterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootPlayer" ADD CONSTRAINT "LootPlayer_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootPlayer" ADD CONSTRAINT "LootPlayer_playerSnapshotId_fkey" FOREIGN KEY ("playerSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootNpc" ADD CONSTRAINT "LootNpc_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootNpc" ADD CONSTRAINT "LootNpc_npcSnapshotId_fkey" FOREIGN KEY ("npcSnapshotId") REFERENCES "NpcSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationLootRecord" ADD CONSTRAINT "OrganizationLootRecord_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationLootRecord" ADD CONSTRAINT "OrganizationLootRecord_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationLootRecord" ADD CONSTRAINT "OrganizationLootRecord_archivedByMemberId_fkey" FOREIGN KEY ("archivedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootSubmission" ADD CONSTRAINT "LootSubmission_organizationLootRecordId_fkey" FOREIGN KEY ("organizationLootRecordId") REFERENCES "OrganizationLootRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootSubmission" ADD CONSTRAINT "LootSubmission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootComment" ADD CONSTRAINT "LootComment_organizationLootRecordId_fkey" FOREIGN KEY ("organizationLootRecordId") REFERENCES "OrganizationLootRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootComment" ADD CONSTRAINT "LootComment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootlogConfigNpc" ADD CONSTRAINT "LootlogConfigNpc_lootlogConfigId_fkey" FOREIGN KEY ("lootlogConfigId") REFERENCES "LootlogConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationShare" ADD CONSTRAINT "ReservationShare_firstGuildId_fkey" FOREIGN KEY ("firstGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationShare" ADD CONSTRAINT "ReservationShare_secondGuildId_fkey" FOREIGN KEY ("secondGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationShareInvitation" ADD CONSTRAINT "ReservationShareInvitation_sourceGuildId_fkey" FOREIGN KEY ("sourceGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationShareInvitation" ADD CONSTRAINT "ReservationShareInvitation_targetGuildId_fkey" FOREIGN KEY ("targetGuildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPinnedReservationSpot" ADD CONSTRAINT "UserPinnedReservationSpot_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPinnedEvent" ADD CONSTRAINT "UserPinnedEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMapLocation" ADD CONSTRAINT "EventMapLocation_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMap" ADD CONSTRAINT "EventMap_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMap" ADD CONSTRAINT "EventMap_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "EventMapLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMapCoverageGap" ADD CONSTRAINT "EventMapCoverageGap_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMapCoverageGap" ADD CONSTRAINT "EventMapCoverageGap_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMapAssignmentHistory" ADD CONSTRAINT "EventMapAssignmentHistory_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMapAssignmentHistory" ADD CONSTRAINT "EventMapAssignmentHistory_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMapAssignmentHistory" ADD CONSTRAINT "EventMapAssignmentHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHeroNpc" ADD CONSTRAINT "EventHeroNpc_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPresenceLog" ADD CONSTRAINT "EventPresenceLog_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPresenceLog" ADD CONSTRAINT "EventPresenceLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHeroKill" ADD CONSTRAINT "EventHeroKill_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHeroKill" ADD CONSTRAINT "EventHeroKill_timerCreatedById_fkey" FOREIGN KEY ("timerCreatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventKillPoint" ADD CONSTRAINT "EventKillPoint_killId_fkey" FOREIGN KEY ("killId") REFERENCES "EventHeroKill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventKillPoint" ADD CONSTRAINT "EventKillPoint_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRanking" ADD CONSTRAINT "EventRanking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRanking" ADD CONSTRAINT "EventRanking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPointsEditHistory" ADD CONSTRAINT "EventPointsEditHistory_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "EventRanking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRespawnWindowSummary" ADD CONSTRAINT "EventRespawnWindowSummary_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRespawnWindowSummary" ADD CONSTRAINT "EventRespawnWindowSummary_killId_fkey" FOREIGN KEY ("killId") REFERENCES "EventHeroKill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapTemplate" ADD CONSTRAINT "MapTemplate_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildDocument" ADD CONSTRAINT "GuildDocument_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildDocumentHistory" ADD CONSTRAINT "GuildDocumentHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "GuildDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildDocumentHistory" ADD CONSTRAINT "GuildDocumentHistory_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpcKillStats" ADD CONSTRAINT "NpcKillStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpcKillStats" ADD CONSTRAINT "NpcKillStats_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildKillSummary" ADD CONSTRAINT "GuildKillSummary_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpcKillStatsBucket" ADD CONSTRAINT "NpcKillStatsBucket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpcKillStatsBucket" ADD CONSTRAINT "NpcKillStatsBucket_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildKillSummaryBucket" ADD CONSTRAINT "GuildKillSummaryBucket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberToRole" ADD CONSTRAINT "_MemberToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberToRole" ADD CONSTRAINT "_MemberToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventMapToMember" ADD CONSTRAINT "_EventMapToMember_A_fkey" FOREIGN KEY ("A") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventMapToMember" ADD CONSTRAINT "_EventMapToMember_B_fkey" FOREIGN KEY ("B") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
