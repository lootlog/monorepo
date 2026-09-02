CREATE TYPE "CoverageGapType" AS ENUM('UNASSIGNED', 'UNCOVERED');
CREATE TYPE "DiscordGuildSyncStatus" AS ENUM('SYNCED', 'SYNCING', 'FAILED', 'STALE', 'NOT_FOUND');
CREATE TYPE "EventScoringMode" AS ENUM('SIMPLE', 'ADVANCED');
CREATE TYPE "GuildDocumentHistoryAction" AS ENUM('SAVE', 'DELETE', 'RESTORE');
CREATE TYPE "ItemRarity" AS ENUM('UNIQUE', 'HEROIC', 'LEGENDARY', 'UPGRADED');
CREATE TYPE "ItemType" AS ENUM('ONE_HAND_WEAPON', 'TWO_HAND_WEAPON', 'ONE_AND_HALF_HAND_WEAPON', 'DISTANCE_WEAPON', 'HELP_WEAPON', 'WAND_WEAPON', 'ORB_WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'RING', 'NECKLACE', 'SHIELD', 'NEUTRAL', 'CONSUME', 'GOLD', 'KEYS', 'QUEST', 'RENEWABLE', 'ARROWS', 'TALISMAN', 'BOOK', 'BAG', 'BLESS', 'UPGRADE', 'RECIPE', 'COINAGE', 'QUIVER', 'OUTFITS', 'PETS', 'TELEPORTS');
CREATE TYPE "LootShareSource" AS ENUM('NONE', 'ITEM_OWNER', 'CHAT_MESSAGE');
CREATE TYPE "LootSource" AS ENUM('LOOTBOX', 'DIALOG', 'FIGHT');
CREATE TYPE "MemberType" AS ENUM('OWNER', 'ADMIN', 'USER', 'BOT');
CREATE TYPE "NotificationJobKind" AS ENUM('SCHEDULED', 'INSTANT', 'TEST');
CREATE TYPE "NotificationJobStatus" AS ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'BLOCKED', 'CANCELED');
CREATE TYPE "NotificationOwnerType" AS ENUM('GUILD', 'USER');
CREATE TYPE "NotificationProvider" AS ENUM('DISCORD');
CREATE TYPE "NotificationScheduleAnchor" AS ENUM('MIN_SPAWN', 'MAX_SPAWN');
CREATE TYPE "NotificationScheduleIntervalType" AS ENUM('ONCE', 'HOURLY', 'DAILY', 'WEEKLY');
CREATE TYPE "NotificationScheduleStrategy" AS ENUM('SPAWN_WINDOW_RELATIVE', 'FIXED_DATETIME');
CREATE TYPE "NotificationTargetType" AS ENUM('CHANNEL', 'DM');
CREATE TYPE "NotificationTriggerType" AS ENUM('TIMER_BEFORE_SPAWN', 'NPC_SPAWNED', 'WATCHED_ITEM_DROPPED', 'SCHEDULED_MESSAGE');
CREATE TYPE "NpcType" AS ENUM('COMMON', 'ELITE', 'ELITE2', 'ELITE3', 'HERO', 'EVENT_HERO', 'TITAN', 'COLOSSUS', 'NPC');
CREATE TYPE "Permission" AS ENUM('OWNER', 'ADMIN', 'LOOTLOG_MANAGE', 'LOOTLOG_ACCESS', 'LOOTLOG_LOOTS_READ', 'LOOTLOG_LOOTS_WRITE', 'LOOTLOG_LOOTS_ARCHIVE', 'LOOTLOG_LOOTS_TITANS_READ', 'LOOTLOG_LOOTS_HEROES_READ', 'LOOTLOG_TIMERS_READ', 'LOOTLOG_TIMERS_WRITE', 'LOOTLOG_TIMERS_RESET', 'LOOTLOG_TIMERS_DELETE', 'LOOTLOG_TIMERS_TITANS_READ', 'LOOTLOG_TIMERS_HEROES_READ', 'LOOTLOG_RESERVATIONS_READ', 'LOOTLOG_RESERVATIONS_WRITE', 'LOOTLOG_MEMBERS_READ', 'LOOTLOG_ONLINE_PLAYERS_READ', 'LOOTLOG_PRESENCE_LOCATION_READ', 'LOOTLOG_CHAT_READ', 'LOOTLOG_CHAT_WRITE', 'LOOTLOG_CHAT_TITANS_READ', 'LOOTLOG_CHAT_HEROES_READ', 'LOOTLOG_NOTIFICATIONS_READ', 'LOOTLOG_NOTIFICATIONS_SEND', 'LOOTLOG_NOTIFICATIONS_TITANS_READ', 'LOOTLOG_NOTIFICATIONS_HEROES_READ', 'LOOTLOG_EVENTS_MANAGE', 'LOOTLOG_EVENTS_READ', 'LOOTLOG_EVENTS_WRITE', 'LOOTLOG_DOCS_READ', 'LOOTLOG_DOCS_WRITE');
CREATE TYPE "PointsEditType" AS ENUM('KILL_POINT', 'RANKING');
CREATE TYPE "Profession" AS ENUM('WARRIOR', 'PALADIN', 'HUNTER', 'MAGE', 'BLADE_DANCER', 'TRACKER');
CREATE TYPE "RefreshJobStatus" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "SettingsScopeType" AS ENUM('USER', 'GAME_ACCOUNT', 'CHARACTER', 'GUILD');
CREATE TYPE "TimerHistoryAction" AS ENUM('CREATE', 'RESET', 'DELETE', 'RESTORE');
CREATE TABLE "DiscordGuildChannelSnapshot" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"channelId" text NOT NULL,
	"name" text NOT NULL,
	"channelType" text NOT NULL,
	"parentId" text,
	"position" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"canView" boolean DEFAULT true NOT NULL,
	"canSend" boolean DEFAULT true NOT NULL,
	"hasRequiredPermissions" boolean DEFAULT false NOT NULL,
	"requiredPermissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"grantedPermissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"missingPermissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"lastSyncedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "DiscordGuildSyncState" (
	"guildId" text PRIMARY KEY,
	"status" "DiscordGuildSyncStatus" DEFAULT 'STALE'::"DiscordGuildSyncStatus" NOT NULL,
	"hasRequiredPermissions" boolean DEFAULT false NOT NULL,
	"requiredPermissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"grantedPermissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"missingPermissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"channelCount" integer DEFAULT 0 NOT NULL,
	"selectableChannelCount" integer DEFAULT 0 NOT NULL,
	"lastAttemptAt" timestamp(3),
	"lastSuccessAt" timestamp(3),
	"lastError" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "EventHeroKill" (
	"id" text PRIMARY KEY,
	"heroNpcId" text NOT NULL,
	"killedAt" timestamp(3) DEFAULT now() NOT NULL,
	"minSpawnTimeAtKill" timestamp(3) NOT NULL,
	"maxSpawnTimeAtKill" timestamp(3) NOT NULL,
	"timerCreatedById" integer,
	"isManualClose" boolean DEFAULT false NOT NULL
);

CREATE TABLE "EventHeroNpc" (
	"id" text PRIMARY KEY,
	"eventId" text NOT NULL,
	"npcId" integer,
	"npcName" text NOT NULL,
	"npcIcon" text,
	"npcLvl" integer,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "EventKillPoint" (
	"id" text PRIMARY KEY,
	"killId" text NOT NULL,
	"memberId" integer NOT NULL,
	"basePoints" double precision NOT NULL,
	"points" double precision NOT NULL,
	"manualAdjustmentPoints" double precision DEFAULT 0 NOT NULL,
	"trackingDurationSeconds" integer,
	"trackingDurationPercentage" double precision,
	"confirmationDeadlineAt" timestamp(3),
	"confirmedAt" timestamp(3),
	"confirmationExpiredAcknowledgedAt" timestamp(3),
	"timeOnMapSeconds" integer NOT NULL,
	"afkPercentage" double precision NOT NULL,
	"wasPresent" boolean NOT NULL,
	"bonusBreakdown" jsonb,
	"mapPresenceData" jsonb,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "EventMapAssignmentHistory" (
	"id" text PRIMARY KEY,
	"mapId" text NOT NULL,
	"heroNpcId" text NOT NULL,
	"memberId" integer NOT NULL,
	"assignedAt" timestamp(3) DEFAULT now() NOT NULL,
	"unassignedAt" timestamp(3)
);

CREATE TABLE "EventMapCoverageGap" (
	"id" text PRIMARY KEY,
	"mapId" text NOT NULL,
	"heroNpcId" text NOT NULL,
	"gapType" "CoverageGapType" NOT NULL,
	"startedAt" timestamp(3) NOT NULL,
	"endedAt" timestamp(3),
	"durationSeconds" integer,
	"hadAssignedMembers" boolean
);

CREATE TABLE "EventMapLocation" (
	"id" text PRIMARY KEY,
	"heroNpcId" text NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "EventMap" (
	"id" text PRIMARY KEY,
	"heroNpcId" text NOT NULL,
	"locationId" text,
	"mapId" integer NOT NULL,
	"mapName" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "_EventMapToMember" (
	"A" text,
	"B" integer,
	CONSTRAINT "_EventMapToMember_AB_pkey" PRIMARY KEY("A","B")
);

CREATE TABLE "EventPointsEditHistory" (
	"id" text PRIMARY KEY,
	"rankingId" text NOT NULL,
	"previousPoints" double precision NOT NULL,
	"newPoints" double precision NOT NULL,
	"editType" "PointsEditType" NOT NULL,
	"editedByUserId" text NOT NULL,
	"comment" text,
	"editedAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "EventPresenceLog" (
	"id" text PRIMARY KEY,
	"mapId" text NOT NULL,
	"memberId" integer NOT NULL,
	"isAfk" boolean NOT NULL,
	"startedAt" timestamp(3) DEFAULT now() NOT NULL,
	"endedAt" timestamp(3)
);

CREATE TABLE "EventRanking" (
	"id" text PRIMARY KEY,
	"eventId" text NOT NULL,
	"memberId" integer NOT NULL,
	"heroNpcName" text NOT NULL,
	"totalPoints" double precision DEFAULT 0 NOT NULL,
	"manualAdjustmentPoints" double precision DEFAULT 0 NOT NULL,
	"totalKills" integer DEFAULT 0 NOT NULL,
	"totalTimeSeconds" integer DEFAULT 0 NOT NULL,
	"avgAfkPercentage" double precision DEFAULT 0 NOT NULL,
	"pointsModified" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "EventRespawnWindowSummary" (
	"id" text PRIMARY KEY,
	"heroNpcId" text NOT NULL,
	"killId" text,
	"windowOpenedAt" timestamp(3) NOT NULL,
	"windowClosedAt" timestamp(3) NOT NULL,
	"minSpawnTime" timestamp(3) NOT NULL,
	"maxSpawnTime" timestamp(3) NOT NULL,
	"wasManualClose" boolean DEFAULT false NOT NULL,
	"totalWindowSeconds" integer NOT NULL,
	"totalCoverageSeconds" integer NOT NULL,
	"totalUncoveredSeconds" integer NOT NULL,
	"totalUnassignedSeconds" integer NOT NULL,
	"coveragePercentage" double precision NOT NULL,
	"memberStats" jsonb NOT NULL,
	"mapStats" jsonb NOT NULL,
	"gapsTimeline" jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "Event" (
	"id" text PRIMARY KEY,
	"guildId" text NOT NULL,
	"name" text NOT NULL,
	"world" text NOT NULL,
	"startsAt" timestamp(3),
	"endsAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"basePointsPerKill" integer DEFAULT 1 NOT NULL,
	"assignmentTimeoutMinutes" integer DEFAULT 5 NOT NULL,
	"participationConfirmationMinutes" integer DEFAULT 0 NOT NULL,
	"mapAssignmentCap" integer,
	"scoringMode" "EventScoringMode" DEFAULT 'SIMPLE'::"EventScoringMode" NOT NULL,
	"scoringRules" jsonb,
	"rulebookMarkdown" text
);

CREATE TABLE "GuildDocumentHistory" (
	"id" text PRIMARY KEY,
	"documentId" text NOT NULL,
	"guildId" text NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"action" "GuildDocumentHistoryAction" DEFAULT 'SAVE'::"GuildDocumentHistoryAction" NOT NULL,
	"actorMemberId" text NOT NULL,
	"editedAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "GuildDocument" (
	"id" text PRIMARY KEY,
	"guildId" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"createdByMemberId" text NOT NULL,
	"updatedByMemberId" text NOT NULL,
	"deletedAt" timestamp(3),
	"deletedByMemberId" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "GuildKillSummaryBucket" (
	"id" text PRIMARY KEY,
	"guildId" text NOT NULL,
	"world" text NOT NULL,
	"npcId" integer NOT NULL,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"uniqueKills" integer DEFAULT 0 NOT NULL,
	"periodStart" timestamp(3) NOT NULL,
	"lastKilledAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "GuildKillSummary" (
	"id" text PRIMARY KEY,
	"guildId" text NOT NULL,
	"world" text NOT NULL,
	"npcId" integer NOT NULL,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"uniqueKills" integer DEFAULT 0 NOT NULL,
	"lastKilledAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "Guild" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"icon" text,
	"ownerId" text NOT NULL,
	"vanityUrl" text,
	"notificationRuleLimit" integer DEFAULT 20 NOT NULL,
	"publicStatsCardEnabled" boolean DEFAULT false NOT NULL,
	"reservationMaxDurationMinutes" integer DEFAULT 180 NOT NULL,
	"reservationMinDurationMinutes" integer DEFAULT 30 NOT NULL,
	"reservationTimeGranularityMinutes" integer DEFAULT 15 NOT NULL,
	"reservationMaxAdvanceDays" integer DEFAULT 7 NOT NULL,
	"reservationActiveLimitPerSpot" integer DEFAULT 3 NOT NULL,
	"documentLimit" integer DEFAULT 50 NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);

CREATE TABLE "ItemSnapshot" (
	"id" serial PRIMARY KEY,
	"itemId" integer NOT NULL,
	"statsHash" text NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"lvl" integer,
	"rarity" "ItemRarity",
	"itemType" text,
	"statRaw" text NOT NULL,
	"statsSnapshot" jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "LootComment" (
	"id" serial PRIMARY KEY,
	"organizationLootRecordId" integer NOT NULL,
	"memberId" integer NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "LootItem" (
	"id" serial PRIMARY KEY,
	"lootId" integer NOT NULL,
	"itemSnapshotId" integer NOT NULL,
	"hid" text NOT NULL
);

CREATE TABLE "LootNpc" (
	"id" serial PRIMARY KEY,
	"lootId" integer NOT NULL,
	"npcSnapshotId" integer NOT NULL
);

CREATE TABLE "LootPlayer" (
	"id" serial PRIMARY KEY,
	"lootId" integer NOT NULL,
	"playerSnapshotId" integer NOT NULL,
	"lvl" integer,
	"hpp" integer
);

CREATE TABLE "LootSubmission" (
	"id" serial PRIMARY KEY,
	"organizationLootRecordId" integer NOT NULL,
	"memberId" integer NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "Loot" (
	"id" serial PRIMARY KEY,
	"uniqueId" text NOT NULL,
	"world" text NOT NULL,
	"source" "LootSource" NOT NULL,
	"location" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"lootShare" jsonb DEFAULT '{}' NOT NULL,
	"lootShareSource" "LootShareSource" DEFAULT 'NONE'::"LootShareSource" NOT NULL
);

CREATE TABLE "LootlogConfigNpc" (
	"id" serial PRIMARY KEY,
	"lootlogConfigId" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"allowedRarities" "ItemRarity"[] NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "LootlogConfig" (
	"id" text PRIMARY KEY,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "MapTemplate" (
	"id" text PRIMARY KEY,
	"guildId" text NOT NULL,
	"name" text NOT NULL,
	"maps" jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "MemberRefreshJob" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"requestedBy" text NOT NULL,
	"status" "RefreshJobStatus" DEFAULT 'PENDING'::"RefreshJobStatus" NOT NULL,
	"totalMembers" integer DEFAULT 0 NOT NULL,
	"processedMembers" integer DEFAULT 0 NOT NULL,
	"failedMembers" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"completedAt" timestamp(3)
);

CREATE TABLE "Member" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"guildId" text NOT NULL,
	"type" "MemberType" DEFAULT 'USER'::"MemberType" NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"banner" text,
	"active" boolean DEFAULT true NOT NULL,
	"globalUserId" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"lastDiscordSyncAt" timestamp(3),
	"lastDiscordAttemptAt" timestamp(3),
	"lastDiscordStatus" text
);

CREATE TABLE "_MemberToRole" (
	"A" integer,
	"B" text,
	CONSTRAINT "_MemberToRole_AB_pkey" PRIMARY KEY("A","B")
);

CREATE TABLE "NotificationJob" (
	"id" text PRIMARY KEY,
	"ruleId" integer NOT NULL,
	"targetId" integer NOT NULL,
	"ownerType" "NotificationOwnerType" NOT NULL,
	"ownerId" text NOT NULL,
	"jobKind" "NotificationJobKind" NOT NULL,
	"scheduledFor" timestamp(3) NOT NULL,
	"status" "NotificationJobStatus" DEFAULT 'PENDING'::"NotificationJobStatus" NOT NULL,
	"idempotencyKey" text NOT NULL,
	"sourceEntityType" text,
	"sourceEntityId" text,
	"sourceEventId" text,
	"payloadSnapshot" jsonb NOT NULL,
	"attemptCount" integer DEFAULT 0 NOT NULL,
	"lastError" text,
	"blockedReason" text,
	"providerMessageId" text,
	"processedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "NotificationRule" (
	"id" serial PRIMARY KEY,
	"ownerType" "NotificationOwnerType" NOT NULL,
	"ownerId" text NOT NULL,
	"triggerType" "NotificationTriggerType" NOT NULL,
	"guildId" text,
	"world" text,
	"name" text,
	"filters" jsonb,
	"contentTemplate" text,
	"scheduleStrategy" "NotificationScheduleStrategy",
	"scheduleAnchor" "NotificationScheduleAnchor",
	"scheduleOffsetMinutes" integer,
	"scheduledAt" timestamp(3),
	"scheduleIntervalType" "NotificationScheduleIntervalType",
	"scheduleIntervalValue" integer,
	"scheduleWeekday" integer,
	"scheduleTimeOfDay" text,
	"scheduledUntil" timestamp(3),
	"scheduleTimezone" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"dedupeWindowSeconds" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "NotificationRuleTarget" (
	"ruleId" integer,
	"targetId" integer,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "NotificationRuleTarget_pkey" PRIMARY KEY("ruleId","targetId")
);

CREATE TABLE "NotificationTarget" (
	"id" serial PRIMARY KEY,
	"ownerType" "NotificationOwnerType" NOT NULL,
	"ownerId" text NOT NULL,
	"provider" "NotificationProvider" NOT NULL,
	"targetType" "NotificationTargetType" NOT NULL,
	"externalId" text NOT NULL,
	"displayName" text,
	"guildName" text,
	"metadata" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"canSend" boolean DEFAULT true NOT NULL,
	"lastSyncedAt" timestamp(3),
	"lastDeliveryAt" timestamp(3),
	"lastDeliveryError" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "NpcKillStatsBucket" (
	"id" text PRIMARY KEY,
	"guildId" text NOT NULL,
	"memberId" integer NOT NULL,
	"userId" text NOT NULL,
	"world" text NOT NULL,
	"npcId" integer NOT NULL,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"memberKills" integer DEFAULT 0 NOT NULL,
	"periodStart" timestamp(3) NOT NULL,
	"lastKilledAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "NpcKillStats" (
	"id" text PRIMARY KEY,
	"guildId" text NOT NULL,
	"memberId" integer NOT NULL,
	"userId" text NOT NULL,
	"world" text NOT NULL,
	"npcId" integer NOT NULL,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"memberKills" integer DEFAULT 0 NOT NULL,
	"lastKilledAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "NpcSnapshot" (
	"id" serial PRIMARY KEY,
	"npcId" integer NOT NULL,
	"name" text NOT NULL,
	"type" "NpcType",
	"lvl" integer,
	"icon" text,
	"wt" integer,
	"margonemType" integer,
	"prof" "Profession",
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "OrganizationLootRecord" (
	"id" serial PRIMARY KEY,
	"lootId" integer NOT NULL,
	"guildId" text NOT NULL,
	"archivedAt" timestamp(3),
	"archivedByMemberId" integer,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "PlayerSnapshot" (
	"id" serial PRIMARY KEY,
	"world" text NOT NULL,
	"accountId" integer NOT NULL,
	"characterId" integer NOT NULL,
	"snapshotHash" text NOT NULL,
	"name" text NOT NULL,
	"prof" "Profession",
	"icon" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "ReservationShareInvitation" (
	"id" text PRIMARY KEY,
	"sourceGuildId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"createdByUserId" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"acceptedAt" timestamp(3),
	"acceptedByUserId" text,
	"targetGuildId" text,
	"revokedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "ReservationShare" (
	"id" text PRIMARY KEY,
	"firstGuildId" text NOT NULL,
	"secondGuildId" text NOT NULL,
	"createdByUserId" text NOT NULL,
	"acceptedByUserId" text NOT NULL,
	"revokedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "Reservation" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"spotId" text NOT NULL,
	"spotName" text NOT NULL,
	"startsAt" timestamp(3) NOT NULL,
	"endsAt" timestamp(3) NOT NULL,
	"createdByUserId" text,
	"authorDisplayName" text NOT NULL,
	"authorAvatarUrl" text,
	"reminderMinutesBefore" integer,
	"comment" text,
	"reservationId" text,
	"createdDate" timestamp(3),
	"fromDate" timestamp(3),
	"toDate" timestamp(3),
	"createdBy" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	CONSTRAINT "Reservation_valid_time_range_check" CHECK ("endsAt" > "startsAt"),
	CONSTRAINT "Reservation_reminder_minutes_check" CHECK ("reminderMinutesBefore" IS NULL OR "reminderMinutesBefore" IN (0, 5, 15, 30))
);

CREATE TABLE "Role" (
	"id" text PRIMARY KEY,
	"guildId" text NOT NULL,
	"name" text NOT NULL,
	"color" integer,
	"position" integer,
	"permissions" "Permission"[] DEFAULT '{}'::"Permission"[] NOT NULL,
	"lvlRangeFrom" integer DEFAULT 0,
	"lvlRangeTo" integer DEFAULT 500,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "TimerHistoryEntry" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"world" text NOT NULL,
	"timerKey" text NOT NULL,
	"npcId" integer NOT NULL,
	"npc" jsonb NOT NULL,
	"action" "TimerHistoryAction" NOT NULL,
	"actorMemberId" integer NOT NULL,
	"actorCharacterSnapshotId" integer,
	"actorCharacterLvl" integer,
	"minSpawnTime" timestamp(3),
	"maxSpawnTime" timestamp(3),
	"latestRespBaseSeconds" integer,
	"latestRespawnRandomness" integer,
	"wasReset" boolean,
	"windowOpenedAt" timestamp(3),
	"timerCreatedById" integer,
	"timerActorCharacterSnapshotId" integer,
	"timerActorCharacterLvl" integer,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "Timer" (
	"createdById" integer NOT NULL,
	"guildId" text,
	"npcId" integer NOT NULL,
	"timerKey" text,
	"world" text,
	"minSpawnTime" timestamp(3) NOT NULL,
	"maxSpawnTime" timestamp(3) NOT NULL,
	"latestRespBaseSeconds" integer DEFAULT 0 NOT NULL,
	"latestRespawnRandomness" integer DEFAULT 0 NOT NULL,
	"tempId" text,
	"wasReset" boolean DEFAULT false NOT NULL,
	"npc" jsonb NOT NULL,
	"windowOpenedAt" timestamp(3),
	"actorCharacterSnapshotId" integer,
	"actorCharacterLvl" integer,
	"deletedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	CONSTRAINT "Timer_pkey" PRIMARY KEY("guildId","world","timerKey")
);

CREATE TABLE "UserCharactersLootlogSettings" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"characterId" text NOT NULL,
	"catchingGuildIds" text[] DEFAULT '{}'::text[] NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "UserGameAccountSettings" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "UserGuildTimerSettings" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"guildId" text NOT NULL,
	"hiddenTimers" text[] DEFAULT '{}'::text[] NOT NULL,
	"pinnedTimers" text[] DEFAULT '{}'::text[] NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "UserKillStatsBucket" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"world" text NOT NULL,
	"npcId" integer NOT NULL,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"totalKills" integer DEFAULT 0 NOT NULL,
	"periodStart" timestamp(3) NOT NULL,
	"lastKilledAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "UserKillStats" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"world" text NOT NULL,
	"npcId" integer NOT NULL,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"totalKills" integer DEFAULT 0 NOT NULL,
	"lastKilledAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "UserPinnedEvent" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"eventId" text NOT NULL,
	"pinnedAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "UserPinnedReservationSpot" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"guildId" text NOT NULL,
	"spotId" text NOT NULL,
	"pinnedAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "UserSettingDocument" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"domain" text NOT NULL,
	"scopeType" "SettingsScopeType" NOT NULL,
	"scopeId" text NOT NULL,
	"overrides" jsonb DEFAULT '{}' NOT NULL,
	"schemaVersion" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "UserSettings" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"guildsOrder" text[] DEFAULT '{}'::text[] NOT NULL,
	"hiddenGuildIds" text[] DEFAULT '{}'::text[] NOT NULL,
	"theme" text DEFAULT 'default' NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "UserSoundSettings" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"masterVolume" double precision DEFAULT 0.5 NOT NULL,
	"notificationsVolume" double precision DEFAULT 0.5 NOT NULL,
	"detectorVolume" double precision DEFAULT 0.5 NOT NULL,
	"timersVolume" double precision DEFAULT 0.5 NOT NULL,
	"pingsVolume" double precision DEFAULT 0 NOT NULL,
	"notificationsConfig" jsonb DEFAULT '{}' NOT NULL,
	"detectorConfig" jsonb DEFAULT '{}' NOT NULL,
	"timersConfig" jsonb DEFAULT '{}' NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "UserTimerSettings" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"generalConfig" jsonb NOT NULL,
	"displayConfig" jsonb NOT NULL,
	"customColors" jsonb NOT NULL,
	"timersColors" jsonb NOT NULL,
	"alwaysVisibleExpiredTimers" jsonb DEFAULT '{}' NOT NULL,
	"defaultColorNames" jsonb NOT NULL,
	"overriddenDefaultColors" jsonb NOT NULL,
	"hiddenDefaultColors" jsonb NOT NULL,
	"timerFiltersEnabled" boolean DEFAULT true NOT NULL,
	"colorFiltersEnabled" boolean DEFAULT false NOT NULL,
	"timersSortOrder" text DEFAULT 'asc' NOT NULL,
	"syncEnabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "WatchedItem" (
	"id" serial PRIMARY KEY,
	"userId" text NOT NULL,
	"itemId" integer NOT NULL,
	"itemName" text NOT NULL,
	"world" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"notificationRuleId" integer,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX "DiscordGuildChannelSnapshot_guildId_channelId_key" ON "DiscordGuildChannelSnapshot" ("guildId","channelId");
CREATE INDEX "DiscordGuildChannelSnapshot_guildId_active_canSend_idx" ON "DiscordGuildChannelSnapshot" ("guildId","active","canSend");
CREATE INDEX "EventHeroKill_heroNpcId_idx" ON "EventHeroKill" ("heroNpcId");
CREATE INDEX "EventHeroKill_heroNpcId_killedAt_idx" ON "EventHeroKill" ("heroNpcId","killedAt");
CREATE INDEX "EventHeroKill_killedAt_idx" ON "EventHeroKill" ("killedAt");
CREATE UNIQUE INDEX "EventHeroNpc_eventId_npcName_key" ON "EventHeroNpc" ("eventId","npcName");
CREATE INDEX "EventHeroNpc_npcId_idx" ON "EventHeroNpc" ("npcId");
CREATE UNIQUE INDEX "EventKillPoint_killId_memberId_key" ON "EventKillPoint" ("killId","memberId");
CREATE INDEX "EventKillPoint_memberId_idx" ON "EventKillPoint" ("memberId");
CREATE INDEX "EventKillPoint_memberId_confirmationDeadlineAt_confirmedAt_idx" ON "EventKillPoint" ("memberId","confirmationDeadlineAt","confirmedAt");
CREATE INDEX "EventMapAssignmentHistory_mapId_assignedAt_idx" ON "EventMapAssignmentHistory" ("mapId","assignedAt");
CREATE INDEX "EventMapAssignmentHistory_heroNpcId_assignedAt_idx" ON "EventMapAssignmentHistory" ("heroNpcId","assignedAt");
CREATE INDEX "EventMapAssignmentHistory_memberId_idx" ON "EventMapAssignmentHistory" ("memberId");
CREATE INDEX "EventMapCoverageGap_mapId_gapType_endedAt_idx" ON "EventMapCoverageGap" ("mapId","gapType","endedAt");
CREATE INDEX "EventMapCoverageGap_heroNpcId_endedAt_idx" ON "EventMapCoverageGap" ("heroNpcId","endedAt");
CREATE INDEX "EventMapCoverageGap_heroNpcId_startedAt_idx" ON "EventMapCoverageGap" ("heroNpcId","startedAt");
CREATE INDEX "EventMapCoverageGap_mapId_startedAt_idx" ON "EventMapCoverageGap" ("mapId","startedAt");
CREATE UNIQUE INDEX "EventMapLocation_heroNpcId_name_key" ON "EventMapLocation" ("heroNpcId","name");
CREATE INDEX "EventMapLocation_heroNpcId_order_idx" ON "EventMapLocation" ("heroNpcId","order");
CREATE UNIQUE INDEX "EventMap_heroNpcId_mapId_key" ON "EventMap" ("heroNpcId","mapId");
CREATE INDEX "EventMap_mapId_idx" ON "EventMap" ("mapId");
CREATE INDEX "EventMap_mapName_idx" ON "EventMap" ("mapName");
CREATE INDEX "EventMap_locationId_idx" ON "EventMap" ("locationId");
CREATE INDEX "_EventMapToMember_B_index" ON "_EventMapToMember" ("B");
CREATE INDEX "EventPointsEditHistory_rankingId_editedAt_idx" ON "EventPointsEditHistory" ("rankingId","editedAt" DESC NULLS LAST);
CREATE INDEX "EventPresenceLog_mapId_memberId_idx" ON "EventPresenceLog" ("mapId","memberId");
CREATE INDEX "EventPresenceLog_mapId_endedAt_isAfk_memberId_idx" ON "EventPresenceLog" ("mapId","endedAt","isAfk","memberId");
CREATE INDEX "EventPresenceLog_startedAt_endedAt_idx" ON "EventPresenceLog" ("startedAt","endedAt");
CREATE UNIQUE INDEX "EventRanking_eventId_memberId_heroNpcName_key" ON "EventRanking" ("eventId","memberId","heroNpcName");
CREATE INDEX "EventRanking_eventId_totalPoints_idx" ON "EventRanking" ("eventId","totalPoints" DESC NULLS LAST);
CREATE UNIQUE INDEX "EventRespawnWindowSummary_killId_key" ON "EventRespawnWindowSummary" ("killId");
CREATE INDEX "EventRespawnWindowSummary_heroNpcId_idx" ON "EventRespawnWindowSummary" ("heroNpcId");
CREATE INDEX "EventRespawnWindowSummary_windowClosedAt_idx" ON "EventRespawnWindowSummary" ("windowClosedAt");
CREATE INDEX "Event_guildId_startsAt_endsAt_idx" ON "Event" ("guildId","startsAt","endsAt");
CREATE INDEX "Event_world_idx" ON "Event" ("world");
CREATE INDEX "GuildDocumentHistory_documentId_version_idx" ON "GuildDocumentHistory" ("documentId","version");
CREATE INDEX "GuildDocumentHistory_documentId_editedAt_idx" ON "GuildDocumentHistory" ("documentId","editedAt" DESC NULLS LAST);
CREATE INDEX "GuildDocumentHistory_guildId_editedAt_idx" ON "GuildDocumentHistory" ("guildId","editedAt" DESC NULLS LAST);
CREATE INDEX "GuildDocument_guildId_deletedAt_updatedAt_idx" ON "GuildDocument" ("guildId","deletedAt","updatedAt" DESC NULLS LAST);
CREATE INDEX "GuildDocument_guildId_deletedAt_idx" ON "GuildDocument" ("guildId","deletedAt" DESC NULLS LAST);
CREATE UNIQUE INDEX "GuildKillSummaryBucket_guildId_world_npcId_periodStart_key" ON "GuildKillSummaryBucket" ("guildId","world","npcId","periodStart");
CREATE INDEX "GuildKillSummaryBucket_guildId_periodStart_idx" ON "GuildKillSummaryBucket" ("guildId","periodStart");
CREATE INDEX "GuildKillSummaryBucket_guildId_npcType_periodStart_idx" ON "GuildKillSummaryBucket" ("guildId","npcType","periodStart");
CREATE INDEX "GuildKillSummaryBucket_guildId_world_npcType_periodStart_idx" ON "GuildKillSummaryBucket" ("guildId","world","npcType","periodStart");
CREATE UNIQUE INDEX "GuildKillSummary_guildId_world_npcId_key" ON "GuildKillSummary" ("guildId","world","npcId");
CREATE INDEX "GuildKillSummary_guildId_idx" ON "GuildKillSummary" ("guildId");
CREATE INDEX "GuildKillSummary_guildId_npcType_idx" ON "GuildKillSummary" ("guildId","npcType");
CREATE INDEX "GuildKillSummary_guildId_world_npcType_idx" ON "GuildKillSummary" ("guildId","world","npcType");
CREATE UNIQUE INDEX "Guild_vanityUrl_key" ON "Guild" ("vanityUrl");
CREATE INDEX "Guild_vanityUrl_idx" ON "Guild" ("vanityUrl");
CREATE UNIQUE INDEX "ItemSnapshot_itemId_statsHash_key" ON "ItemSnapshot" ("itemId","statsHash");
CREATE INDEX "ItemSnapshot_name_idx" ON "ItemSnapshot" ("name");
CREATE INDEX "ItemSnapshot_rarity_lvl_idx" ON "ItemSnapshot" ("rarity","lvl");
CREATE INDEX "LootComment_organizationLootRecordId_createdAt_idx" ON "LootComment" ("organizationLootRecordId","createdAt");
CREATE INDEX "LootComment_memberId_idx" ON "LootComment" ("memberId");
CREATE INDEX "LootItem_lootId_itemSnapshotId_idx" ON "LootItem" ("lootId","itemSnapshotId");
CREATE INDEX "LootItem_hid_lootId_idx" ON "LootItem" ("hid","lootId");
CREATE INDEX "LootItem_itemSnapshotId_lootId_idx" ON "LootItem" ("itemSnapshotId","lootId");
CREATE INDEX "LootNpc_lootId_idx" ON "LootNpc" ("lootId");
CREATE INDEX "LootNpc_npcSnapshotId_idx" ON "LootNpc" ("npcSnapshotId");
CREATE INDEX "LootPlayer_lootId_idx" ON "LootPlayer" ("lootId");
CREATE INDEX "LootPlayer_playerSnapshotId_idx" ON "LootPlayer" ("playerSnapshotId");
CREATE UNIQUE INDEX "LootSubmission_organizationLootRecordId_memberId_key" ON "LootSubmission" ("organizationLootRecordId","memberId");
CREATE INDEX "LootSubmission_memberId_idx" ON "LootSubmission" ("memberId");
CREATE UNIQUE INDEX "Loot_uniqueId_key" ON "Loot" ("uniqueId");
CREATE INDEX "Loot_createdAt_idx" ON "Loot" ("createdAt");
CREATE INDEX "Loot_world_createdAt_idx" ON "Loot" ("world","createdAt");
CREATE INDEX "Loot_world_id_idx" ON "Loot" ("world","id");
CREATE UNIQUE INDEX "MapTemplate_guildId_name_key" ON "MapTemplate" ("guildId","name");
CREATE INDEX "MapTemplate_guildId_idx" ON "MapTemplate" ("guildId");
CREATE INDEX "MemberRefreshJob_guildId_idx" ON "MemberRefreshJob" ("guildId");
CREATE INDEX "MemberRefreshJob_status_idx" ON "MemberRefreshJob" ("status");
CREATE UNIQUE INDEX "Member_userId_guildId_key" ON "Member" ("userId","guildId");
CREATE INDEX "Member_id_guildId_idx" ON "Member" ("id","guildId");
CREATE INDEX "Member_userId_guildId_active_lastDiscordSyncAt_idx" ON "Member" ("userId","guildId","active","lastDiscordSyncAt");
CREATE INDEX "Member_globalUserId_guildId_active_idx" ON "Member" ("globalUserId","guildId","active");
CREATE INDEX "_MemberToRole_B_index" ON "_MemberToRole" ("B");
CREATE UNIQUE INDEX "NotificationJob_idempotencyKey_key" ON "NotificationJob" ("idempotencyKey");
CREATE INDEX "NotificationJob_ruleId_status_idx" ON "NotificationJob" ("ruleId","status");
CREATE INDEX "NotificationJob_targetId_status_idx" ON "NotificationJob" ("targetId","status");
CREATE INDEX "NotificationJob_ownerType_ownerId_status_scheduledFor_idx" ON "NotificationJob" ("ownerType","ownerId","status","scheduledFor");
CREATE INDEX "NotificationJob_status_scheduledFor_idx" ON "NotificationJob" ("status","scheduledFor");
CREATE INDEX "NotificationRule_ownerType_ownerId_enabled_idx" ON "NotificationRule" ("ownerType","ownerId","enabled");
CREATE INDEX "NotificationRule_guildId_world_triggerType_enabled_idx" ON "NotificationRule" ("guildId","world","triggerType","enabled");
CREATE INDEX "NotificationRuleTarget_targetId_idx" ON "NotificationRuleTarget" ("targetId");
CREATE UNIQUE INDEX "NotificationTarget_ownerType_ownerId_provider_targetType_ex_key" ON "NotificationTarget" ("ownerType","ownerId","provider","targetType","externalId");
CREATE INDEX "NotificationTarget_ownerType_ownerId_active_idx" ON "NotificationTarget" ("ownerType","ownerId","active");
CREATE UNIQUE INDEX "NpcKillStatsBucket_guildId_memberId_world_npcId_periodStart_key" ON "NpcKillStatsBucket" ("guildId","memberId","world","npcId","periodStart");
CREATE INDEX "NpcKillStatsBucket_guildId_periodStart_idx" ON "NpcKillStatsBucket" ("guildId","periodStart");
CREATE INDEX "NpcKillStatsBucket_guildId_npcType_periodStart_idx" ON "NpcKillStatsBucket" ("guildId","npcType","periodStart");
CREATE INDEX "NpcKillStatsBucket_guildId_world_npcType_periodStart_idx" ON "NpcKillStatsBucket" ("guildId","world","npcType","periodStart");
CREATE INDEX "NpcKillStatsBucket_memberId_periodStart_idx" ON "NpcKillStatsBucket" ("memberId","periodStart");
CREATE UNIQUE INDEX "NpcKillStats_guildId_memberId_world_npcId_key" ON "NpcKillStats" ("guildId","memberId","world","npcId");
CREATE INDEX "NpcKillStats_guildId_idx" ON "NpcKillStats" ("guildId");
CREATE INDEX "NpcKillStats_guildId_npcType_idx" ON "NpcKillStats" ("guildId","npcType");
CREATE INDEX "NpcKillStats_guildId_world_npcType_idx" ON "NpcKillStats" ("guildId","world","npcType");
CREATE INDEX "NpcKillStats_memberId_idx" ON "NpcKillStats" ("memberId");
CREATE UNIQUE INDEX "NpcSnapshot_npcId_name_key" ON "NpcSnapshot" ("npcId","name");
CREATE INDEX "NpcSnapshot_name_idx" ON "NpcSnapshot" ("name");
CREATE INDEX "NpcSnapshot_type_lvl_idx" ON "NpcSnapshot" ("type","lvl");
CREATE UNIQUE INDEX "OrganizationLootRecord_guildId_lootId_key" ON "OrganizationLootRecord" ("guildId","lootId");
CREATE INDEX "OrganizationLootRecord_lootId_idx" ON "OrganizationLootRecord" ("lootId");
CREATE INDEX "OrganizationLootRecord_guildId_archivedAt_lootId_idx" ON "OrganizationLootRecord" ("guildId","archivedAt","lootId");
CREATE INDEX "OrganizationLootRecord_archivedByMemberId_idx" ON "OrganizationLootRecord" ("archivedByMemberId");
CREATE UNIQUE INDEX "PlayerSnapshot_world_accountId_characterId_snapshotHash_key" ON "PlayerSnapshot" ("world","accountId","characterId","snapshotHash");
CREATE INDEX "PlayerSnapshot_world_name_idx" ON "PlayerSnapshot" ("world","name");
CREATE INDEX "PlayerSnapshot_accountId_characterId_idx" ON "PlayerSnapshot" ("accountId","characterId");
CREATE INDEX "PlayerSnapshot_name_idx" ON "PlayerSnapshot" ("name");
CREATE UNIQUE INDEX "ReservationShareInvitation_tokenHash_key" ON "ReservationShareInvitation" ("tokenHash");
CREATE INDEX "ReservationShareInvitation_sourceGuildId_createdAt_idx" ON "ReservationShareInvitation" ("sourceGuildId","createdAt");
CREATE INDEX "ReservationShareInvitation_targetGuildId_idx" ON "ReservationShareInvitation" ("targetGuildId");
CREATE INDEX "ReservationShareInvitation_expiresAt_idx" ON "ReservationShareInvitation" ("expiresAt");
CREATE UNIQUE INDEX "ReservationShare_firstGuildId_secondGuildId_key" ON "ReservationShare" ("firstGuildId","secondGuildId");
CREATE INDEX "ReservationShare_firstGuildId_revokedAt_idx" ON "ReservationShare" ("firstGuildId","revokedAt");
CREATE INDEX "ReservationShare_secondGuildId_revokedAt_idx" ON "ReservationShare" ("secondGuildId","revokedAt");
CREATE INDEX "Reservation_guildId_spotId_startsAt_endsAt_idx" ON "Reservation" ("guildId","spotId","startsAt","endsAt");
CREATE INDEX "Reservation_guildId_endsAt_idx" ON "Reservation" ("guildId","endsAt");
CREATE INDEX "Reservation_createdByUserId_endsAt_idx" ON "Reservation" ("createdByUserId","endsAt");
CREATE UNIQUE INDEX "Role_id_guildId_key" ON "Role" ("id","guildId");
CREATE INDEX "Role_id_guildId_idx" ON "Role" ("id","guildId");
CREATE INDEX "TimerHistoryEntry_guildId_world_timerKey_createdAt_idx" ON "TimerHistoryEntry" ("guildId","world","timerKey","createdAt");
CREATE INDEX "TimerHistoryEntry_guildId_world_createdAt_idx" ON "TimerHistoryEntry" ("guildId","world","createdAt");
CREATE INDEX "TimerHistoryEntry_actorMemberId_idx" ON "TimerHistoryEntry" ("actorMemberId");
CREATE INDEX "TimerHistoryEntry_actorCharacterSnapshotId_idx" ON "TimerHistoryEntry" ("actorCharacterSnapshotId");
CREATE INDEX "TimerHistoryEntry_timerCreatedById_idx" ON "TimerHistoryEntry" ("timerCreatedById");
CREATE INDEX "TimerHistoryEntry_timerActorCharacterSnapshotId_idx" ON "TimerHistoryEntry" ("timerActorCharacterSnapshotId");
CREATE INDEX "Timer_guildId_world_timerKey_idx" ON "Timer" ("guildId","world","timerKey");
CREATE INDEX "Timer_npcId_guildId_idx" ON "Timer" ("npcId","guildId");
CREATE INDEX "Timer_guildId_maxSpawnTime_idx" ON "Timer" ("guildId","maxSpawnTime");
CREATE INDEX "Timer_guildId_world_deletedAt_maxSpawnTime_idx" ON "Timer" ("guildId","world","deletedAt","maxSpawnTime");
CREATE INDEX "Timer_world_guildId_idx" ON "Timer" ("world","guildId");
CREATE INDEX "Timer_createdById_idx" ON "Timer" ("createdById");
CREATE INDEX "Timer_actorCharacterSnapshotId_idx" ON "Timer" ("actorCharacterSnapshotId");
CREATE INDEX "idx_timer_npc_name" ON "Timer" (("npc"->>'name'));
CREATE UNIQUE INDEX "UserCharactersLootlogSettings_userId_accountId_characterId_key" ON "UserCharactersLootlogSettings" ("userId","accountId","characterId");
CREATE UNIQUE INDEX "UserGameAccountSettings_userId_accountId_key" ON "UserGameAccountSettings" ("userId","accountId");
CREATE INDEX "UserGameAccountSettings_userId_idx" ON "UserGameAccountSettings" ("userId");
CREATE UNIQUE INDEX "UserGuildTimerSettings_userId_guildId_key" ON "UserGuildTimerSettings" ("userId","guildId");
CREATE INDEX "UserGuildTimerSettings_userId_idx" ON "UserGuildTimerSettings" ("userId");
CREATE INDEX "UserGuildTimerSettings_guildId_idx" ON "UserGuildTimerSettings" ("guildId");
CREATE UNIQUE INDEX "UserKillStatsBucket_userId_world_npcId_periodStart_key" ON "UserKillStatsBucket" ("userId","world","npcId","periodStart");
CREATE INDEX "UserKillStatsBucket_userId_periodStart_idx" ON "UserKillStatsBucket" ("userId","periodStart");
CREATE INDEX "UserKillStatsBucket_userId_npcType_periodStart_idx" ON "UserKillStatsBucket" ("userId","npcType","periodStart");
CREATE INDEX "UserKillStatsBucket_userId_world_npcType_periodStart_idx" ON "UserKillStatsBucket" ("userId","world","npcType","periodStart");
CREATE UNIQUE INDEX "UserKillStats_userId_world_npcId_key" ON "UserKillStats" ("userId","world","npcId");
CREATE INDEX "UserKillStats_userId_idx" ON "UserKillStats" ("userId");
CREATE INDEX "UserKillStats_userId_npcType_idx" ON "UserKillStats" ("userId","npcType");
CREATE INDEX "UserKillStats_userId_world_npcType_idx" ON "UserKillStats" ("userId","world","npcType");
CREATE UNIQUE INDEX "UserPinnedEvent_userId_eventId_key" ON "UserPinnedEvent" ("userId","eventId");
CREATE INDEX "UserPinnedEvent_userId_pinnedAt_idx" ON "UserPinnedEvent" ("userId","pinnedAt" DESC NULLS LAST);
CREATE INDEX "UserPinnedEvent_eventId_idx" ON "UserPinnedEvent" ("eventId");
CREATE UNIQUE INDEX "UserPinnedReservationSpot_userId_guildId_spotId_key" ON "UserPinnedReservationSpot" ("userId","guildId","spotId");
CREATE INDEX "UserPinnedReservationSpot_userId_guildId_pinnedAt_idx" ON "UserPinnedReservationSpot" ("userId","guildId","pinnedAt" DESC NULLS LAST);
CREATE UNIQUE INDEX "UserSettingDocument_userId_domain_scopeType_scopeId_key" ON "UserSettingDocument" ("userId","domain","scopeType","scopeId");
CREATE INDEX "UserSettingDocument_userId_domain_idx" ON "UserSettingDocument" ("userId","domain");
CREATE INDEX "UserSettingDocument_userId_scopeType_scopeId_idx" ON "UserSettingDocument" ("userId","scopeType","scopeId");
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings" ("userId");
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings" ("userId");
CREATE UNIQUE INDEX "UserSoundSettings_userId_key" ON "UserSoundSettings" ("userId");
CREATE INDEX "UserSoundSettings_userId_idx" ON "UserSoundSettings" ("userId");
CREATE UNIQUE INDEX "UserTimerSettings_userId_key" ON "UserTimerSettings" ("userId");
CREATE INDEX "UserTimerSettings_userId_idx" ON "UserTimerSettings" ("userId");
CREATE UNIQUE INDEX "WatchedItem_notificationRuleId_key" ON "WatchedItem" ("notificationRuleId");
CREATE UNIQUE INDEX "WatchedItem_userId_itemId_world_key" ON "WatchedItem" ("userId","itemId","world");
CREATE INDEX "WatchedItem_userId_enabled_idx" ON "WatchedItem" ("userId","enabled");
CREATE INDEX "WatchedItem_itemId_world_enabled_idx" ON "WatchedItem" ("itemId","world","enabled");
ALTER TABLE "DiscordGuildChannelSnapshot" ADD CONSTRAINT "DiscordGuildChannelSnapshot_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscordGuildSyncState" ADD CONSTRAINT "DiscordGuildSyncState_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventHeroKill" ADD CONSTRAINT "EventHeroKill_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventHeroKill" ADD CONSTRAINT "EventHeroKill_timerCreatedById_fkey" FOREIGN KEY ("timerCreatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventHeroNpc" ADD CONSTRAINT "EventHeroNpc_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventKillPoint" ADD CONSTRAINT "EventKillPoint_killId_fkey" FOREIGN KEY ("killId") REFERENCES "EventHeroKill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventKillPoint" ADD CONSTRAINT "EventKillPoint_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventMapAssignmentHistory" ADD CONSTRAINT "EventMapAssignmentHistory_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventMapAssignmentHistory" ADD CONSTRAINT "EventMapAssignmentHistory_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventMapAssignmentHistory" ADD CONSTRAINT "EventMapAssignmentHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventMapCoverageGap" ADD CONSTRAINT "EventMapCoverageGap_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventMapCoverageGap" ADD CONSTRAINT "EventMapCoverageGap_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventMapLocation" ADD CONSTRAINT "EventMapLocation_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventMap" ADD CONSTRAINT "EventMap_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventMap" ADD CONSTRAINT "EventMap_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "EventMapLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_EventMapToMember" ADD CONSTRAINT "_EventMapToMember_A_fkey" FOREIGN KEY ("A") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_EventMapToMember" ADD CONSTRAINT "_EventMapToMember_B_fkey" FOREIGN KEY ("B") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventPointsEditHistory" ADD CONSTRAINT "EventPointsEditHistory_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "EventRanking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventPresenceLog" ADD CONSTRAINT "EventPresenceLog_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "EventMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventPresenceLog" ADD CONSTRAINT "EventPresenceLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventRanking" ADD CONSTRAINT "EventRanking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRanking" ADD CONSTRAINT "EventRanking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventRespawnWindowSummary" ADD CONSTRAINT "EventRespawnWindowSummary_heroNpcId_fkey" FOREIGN KEY ("heroNpcId") REFERENCES "EventHeroNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRespawnWindowSummary" ADD CONSTRAINT "EventRespawnWindowSummary_killId_fkey" FOREIGN KEY ("killId") REFERENCES "EventHeroKill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuildDocumentHistory" ADD CONSTRAINT "GuildDocumentHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "GuildDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuildDocumentHistory" ADD CONSTRAINT "GuildDocumentHistory_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuildDocument" ADD CONSTRAINT "GuildDocument_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuildKillSummaryBucket" ADD CONSTRAINT "GuildKillSummaryBucket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuildKillSummary" ADD CONSTRAINT "GuildKillSummary_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootComment" ADD CONSTRAINT "LootComment_organizationLootRecordId_fkey" FOREIGN KEY ("organizationLootRecordId") REFERENCES "OrganizationLootRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LootComment" ADD CONSTRAINT "LootComment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootItem" ADD CONSTRAINT "LootItem_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootItem" ADD CONSTRAINT "LootItem_itemSnapshotId_fkey" FOREIGN KEY ("itemSnapshotId") REFERENCES "ItemSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootNpc" ADD CONSTRAINT "LootNpc_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootNpc" ADD CONSTRAINT "LootNpc_npcSnapshotId_fkey" FOREIGN KEY ("npcSnapshotId") REFERENCES "NpcSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootPlayer" ADD CONSTRAINT "LootPlayer_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootPlayer" ADD CONSTRAINT "LootPlayer_playerSnapshotId_fkey" FOREIGN KEY ("playerSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootSubmission" ADD CONSTRAINT "LootSubmission_organizationLootRecordId_fkey" FOREIGN KEY ("organizationLootRecordId") REFERENCES "OrganizationLootRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LootSubmission" ADD CONSTRAINT "LootSubmission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootlogConfigNpc" ADD CONSTRAINT "LootlogConfigNpc_lootlogConfigId_fkey" FOREIGN KEY ("lootlogConfigId") REFERENCES "LootlogConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MapTemplate" ADD CONSTRAINT "MapTemplate_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Member" ADD CONSTRAINT "Member_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_MemberToRole" ADD CONSTRAINT "_MemberToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_MemberToRole" ADD CONSTRAINT "_MemberToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NotificationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "NotificationTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationRule" ADD CONSTRAINT "NotificationRule_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationRuleTarget" ADD CONSTRAINT "NotificationRuleTarget_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NotificationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationRuleTarget" ADD CONSTRAINT "NotificationRuleTarget_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "NotificationTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NpcKillStatsBucket" ADD CONSTRAINT "NpcKillStatsBucket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NpcKillStatsBucket" ADD CONSTRAINT "NpcKillStatsBucket_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NpcKillStats" ADD CONSTRAINT "NpcKillStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NpcKillStats" ADD CONSTRAINT "NpcKillStats_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationLootRecord" ADD CONSTRAINT "OrganizationLootRecord_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationLootRecord" ADD CONSTRAINT "OrganizationLootRecord_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationLootRecord" ADD CONSTRAINT "OrganizationLootRecord_archivedByMemberId_fkey" FOREIGN KEY ("archivedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReservationShareInvitation" ADD CONSTRAINT "ReservationShareInvitation_sourceGuildId_fkey" FOREIGN KEY ("sourceGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReservationShareInvitation" ADD CONSTRAINT "ReservationShareInvitation_targetGuildId_fkey" FOREIGN KEY ("targetGuildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReservationShare" ADD CONSTRAINT "ReservationShare_firstGuildId_fkey" FOREIGN KEY ("firstGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReservationShare" ADD CONSTRAINT "ReservationShare_secondGuildId_fkey" FOREIGN KEY ("secondGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Role" ADD CONSTRAINT "Role_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_actorCharacterSnapshotId_fkey" FOREIGN KEY ("actorCharacterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_timerCreatedById_fkey" FOREIGN KEY ("timerCreatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimerHistoryEntry" ADD CONSTRAINT "TimerHistoryEntry_timerActorCharacterSnapshotId_fkey" FOREIGN KEY ("timerActorCharacterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_actorCharacterSnapshotId_fkey" FOREIGN KEY ("actorCharacterSnapshotId") REFERENCES "PlayerSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserPinnedEvent" ADD CONSTRAINT "UserPinnedEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPinnedReservationSpot" ADD CONSTRAINT "UserPinnedReservationSpot_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WatchedItem" ADD CONSTRAINT "WatchedItem_notificationRuleId_fkey" FOREIGN KEY ("notificationRuleId") REFERENCES "NotificationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
