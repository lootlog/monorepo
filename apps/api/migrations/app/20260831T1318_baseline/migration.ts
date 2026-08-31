#!/usr/bin/env -S node
import type { Contract as End } from "../../snapshots/fef007f1cd09f7043a204558ea830e71476fbca2649b2d9fedac9dd57b8ab037/contract";
import endContract from "../../snapshots/fef007f1cd09f7043a204558ea830e71476fbca2649b2d9fedac9dd57b8ab037/contract.json" with { type: "json" };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  rawSql,
} from "@prisma/orm-postgres/migration";

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: "public" }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "CoverageGapType",
        members: ["UNASSIGNED", "UNCOVERED"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "DiscordGuildSyncStatus",
        members: ["SYNCED", "SYNCING", "FAILED", "STALE", "NOT_FOUND"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "EventScoringMode",
        members: ["SIMPLE", "ADVANCED"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "GuildDocumentHistoryAction",
        members: ["SAVE", "DELETE", "RESTORE"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "ItemRarity",
        members: ["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "ItemType",
        members: [
          "ONE_HAND_WEAPON",
          "TWO_HAND_WEAPON",
          "ONE_AND_HALF_HAND_WEAPON",
          "DISTANCE_WEAPON",
          "HELP_WEAPON",
          "WAND_WEAPON",
          "ORB_WEAPON",
          "ARMOR",
          "HELMET",
          "BOOTS",
          "GLOVES",
          "RING",
          "NECKLACE",
          "SHIELD",
          "NEUTRAL",
          "CONSUME",
          "GOLD",
          "KEYS",
          "QUEST",
          "RENEWABLE",
          "ARROWS",
          "TALISMAN",
          "BOOK",
          "BAG",
          "BLESS",
          "UPGRADE",
          "RECIPE",
          "COINAGE",
          "QUIVER",
          "OUTFITS",
          "PETS",
          "TELEPORTS",
        ],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "LootShareSource",
        members: ["NONE", "ITEM_OWNER", "CHAT_MESSAGE"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "LootSource",
        members: ["LOOTBOX", "DIALOG", "FIGHT"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "MemberType",
        members: ["OWNER", "ADMIN", "USER", "BOT"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "NotificationJobKind",
        members: ["SCHEDULED", "INSTANT", "TEST"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "NotificationJobStatus",
        members: [
          "PENDING",
          "PROCESSING",
          "SENT",
          "FAILED",
          "BLOCKED",
          "CANCELED",
        ],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "NotificationOwnerType",
        members: ["GUILD", "USER"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "NotificationProvider",
        members: ["DISCORD"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "NotificationScheduleAnchor",
        members: ["MIN_SPAWN", "MAX_SPAWN"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "NotificationScheduleIntervalType",
        members: ["ONCE", "HOURLY", "DAILY", "WEEKLY"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "NotificationScheduleStrategy",
        members: ["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "NotificationTargetType",
        members: ["CHANNEL", "DM"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "NotificationTriggerType",
        members: [
          "TIMER_BEFORE_SPAWN",
          "NPC_SPAWNED",
          "WATCHED_ITEM_DROPPED",
          "SCHEDULED_MESSAGE",
        ],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "NpcType",
        members: [
          "COMMON",
          "ELITE",
          "ELITE2",
          "ELITE3",
          "HERO",
          "EVENT_HERO",
          "TITAN",
          "COLOSSUS",
          "NPC",
        ],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "Permission",
        members: [
          "OWNER",
          "ADMIN",
          "LOOTLOG_MANAGE",
          "LOOTLOG_ACCESS",
          "LOOTLOG_LOOTS_READ",
          "LOOTLOG_LOOTS_WRITE",
          "LOOTLOG_LOOTS_TITANS_READ",
          "LOOTLOG_LOOTS_HEROES_READ",
          "LOOTLOG_TIMERS_READ",
          "LOOTLOG_TIMERS_WRITE",
          "LOOTLOG_TIMERS_RESET",
          "LOOTLOG_TIMERS_DELETE",
          "LOOTLOG_TIMERS_TITANS_READ",
          "LOOTLOG_TIMERS_HEROES_READ",
          "LOOTLOG_RESERVATIONS_READ",
          "LOOTLOG_RESERVATIONS_WRITE",
          "LOOTLOG_MEMBERS_READ",
          "LOOTLOG_CHAT_READ",
          "LOOTLOG_CHAT_WRITE",
          "LOOTLOG_CHAT_TITANS_READ",
          "LOOTLOG_CHAT_HEROES_READ",
          "LOOTLOG_NOTIFICATIONS_READ",
          "LOOTLOG_NOTIFICATIONS_SEND",
          "LOOTLOG_NOTIFICATIONS_TITANS_READ",
          "LOOTLOG_NOTIFICATIONS_HEROES_READ",
          "LOOTLOG_EVENTS_MANAGE",
          "LOOTLOG_EVENTS_READ",
          "LOOTLOG_EVENTS_WRITE",
          "LOOTLOG_ONLINE_PLAYERS_READ",
          "LOOTLOG_DOCS_READ",
          "LOOTLOG_DOCS_WRITE",
          "LOOTLOG_LOOTS_ARCHIVE",
        ],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "PointsEditType",
        members: ["KILL_POINT", "RANKING"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "Profession",
        members: [
          "WARRIOR",
          "PALADIN",
          "HUNTER",
          "MAGE",
          "BLADE_DANCER",
          "TRACKER",
        ],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "RefreshJobStatus",
        members: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "SettingsScopeType",
        members: ["USER", "GAME_ACCOUNT", "CHARACTER", "GUILD"],
      }),
      this.createNativeEnumType({
        schema: "public",
        typeName: "TimerHistoryAction",
        members: ["CREATE", "RESET", "DELETE", "RESTORE"],
      }),
      this.createTable({
        schema: "public",
        table: "DiscordGuildChannelSnapshot",
        columns: [
          col("active", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("canSend", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("canView", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("channelId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("channelType", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("grantedPermissions", "text[]", {
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("hasRequiredPermissions", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lastSyncedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("missingPermissions", "text[]", {
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("parentId", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("position", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("requiredPermissions", "text[]", {
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "DiscordGuildChannelSnapshot_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "DiscordGuildSyncState",
        columns: [
          col("channelCount", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("grantedPermissions", "text[]", {
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("hasRequiredPermissions", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("lastAttemptAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("lastError", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("lastSuccessAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("missingPermissions", "text[]", {
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("requiredPermissions", "text[]", {
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("selectableChannelCount", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("status", '"DiscordGuildSyncStatus"', {
            notNull: true,
            default: lit("STALE"),
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "DiscordGuildSyncStatus" },
            },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [
          primaryKey(["guildId"], { name: "DiscordGuildSyncState_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Event",
        columns: [
          col("assignmentTimeoutMinutes", "int4", {
            notNull: true,
            default: lit(5),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("basePointsPerKill", "int4", {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("endsAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("mapAssignmentCap", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("participationConfirmationMinutes", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("rulebookMarkdown", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("scoringMode", '"EventScoringMode"', {
            notNull: true,
            default: lit("SIMPLE"),
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "EventScoringMode" },
            },
          }),
          col("scoringRules", "jsonb", { codecRef: { codecId: "pg/jsonb@1" } }),
          col("startsAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "Event_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "EventHeroKill",
        columns: [
          col("heroNpcId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("isManualClose", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("killedAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("maxSpawnTimeAtKill", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("minSpawnTimeAtKill", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("timerCreatedById", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "EventHeroKill_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "EventHeroNpc",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("eventId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("npcIcon", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcId", "int4", { codecRef: { codecId: "pg/int4@1" } }),
          col("npcLvl", "int4", { codecRef: { codecId: "pg/int4@1" } }),
          col("npcName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "EventHeroNpc_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "EventKillPoint",
        columns: [
          col("afkPercentage", "float8", {
            notNull: true,
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("basePoints", "float8", {
            notNull: true,
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("bonusBreakdown", "jsonb", {
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("confirmationDeadlineAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("confirmationExpiredAcknowledgedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("confirmedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("killId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("manualAdjustmentPoints", "float8", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("mapPresenceData", "jsonb", {
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("memberId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("points", "float8", {
            notNull: true,
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("timeOnMapSeconds", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("trackingDurationPercentage", "float8", {
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("trackingDurationSeconds", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("wasPresent", "bool", {
            notNull: true,
            codecRef: { codecId: "pg/bool@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "EventKillPoint_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "EventMap",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("heroNpcId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("locationId", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("mapId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("mapName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "EventMap_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "EventMapAssignmentHistory",
        columns: [
          col("assignedAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("heroNpcId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("mapId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("memberId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("unassignedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "EventMapAssignmentHistory_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "EventMapCoverageGap",
        columns: [
          col("durationSeconds", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("endedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("gapType", '"CoverageGapType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "CoverageGapType" },
            },
          }),
          col("hadAssignedMembers", "bool", {
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("heroNpcId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("mapId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("startedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "EventMapCoverageGap_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "EventMapLocation",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("heroNpcId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("order", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "EventMapLocation_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "EventPointsEditHistory",
        columns: [
          col("comment", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("editType", '"PointsEditType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "PointsEditType" },
            },
          }),
          col("editedAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("editedByUserId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("newPoints", "float8", {
            notNull: true,
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("previousPoints", "float8", {
            notNull: true,
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("rankingId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "EventPointsEditHistory_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "EventPresenceLog",
        columns: [
          col("endedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("isAfk", "bool", {
            notNull: true,
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("mapId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("memberId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("startedAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "EventPresenceLog_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "EventRanking",
        columns: [
          col("avgAfkPercentage", "float8", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("eventId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("heroNpcName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("manualAdjustmentPoints", "float8", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("memberId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("pointsModified", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("totalKills", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("totalPoints", "float8", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("totalTimeSeconds", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "EventRanking_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "EventRespawnWindowSummary",
        columns: [
          col("coveragePercentage", "float8", {
            notNull: true,
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("gapsTimeline", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("heroNpcId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("killId", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("mapStats", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("maxSpawnTime", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("memberStats", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("minSpawnTime", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("totalCoverageSeconds", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("totalUnassignedSeconds", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("totalUncoveredSeconds", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("totalWindowSeconds", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("wasManualClose", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("windowClosedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("windowOpenedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "EventRespawnWindowSummary_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Guild",
        columns: [
          col("active", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("documentLimit", "int4", {
            notNull: true,
            default: lit(50),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("icon", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("notificationRuleLimit", "int4", {
            notNull: true,
            default: lit(20),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("ownerId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("publicStatsCardEnabled", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("reservationActiveLimitPerSpot", "int4", {
            notNull: true,
            default: lit(3),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("reservationMaxAdvanceDays", "int4", {
            notNull: true,
            default: lit(7),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("reservationMaxDurationMinutes", "int4", {
            notNull: true,
            default: lit(180),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("reservationMinDurationMinutes", "int4", {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("reservationTimeGranularityMinutes", "int4", {
            notNull: true,
            default: lit(15),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("vanityUrl", "text", { codecRef: { codecId: "pg/text@1" } }),
        ],
        constraints: [primaryKey(["id"], { name: "Guild_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "GuildDocument",
        columns: [
          col("content", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("createdByMemberId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("deletedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("deletedByMemberId", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("title", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("updatedByMemberId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("version", "int4", {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: "pg/int4@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "GuildDocument_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "GuildDocumentHistory",
        columns: [
          col("action", '"GuildDocumentHistoryAction"', {
            notNull: true,
            default: lit("SAVE"),
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "GuildDocumentHistoryAction" },
            },
          }),
          col("actorMemberId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("content", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("documentId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("editedAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("title", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("version", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "GuildDocumentHistory_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "GuildKillSummary",
        columns: [
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("lastKilledAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("npcIcon", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcLvl", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("npcProf", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcType", '"NpcType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NpcType" },
            },
          }),
          col("uniqueKills", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "GuildKillSummary_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "GuildKillSummaryBucket",
        columns: [
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("lastKilledAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("npcIcon", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcLvl", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("npcProf", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcType", '"NpcType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NpcType" },
            },
          }),
          col("periodStart", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("uniqueKills", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "GuildKillSummaryBucket_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ItemSnapshot",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("icon", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("itemId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("itemType", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("lvl", "int4", { codecRef: { codecId: "pg/int4@1" } }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("rarity", '"ItemRarity"', {
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "ItemRarity" },
            },
          }),
          col("statRaw", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("statsHash", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("statsSnapshot", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "ItemSnapshot_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "Loot",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("location", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("lootShare", "jsonb", {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("lootShareSource", '"LootShareSource"', {
            notNull: true,
            default: lit("NONE"),
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "LootShareSource" },
            },
          }),
          col("source", '"LootSource"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "LootSource" },
            },
          }),
          col("uniqueId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "Loot_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "LootComment",
        columns: [
          col("content", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("memberId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("organizationLootRecordId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "LootComment_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "LootItem",
        columns: [
          col("hid", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("itemSnapshotId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lootId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "LootItem_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "LootNpc",
        columns: [
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lootId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcSnapshotId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "LootNpc_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "LootPlayer",
        columns: [
          col("hpp", "int4", { codecRef: { codecId: "pg/int4@1" } }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lootId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lvl", "int4", { codecRef: { codecId: "pg/int4@1" } }),
          col("playerSnapshotId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "LootPlayer_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "LootSubmission",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("memberId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("organizationLootRecordId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "LootSubmission_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "LootlogConfig",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "LootlogConfig_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "LootlogConfigNpc",
        columns: [
          col("allowedRarities", '"ItemRarity"[]', {
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "ItemRarity" },
              many: true,
            },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lootlogConfigId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("npcType", '"NpcType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NpcType" },
            },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "LootlogConfigNpc_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "MapTemplate",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("maps", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "MapTemplate_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "Member",
        columns: [
          col("active", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("avatar", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("banner", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("globalUserId", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lastDiscordAttemptAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("lastDiscordStatus", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("lastDiscordSyncAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("type", '"MemberType"', {
            notNull: true,
            default: lit("USER"),
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "MemberType" },
            },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "Member_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "MemberRefreshJob",
        columns: [
          col("completedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("failedMembers", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("processedMembers", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("requestedBy", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("status", '"RefreshJobStatus"', {
            notNull: true,
            default: lit("PENDING"),
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "RefreshJobStatus" },
            },
          }),
          col("totalMembers", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "MemberRefreshJob_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "NotificationJob",
        columns: [
          col("attemptCount", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("blockedReason", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("idempotencyKey", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("jobKind", '"NotificationJobKind"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationJobKind" },
            },
          }),
          col("lastError", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("ownerId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("ownerType", '"NotificationOwnerType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationOwnerType" },
            },
          }),
          col("payloadSnapshot", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("processedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("providerMessageId", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("ruleId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("scheduledFor", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("sourceEntityId", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("sourceEntityType", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("sourceEventId", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("status", '"NotificationJobStatus"', {
            notNull: true,
            default: lit("PENDING"),
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationJobStatus" },
            },
          }),
          col("targetId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "NotificationJob_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "NotificationRule",
        columns: [
          col("contentTemplate", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("dedupeWindowSeconds", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("enabled", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("filters", "jsonb", { codecRef: { codecId: "pg/jsonb@1" } }),
          col("guildId", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("name", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("ownerId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("ownerType", '"NotificationOwnerType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationOwnerType" },
            },
          }),
          col("scheduleAnchor", '"NotificationScheduleAnchor"', {
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationScheduleAnchor" },
            },
          }),
          col("scheduleIntervalType", '"NotificationScheduleIntervalType"', {
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationScheduleIntervalType" },
            },
          }),
          col("scheduleIntervalValue", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("scheduleOffsetMinutes", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("scheduleStrategy", '"NotificationScheduleStrategy"', {
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationScheduleStrategy" },
            },
          }),
          col("scheduleTimeOfDay", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("scheduleTimezone", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("scheduleWeekday", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("scheduledAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("scheduledUntil", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("triggerType", '"NotificationTriggerType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationTriggerType" },
            },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("world", "text", { codecRef: { codecId: "pg/text@1" } }),
        ],
        constraints: [primaryKey(["id"], { name: "NotificationRule_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "NotificationRuleTarget",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("ruleId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("targetId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
        ],
        constraints: [
          primaryKey(["ruleId", "targetId"], {
            name: "NotificationRuleTarget_pkey",
          }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "NotificationTarget",
        columns: [
          col("active", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("canSend", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("displayName", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("externalId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("guildName", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lastDeliveryAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("lastDeliveryError", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("lastSyncedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("metadata", "jsonb", { codecRef: { codecId: "pg/jsonb@1" } }),
          col("ownerId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("ownerType", '"NotificationOwnerType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationOwnerType" },
            },
          }),
          col("provider", '"NotificationProvider"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationProvider" },
            },
          }),
          col("targetType", '"NotificationTargetType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NotificationTargetType" },
            },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "NotificationTarget_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "NpcKillStats",
        columns: [
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("lastKilledAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("memberId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("memberKills", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcIcon", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcLvl", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("npcProf", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcType", '"NpcType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NpcType" },
            },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "NpcKillStats_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "NpcKillStatsBucket",
        columns: [
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("lastKilledAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("memberId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("memberKills", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcIcon", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcLvl", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("npcProf", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcType", '"NpcType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NpcType" },
            },
          }),
          col("periodStart", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "NpcKillStatsBucket_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "NpcSnapshot",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("icon", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lvl", "int4", { codecRef: { codecId: "pg/int4@1" } }),
          col("margonemType", "int4", { codecRef: { codecId: "pg/int4@1" } }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("npcId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("prof", '"Profession"', {
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "Profession" },
            },
          }),
          col("type", '"NpcType"', {
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NpcType" },
            },
          }),
          col("wt", "int4", { codecRef: { codecId: "pg/int4@1" } }),
        ],
        constraints: [primaryKey(["id"], { name: "NpcSnapshot_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "OrganizationLootRecord",
        columns: [
          col("archivedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("archivedByMemberId", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lootId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "OrganizationLootRecord_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "PlayerSnapshot",
        columns: [
          col("accountId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("characterId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("icon", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("prof", '"Profession"', {
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "Profession" },
            },
          }),
          col("snapshotHash", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "PlayerSnapshot_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "Reservation",
        columns: [
          col("authorAvatarUrl", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("authorDisplayName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("comment", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("createdBy", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("createdByUserId", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdDate", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("endsAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("fromDate", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("reminderMinutesBefore", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("reservationId", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("spotId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("spotName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("startsAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("toDate", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "Reservation_pkey" }),
          checkExpression(
            "Reservation_reminder_minutes_check",
            '(("reminderMinutesBefore" IS NULL) OR ("reminderMinutesBefore" = ANY (ARRAY[0, 5, 15, 30])))',
          ),
          checkExpression(
            "Reservation_valid_time_range_check",
            '("endsAt" > "startsAt")',
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ReservationShare",
        columns: [
          col("acceptedByUserId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("createdByUserId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("firstGuildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("revokedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("secondGuildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "ReservationShare_pkey" }),
          checkExpression(
            "ReservationShare_distinct_guilds_check",
            '("firstGuildId" < "secondGuildId")',
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ReservationShareInvitation",
        columns: [
          col("acceptedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("acceptedByUserId", "text", {
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("createdByUserId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("expiresAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("revokedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("sourceGuildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("targetGuildId", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("tokenHash", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "ReservationShareInvitation_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Role",
        columns: [
          col("color", "int4", { codecRef: { codecId: "pg/int4@1" } }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("lvlRangeFrom", "int4", {
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("lvlRangeTo", "int4", {
            default: lit(500),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("permissions", '"Permission"[]', {
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "Permission" },
              many: true,
            },
          }),
          col("position", "int4", { codecRef: { codecId: "pg/int4@1" } }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "Role_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "Timer",
        columns: [
          col("actorCharacterLvl", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("actorCharacterSnapshotId", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("createdById", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("deletedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("latestRespBaseSeconds", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("latestRespawnRandomness", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("maxSpawnTime", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("minSpawnTime", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("npc", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("npcId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("tempId", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("timerKey", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("wasReset", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("windowOpenedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [
          primaryKey(["guildId", "world", "timerKey"], { name: "Timer_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "TimerHistoryEntry",
        columns: [
          col("action", '"TimerHistoryAction"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "TimerHistoryAction" },
            },
          }),
          col("actorCharacterLvl", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("actorCharacterSnapshotId", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("actorMemberId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("latestRespBaseSeconds", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("latestRespawnRandomness", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("maxSpawnTime", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("minSpawnTime", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("npc", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("npcId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("timerActorCharacterLvl", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("timerActorCharacterSnapshotId", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("timerCreatedById", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("timerKey", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("wasReset", "bool", { codecRef: { codecId: "pg/bool@1" } }),
          col("windowOpenedAt", "timestamp(3)", {
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "TimerHistoryEntry_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "UserCharactersLootlogSettings",
        columns: [
          col("accountId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("catchingGuildIds", "text[]", {
            notNull: true,
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("characterId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "UserCharactersLootlogSettings_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "UserGameAccountSettings",
        columns: [
          col("accountId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("settings", "jsonb", {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "UserGameAccountSettings_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "UserGuildTimerSettings",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("hiddenTimers", "text[]", {
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("pinnedTimers", "text[]", {
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "UserGuildTimerSettings_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "UserKillStats",
        columns: [
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("lastKilledAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("npcIcon", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcLvl", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("npcProf", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcType", '"NpcType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NpcType" },
            },
          }),
          col("totalKills", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "UserKillStats_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "UserKillStatsBucket",
        columns: [
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("lastKilledAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("npcIcon", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcLvl", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("npcName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("npcProf", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("npcType", '"NpcType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "NpcType" },
            },
          }),
          col("periodStart", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("totalKills", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "UserKillStatsBucket_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "UserPinnedEvent",
        columns: [
          col("eventId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("pinnedAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "UserPinnedEvent_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "UserPinnedReservationSpot",
        columns: [
          col("guildId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("pinnedAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("spotId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [
          primaryKey(["id"], { name: "UserPinnedReservationSpot_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "UserSettingDocument",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("domain", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("overrides", "jsonb", {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("schemaVersion", "int4", {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("scopeId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("scopeType", '"SettingsScopeType"', {
            notNull: true,
            codecRef: {
              codecId: "pg/enum@1",
              typeParams: { typeName: "SettingsScopeType" },
            },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "UserSettingDocument_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "UserSettings",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("guildsOrder", "text[]", {
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("hiddenGuildIds", "text[]", {
            notNull: true,
            codecRef: { codecId: "pg/text@1", many: true },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("theme", "text", {
            notNull: true,
            default: lit("default"),
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "UserSettings_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "UserSoundSettings",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("detectorConfig", "jsonb", {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("detectorVolume", "float8", {
            notNull: true,
            default: lit(0.5),
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("masterVolume", "float8", {
            notNull: true,
            default: lit(0.5),
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("notificationsConfig", "jsonb", {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("notificationsVolume", "float8", {
            notNull: true,
            default: lit(0.5),
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("pingsVolume", "float8", {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("timersConfig", "jsonb", {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("timersVolume", "float8", {
            notNull: true,
            default: lit(0.5),
            codecRef: { codecId: "pg/float8@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "UserSoundSettings_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "UserTimerSettings",
        columns: [
          col("alwaysVisibleExpiredTimers", "jsonb", {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("colorFiltersEnabled", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("customColors", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("defaultColorNames", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("displayConfig", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("generalConfig", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("hiddenDefaultColors", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("overriddenDefaultColors", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("syncEnabled", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("timerFiltersEnabled", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("timersColors", "jsonb", {
            notNull: true,
            codecRef: { codecId: "pg/jsonb@1" },
          }),
          col("timersSortOrder", "text", {
            notNull: true,
            default: lit("asc"),
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "UserTimerSettings_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "WatchedItem",
        columns: [
          col("createdAt", "timestamp(3)", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("enabled", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("id", "SERIAL", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("itemId", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("itemName", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("notificationRuleId", "int4", {
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("updatedAt", "timestamp(3)", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamp-temporal@1",
              typeParams: { precision: 3 },
            },
          }),
          col("userId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("world", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"], { name: "WatchedItem_pkey" })],
      }),
      this.createTable({
        schema: "public",
        table: "_EventMapToMember",
        columns: [
          col("A", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("B", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
        ],
        constraints: [
          primaryKey(["A", "B"], { name: "_EventMapToMember_AB_pkey" }),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "_MemberToRole",
        columns: [
          col("A", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
          col("B", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [
          primaryKey(["A", "B"], { name: "_MemberToRole_AB_pkey" }),
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "DiscordGuildChannelSnapshot",
        index: "DiscordGuildChannelSnapshot_guildId_active_canSend_idx",
        columns: ["guildId", "active", "canSend"],
      }),
      this.createIndex({
        schema: "public",
        table: "DiscordGuildChannelSnapshot",
        index: "DiscordGuildChannelSnapshot_guildId_channelId_key",
        columns: ["guildId", "channelId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "Event",
        index: "Event_guildId_startsAt_endsAt_idx",
        columns: ["guildId", "startsAt", "endsAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "Event",
        index: "Event_world_idx",
        columns: ["world"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventHeroKill",
        index: "EventHeroKill_heroNpcId_idx",
        columns: ["heroNpcId"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventHeroKill",
        index: "EventHeroKill_heroNpcId_killedAt_idx",
        columns: ["heroNpcId", "killedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventHeroKill",
        index: "EventHeroKill_killedAt_idx",
        columns: ["killedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventHeroNpc",
        index: "EventHeroNpc_eventId_npcName_key",
        columns: ["eventId", "npcName"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "EventHeroNpc",
        index: "EventHeroNpc_npcId_idx",
        columns: ["npcId"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventKillPoint",
        index: "EventKillPoint_killId_memberId_key",
        columns: ["killId", "memberId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "EventKillPoint",
        index: "EventKillPoint_memberId_confirmationDeadlineAt_confirmedAt_idx",
        columns: ["memberId", "confirmationDeadlineAt", "confirmedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventKillPoint",
        index: "EventKillPoint_memberId_idx",
        columns: ["memberId"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMap",
        index: "EventMap_heroNpcId_mapId_key",
        columns: ["heroNpcId", "mapId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "EventMap",
        index: "EventMap_locationId_idx",
        columns: ["locationId"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMap",
        index: "EventMap_mapId_idx",
        columns: ["mapId"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMap",
        index: "EventMap_mapName_idx",
        columns: ["mapName"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMapAssignmentHistory",
        index: "EventMapAssignmentHistory_heroNpcId_assignedAt_idx",
        columns: ["heroNpcId", "assignedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMapAssignmentHistory",
        index: "EventMapAssignmentHistory_mapId_assignedAt_idx",
        columns: ["mapId", "assignedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMapAssignmentHistory",
        index: "EventMapAssignmentHistory_memberId_idx",
        columns: ["memberId"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMapCoverageGap",
        index: "EventMapCoverageGap_heroNpcId_endedAt_idx",
        columns: ["heroNpcId", "endedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMapCoverageGap",
        index: "EventMapCoverageGap_heroNpcId_startedAt_idx",
        columns: ["heroNpcId", "startedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMapCoverageGap",
        index: "EventMapCoverageGap_mapId_gapType_endedAt_idx",
        columns: ["mapId", "gapType", "endedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMapCoverageGap",
        index: "EventMapCoverageGap_mapId_startedAt_idx",
        columns: ["mapId", "startedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventMapLocation",
        index: "EventMapLocation_heroNpcId_name_key",
        columns: ["heroNpcId", "name"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "EventMapLocation",
        index: "EventMapLocation_heroNpcId_order_idx",
        columns: ["heroNpcId", "order"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventPointsEditHistory",
        index: "EventPointsEditHistory_rankingId_editedAt_idx",
        columns: ["rankingId", "editedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventPresenceLog",
        index: "EventPresenceLog_mapId_endedAt_isAfk_memberId_idx",
        columns: ["mapId", "endedAt", "isAfk", "memberId"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventPresenceLog",
        index: "EventPresenceLog_mapId_memberId_idx",
        columns: ["mapId", "memberId"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventPresenceLog",
        index: "EventPresenceLog_startedAt_endedAt_idx",
        columns: ["startedAt", "endedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventRanking",
        index: "EventRanking_eventId_memberId_heroNpcName_key",
        columns: ["eventId", "memberId", "heroNpcName"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "EventRanking",
        index: "EventRanking_eventId_totalPoints_idx",
        columns: ["eventId", "totalPoints"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventRespawnWindowSummary",
        index: "EventRespawnWindowSummary_heroNpcId_idx",
        columns: ["heroNpcId"],
      }),
      this.createIndex({
        schema: "public",
        table: "EventRespawnWindowSummary",
        index: "EventRespawnWindowSummary_killId_key",
        columns: ["killId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "EventRespawnWindowSummary",
        index: "EventRespawnWindowSummary_windowClosedAt_idx",
        columns: ["windowClosedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "Guild",
        index: "Guild_vanityUrl_idx",
        columns: ["vanityUrl"],
      }),
      this.createIndex({
        schema: "public",
        table: "Guild",
        index: "Guild_vanityUrl_key",
        columns: ["vanityUrl"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "GuildDocument",
        index: "GuildDocument_guildId_deletedAt_idx",
        columns: ["guildId", "deletedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "GuildDocument",
        index: "GuildDocument_guildId_deletedAt_updatedAt_idx",
        columns: ["guildId", "deletedAt", "updatedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "GuildDocumentHistory",
        index: "GuildDocumentHistory_documentId_editedAt_idx",
        columns: ["documentId", "editedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "GuildDocumentHistory",
        index: "GuildDocumentHistory_documentId_version_idx",
        columns: ["documentId", "version"],
      }),
      this.createIndex({
        schema: "public",
        table: "GuildDocumentHistory",
        index: "GuildDocumentHistory_guildId_editedAt_idx",
        columns: ["guildId", "editedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "GuildKillSummary",
        index: "GuildKillSummary_guildId_idx",
        columns: ["guildId"],
      }),
      this.createIndex({
        schema: "public",
        table: "GuildKillSummary",
        index: "GuildKillSummary_guildId_npcType_idx",
        columns: ["guildId", "npcType"],
      }),
      this.createIndex({
        schema: "public",
        table: "GuildKillSummary",
        index: "GuildKillSummary_guildId_world_npcId_key",
        columns: ["guildId", "world", "npcId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "GuildKillSummary",
        index: "GuildKillSummary_guildId_world_npcType_idx",
        columns: ["guildId", "world", "npcType"],
      }),
      this.createIndex({
        schema: "public",
        table: "GuildKillSummaryBucket",
        index: "GuildKillSummaryBucket_guildId_npcType_periodStart_idx",
        columns: ["guildId", "npcType", "periodStart"],
      }),
      this.createIndex({
        schema: "public",
        table: "GuildKillSummaryBucket",
        index: "GuildKillSummaryBucket_guildId_periodStart_idx",
        columns: ["guildId", "periodStart"],
      }),
      this.createIndex({
        schema: "public",
        table: "GuildKillSummaryBucket",
        index: "GuildKillSummaryBucket_guildId_world_npcId_periodStart_key",
        columns: ["guildId", "world", "npcId", "periodStart"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "GuildKillSummaryBucket",
        index: "GuildKillSummaryBucket_guildId_world_npcType_periodStart_idx",
        columns: ["guildId", "world", "npcType", "periodStart"],
      }),
      this.createIndex({
        schema: "public",
        table: "ItemSnapshot",
        index: "ItemSnapshot_itemId_statsHash_key",
        columns: ["itemId", "statsHash"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "ItemSnapshot",
        index: "ItemSnapshot_name_idx",
        columns: ["name"],
      }),
      this.createIndex({
        schema: "public",
        table: "ItemSnapshot",
        index: "ItemSnapshot_rarity_lvl_idx",
        columns: ["rarity", "lvl"],
      }),
      this.createIndex({
        schema: "public",
        table: "Loot",
        index: "Loot_createdAt_idx",
        columns: ["createdAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "Loot",
        index: "Loot_uniqueId_key",
        columns: ["uniqueId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "Loot",
        index: "Loot_world_createdAt_idx",
        columns: ["world", "createdAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "Loot",
        index: "Loot_world_id_idx",
        columns: ["world", "id"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootComment",
        index: "LootComment_memberId_idx",
        columns: ["memberId"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootComment",
        index: "LootComment_organizationLootRecordId_createdAt_idx",
        columns: ["organizationLootRecordId", "createdAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootItem",
        index: "LootItem_hid_lootId_idx",
        columns: ["hid", "lootId"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootItem",
        index: "LootItem_itemSnapshotId_lootId_idx",
        columns: ["itemSnapshotId", "lootId"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootItem",
        index: "LootItem_lootId_itemSnapshotId_idx",
        columns: ["lootId", "itemSnapshotId"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootNpc",
        index: "LootNpc_lootId_idx",
        columns: ["lootId"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootNpc",
        index: "LootNpc_npcSnapshotId_idx",
        columns: ["npcSnapshotId"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootPlayer",
        index: "LootPlayer_lootId_idx",
        columns: ["lootId"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootPlayer",
        index: "LootPlayer_playerSnapshotId_idx",
        columns: ["playerSnapshotId"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootSubmission",
        index: "LootSubmission_memberId_idx",
        columns: ["memberId"],
      }),
      this.createIndex({
        schema: "public",
        table: "LootSubmission",
        index: "LootSubmission_organizationLootRecordId_memberId_key",
        columns: ["organizationLootRecordId", "memberId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "MapTemplate",
        index: "MapTemplate_guildId_idx",
        columns: ["guildId"],
      }),
      this.createIndex({
        schema: "public",
        table: "MapTemplate",
        index: "MapTemplate_guildId_name_key",
        columns: ["guildId", "name"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "Member",
        index: "Member_globalUserId_guildId_active_idx",
        columns: ["globalUserId", "guildId", "active"],
      }),
      this.createIndex({
        schema: "public",
        table: "Member",
        index: "Member_id_guildId_idx",
        columns: ["id", "guildId"],
      }),
      this.createIndex({
        schema: "public",
        table: "Member",
        index: "Member_userId_guildId_active_lastDiscordSyncAt_idx",
        columns: ["userId", "guildId", "active", "lastDiscordSyncAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "Member",
        index: "Member_userId_guildId_key",
        columns: ["userId", "guildId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "MemberRefreshJob",
        index: "MemberRefreshJob_guildId_idx",
        columns: ["guildId"],
      }),
      this.createIndex({
        schema: "public",
        table: "MemberRefreshJob",
        index: "MemberRefreshJob_status_idx",
        columns: ["status"],
      }),
      this.createIndex({
        schema: "public",
        table: "NotificationJob",
        index: "NotificationJob_idempotencyKey_key",
        columns: ["idempotencyKey"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "NotificationJob",
        index: "NotificationJob_ownerType_ownerId_status_scheduledFor_idx",
        columns: ["ownerType", "ownerId", "status", "scheduledFor"],
      }),
      this.createIndex({
        schema: "public",
        table: "NotificationJob",
        index: "NotificationJob_ruleId_status_idx",
        columns: ["ruleId", "status"],
      }),
      this.createIndex({
        schema: "public",
        table: "NotificationJob",
        index: "NotificationJob_status_scheduledFor_idx",
        columns: ["status", "scheduledFor"],
      }),
      this.createIndex({
        schema: "public",
        table: "NotificationJob",
        index: "NotificationJob_targetId_status_idx",
        columns: ["targetId", "status"],
      }),
      this.createIndex({
        schema: "public",
        table: "NotificationRule",
        index: "NotificationRule_guildId_world_triggerType_enabled_idx",
        columns: ["guildId", "world", "triggerType", "enabled"],
      }),
      this.createIndex({
        schema: "public",
        table: "NotificationRule",
        index: "NotificationRule_ownerType_ownerId_enabled_idx",
        columns: ["ownerType", "ownerId", "enabled"],
      }),
      this.createIndex({
        schema: "public",
        table: "NotificationRuleTarget",
        index: "NotificationRuleTarget_targetId_idx",
        columns: ["targetId"],
      }),
      this.createIndex({
        schema: "public",
        table: "NotificationTarget",
        index: "NotificationTarget_ownerType_ownerId_active_idx",
        columns: ["ownerType", "ownerId", "active"],
      }),
      this.createIndex({
        schema: "public",
        table: "NotificationTarget",
        index:
          "NotificationTarget_ownerType_ownerId_provider_targetType_ex_key",
        columns: [
          "ownerType",
          "ownerId",
          "provider",
          "targetType",
          "externalId",
        ],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "NpcKillStats",
        index: "NpcKillStats_guildId_idx",
        columns: ["guildId"],
      }),
      this.createIndex({
        schema: "public",
        table: "NpcKillStats",
        index: "NpcKillStats_guildId_memberId_world_npcId_key",
        columns: ["guildId", "memberId", "world", "npcId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "NpcKillStats",
        index: "NpcKillStats_guildId_npcType_idx",
        columns: ["guildId", "npcType"],
      }),
      this.createIndex({
        schema: "public",
        table: "NpcKillStats",
        index: "NpcKillStats_guildId_world_npcType_idx",
        columns: ["guildId", "world", "npcType"],
      }),
      this.createIndex({
        schema: "public",
        table: "NpcKillStats",
        index: "NpcKillStats_memberId_idx",
        columns: ["memberId"],
      }),
      this.createIndex({
        schema: "public",
        table: "NpcKillStatsBucket",
        index:
          "NpcKillStatsBucket_guildId_memberId_world_npcId_periodStart_key",
        columns: ["guildId", "memberId", "world", "npcId", "periodStart"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "NpcKillStatsBucket",
        index: "NpcKillStatsBucket_guildId_npcType_periodStart_idx",
        columns: ["guildId", "npcType", "periodStart"],
      }),
      this.createIndex({
        schema: "public",
        table: "NpcKillStatsBucket",
        index: "NpcKillStatsBucket_guildId_periodStart_idx",
        columns: ["guildId", "periodStart"],
      }),
      this.createIndex({
        schema: "public",
        table: "NpcKillStatsBucket",
        index: "NpcKillStatsBucket_guildId_world_npcType_periodStart_idx",
        columns: ["guildId", "world", "npcType", "periodStart"],
      }),
      this.createIndex({
        schema: "public",
        table: "NpcKillStatsBucket",
        index: "NpcKillStatsBucket_memberId_periodStart_idx",
        columns: ["memberId", "periodStart"],
      }),
      this.createIndex({
        schema: "public",
        table: "NpcSnapshot",
        index: "NpcSnapshot_name_idx",
        columns: ["name"],
      }),
      this.createIndex({
        schema: "public",
        table: "NpcSnapshot",
        index: "NpcSnapshot_npcId_name_key",
        columns: ["npcId", "name"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "NpcSnapshot",
        index: "NpcSnapshot_type_lvl_idx",
        columns: ["type", "lvl"],
      }),
      this.createIndex({
        schema: "public",
        table: "OrganizationLootRecord",
        index: "OrganizationLootRecord_archivedByMemberId_idx",
        columns: ["archivedByMemberId"],
      }),
      this.createIndex({
        schema: "public",
        table: "OrganizationLootRecord",
        index: "OrganizationLootRecord_guildId_archivedAt_lootId_idx",
        columns: ["guildId", "archivedAt", "lootId"],
      }),
      this.createIndex({
        schema: "public",
        table: "OrganizationLootRecord",
        index: "OrganizationLootRecord_guildId_lootId_key",
        columns: ["guildId", "lootId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "OrganizationLootRecord",
        index: "OrganizationLootRecord_lootId_idx",
        columns: ["lootId"],
      }),
      this.createIndex({
        schema: "public",
        table: "PlayerSnapshot",
        index: "PlayerSnapshot_accountId_characterId_idx",
        columns: ["accountId", "characterId"],
      }),
      this.createIndex({
        schema: "public",
        table: "PlayerSnapshot",
        index: "PlayerSnapshot_name_idx",
        columns: ["name"],
      }),
      this.createIndex({
        schema: "public",
        table: "PlayerSnapshot",
        index: "PlayerSnapshot_world_accountId_characterId_snapshotHash_key",
        columns: ["world", "accountId", "characterId", "snapshotHash"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "PlayerSnapshot",
        index: "PlayerSnapshot_world_name_idx",
        columns: ["world", "name"],
      }),
      this.createIndex({
        schema: "public",
        table: "Reservation",
        index: "Reservation_createdByUserId_endsAt_idx",
        columns: ["createdByUserId", "endsAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "Reservation",
        index: "Reservation_guildId_endsAt_idx",
        columns: ["guildId", "endsAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "Reservation",
        index: "Reservation_guildId_spotId_startsAt_endsAt_idx",
        columns: ["guildId", "spotId", "startsAt", "endsAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "ReservationShare",
        index: "ReservationShare_firstGuildId_revokedAt_idx",
        columns: ["firstGuildId", "revokedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "ReservationShare",
        index: "ReservationShare_firstGuildId_secondGuildId_key",
        columns: ["firstGuildId", "secondGuildId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "ReservationShare",
        index: "ReservationShare_secondGuildId_revokedAt_idx",
        columns: ["secondGuildId", "revokedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "ReservationShareInvitation",
        index: "ReservationShareInvitation_expiresAt_idx",
        columns: ["expiresAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "ReservationShareInvitation",
        index: "ReservationShareInvitation_sourceGuildId_createdAt_idx",
        columns: ["sourceGuildId", "createdAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "ReservationShareInvitation",
        index: "ReservationShareInvitation_targetGuildId_idx",
        columns: ["targetGuildId"],
      }),
      this.createIndex({
        schema: "public",
        table: "ReservationShareInvitation",
        index: "ReservationShareInvitation_tokenHash_key",
        columns: ["tokenHash"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "Role",
        index: "Role_id_guildId_idx",
        columns: ["id", "guildId"],
      }),
      this.createIndex({
        schema: "public",
        table: "Role",
        index: "Role_id_guildId_key",
        columns: ["id", "guildId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "Timer",
        index: "Timer_actorCharacterSnapshotId_idx",
        columns: ["actorCharacterSnapshotId"],
      }),
      this.createIndex({
        schema: "public",
        table: "Timer",
        index: "Timer_createdById_idx",
        columns: ["createdById"],
      }),
      this.createIndex({
        schema: "public",
        table: "Timer",
        index: "Timer_guildId_maxSpawnTime_idx",
        columns: ["guildId", "maxSpawnTime"],
      }),
      this.createIndex({
        schema: "public",
        table: "Timer",
        index: "Timer_guildId_world_deletedAt_maxSpawnTime_idx",
        columns: ["guildId", "world", "deletedAt", "maxSpawnTime"],
      }),
      this.createIndex({
        schema: "public",
        table: "Timer",
        index: "Timer_guildId_world_timerKey_idx",
        columns: ["guildId", "world", "timerKey"],
      }),
      this.createIndex({
        schema: "public",
        table: "Timer",
        index: "Timer_npcId_guildId_idx",
        columns: ["npcId", "guildId"],
      }),
      this.createIndex({
        schema: "public",
        table: "Timer",
        index: "Timer_world_guildId_idx",
        columns: ["world", "guildId"],
      }),
      this.createIndex({
        schema: "public",
        table: "Timer",
        index: "idx_timer_npc_name",
        expression: "(npc ->> 'name'::text)",
      }),
      this.createIndex({
        schema: "public",
        table: "TimerHistoryEntry",
        index: "TimerHistoryEntry_actorCharacterSnapshotId_idx",
        columns: ["actorCharacterSnapshotId"],
      }),
      this.createIndex({
        schema: "public",
        table: "TimerHistoryEntry",
        index: "TimerHistoryEntry_actorMemberId_idx",
        columns: ["actorMemberId"],
      }),
      this.createIndex({
        schema: "public",
        table: "TimerHistoryEntry",
        index: "TimerHistoryEntry_guildId_world_createdAt_idx",
        columns: ["guildId", "world", "createdAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "TimerHistoryEntry",
        index: "TimerHistoryEntry_guildId_world_timerKey_createdAt_idx",
        columns: ["guildId", "world", "timerKey", "createdAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "TimerHistoryEntry",
        index: "TimerHistoryEntry_timerActorCharacterSnapshotId_idx",
        columns: ["timerActorCharacterSnapshotId"],
      }),
      this.createIndex({
        schema: "public",
        table: "TimerHistoryEntry",
        index: "TimerHistoryEntry_timerCreatedById_idx",
        columns: ["timerCreatedById"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserCharactersLootlogSettings",
        index: "UserCharactersLootlogSettings_userId_accountId_characterId_key",
        columns: ["userId", "accountId", "characterId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "UserGameAccountSettings",
        index: "UserGameAccountSettings_userId_accountId_key",
        columns: ["userId", "accountId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "UserGameAccountSettings",
        index: "UserGameAccountSettings_userId_idx",
        columns: ["userId"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserGuildTimerSettings",
        index: "UserGuildTimerSettings_guildId_idx",
        columns: ["guildId"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserGuildTimerSettings",
        index: "UserGuildTimerSettings_userId_guildId_key",
        columns: ["userId", "guildId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "UserGuildTimerSettings",
        index: "UserGuildTimerSettings_userId_idx",
        columns: ["userId"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserKillStats",
        index: "UserKillStats_userId_idx",
        columns: ["userId"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserKillStats",
        index: "UserKillStats_userId_npcType_idx",
        columns: ["userId", "npcType"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserKillStats",
        index: "UserKillStats_userId_world_npcId_key",
        columns: ["userId", "world", "npcId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "UserKillStats",
        index: "UserKillStats_userId_world_npcType_idx",
        columns: ["userId", "world", "npcType"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserKillStatsBucket",
        index: "UserKillStatsBucket_userId_npcType_periodStart_idx",
        columns: ["userId", "npcType", "periodStart"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserKillStatsBucket",
        index: "UserKillStatsBucket_userId_periodStart_idx",
        columns: ["userId", "periodStart"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserKillStatsBucket",
        index: "UserKillStatsBucket_userId_world_npcId_periodStart_key",
        columns: ["userId", "world", "npcId", "periodStart"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "UserKillStatsBucket",
        index: "UserKillStatsBucket_userId_world_npcType_periodStart_idx",
        columns: ["userId", "world", "npcType", "periodStart"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserPinnedEvent",
        index: "UserPinnedEvent_eventId_idx",
        columns: ["eventId"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserPinnedEvent",
        index: "UserPinnedEvent_userId_eventId_key",
        columns: ["userId", "eventId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "UserPinnedEvent",
        index: "UserPinnedEvent_userId_pinnedAt_idx",
        columns: ["userId", "pinnedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserPinnedReservationSpot",
        index: "UserPinnedReservationSpot_userId_guildId_pinnedAt_idx",
        columns: ["userId", "guildId", "pinnedAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserPinnedReservationSpot",
        index: "UserPinnedReservationSpot_userId_guildId_spotId_key",
        columns: ["userId", "guildId", "spotId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "UserSettingDocument",
        index: "UserSettingDocument_userId_domain_idx",
        columns: ["userId", "domain"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserSettingDocument",
        index: "UserSettingDocument_userId_domain_scopeType_scopeId_key",
        columns: ["userId", "domain", "scopeType", "scopeId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "UserSettingDocument",
        index: "UserSettingDocument_userId_scopeType_scopeId_idx",
        columns: ["userId", "scopeType", "scopeId"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserSettings",
        index: "UserSettings_userId_idx",
        columns: ["userId"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserSettings",
        index: "UserSettings_userId_key",
        columns: ["userId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "UserSoundSettings",
        index: "UserSoundSettings_userId_idx",
        columns: ["userId"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserSoundSettings",
        index: "UserSoundSettings_userId_key",
        columns: ["userId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "UserTimerSettings",
        index: "UserTimerSettings_userId_idx",
        columns: ["userId"],
      }),
      this.createIndex({
        schema: "public",
        table: "UserTimerSettings",
        index: "UserTimerSettings_userId_key",
        columns: ["userId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "WatchedItem",
        index: "WatchedItem_itemId_world_enabled_idx",
        columns: ["itemId", "world", "enabled"],
      }),
      this.createIndex({
        schema: "public",
        table: "WatchedItem",
        index: "WatchedItem_notificationRuleId_key",
        columns: ["notificationRuleId"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "WatchedItem",
        index: "WatchedItem_userId_enabled_idx",
        columns: ["userId", "enabled"],
      }),
      this.createIndex({
        schema: "public",
        table: "WatchedItem",
        index: "WatchedItem_userId_itemId_world_key",
        columns: ["userId", "itemId", "world"],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: "public",
        table: "_EventMapToMember",
        index: "_EventMapToMember_B_index",
        columns: ["B"],
      }),
      this.createIndex({
        schema: "public",
        table: "_MemberToRole",
        index: "_MemberToRole_B_index",
        columns: ["B"],
      }),
      this.addForeignKey({
        schema: "public",
        table: "DiscordGuildChannelSnapshot",
        foreignKey: {
          name: "DiscordGuildChannelSnapshot_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "DiscordGuildSyncState",
        foreignKey: {
          name: "DiscordGuildSyncState_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Event",
        foreignKey: {
          name: "Event_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventHeroKill",
        foreignKey: {
          name: "EventHeroKill_heroNpcId_fkey",
          columns: ["heroNpcId"],
          references: {
            schema: "public",
            table: "EventHeroNpc",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventHeroKill",
        foreignKey: {
          name: "EventHeroKill_timerCreatedById_fkey",
          columns: ["timerCreatedById"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventHeroNpc",
        foreignKey: {
          name: "EventHeroNpc_eventId_fkey",
          columns: ["eventId"],
          references: { schema: "public", table: "Event", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventKillPoint",
        foreignKey: {
          name: "EventKillPoint_killId_fkey",
          columns: ["killId"],
          references: {
            schema: "public",
            table: "EventHeroKill",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventKillPoint",
        foreignKey: {
          name: "EventKillPoint_memberId_fkey",
          columns: ["memberId"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventMap",
        foreignKey: {
          name: "EventMap_heroNpcId_fkey",
          columns: ["heroNpcId"],
          references: {
            schema: "public",
            table: "EventHeroNpc",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventMap",
        foreignKey: {
          name: "EventMap_locationId_fkey",
          columns: ["locationId"],
          references: {
            schema: "public",
            table: "EventMapLocation",
            columns: ["id"],
          },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventMapAssignmentHistory",
        foreignKey: {
          name: "EventMapAssignmentHistory_heroNpcId_fkey",
          columns: ["heroNpcId"],
          references: {
            schema: "public",
            table: "EventHeroNpc",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventMapAssignmentHistory",
        foreignKey: {
          name: "EventMapAssignmentHistory_mapId_fkey",
          columns: ["mapId"],
          references: { schema: "public", table: "EventMap", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventMapAssignmentHistory",
        foreignKey: {
          name: "EventMapAssignmentHistory_memberId_fkey",
          columns: ["memberId"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventMapCoverageGap",
        foreignKey: {
          name: "EventMapCoverageGap_heroNpcId_fkey",
          columns: ["heroNpcId"],
          references: {
            schema: "public",
            table: "EventHeroNpc",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventMapCoverageGap",
        foreignKey: {
          name: "EventMapCoverageGap_mapId_fkey",
          columns: ["mapId"],
          references: { schema: "public", table: "EventMap", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventMapLocation",
        foreignKey: {
          name: "EventMapLocation_heroNpcId_fkey",
          columns: ["heroNpcId"],
          references: {
            schema: "public",
            table: "EventHeroNpc",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventPointsEditHistory",
        foreignKey: {
          name: "EventPointsEditHistory_rankingId_fkey",
          columns: ["rankingId"],
          references: {
            schema: "public",
            table: "EventRanking",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventPresenceLog",
        foreignKey: {
          name: "EventPresenceLog_mapId_fkey",
          columns: ["mapId"],
          references: { schema: "public", table: "EventMap", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventPresenceLog",
        foreignKey: {
          name: "EventPresenceLog_memberId_fkey",
          columns: ["memberId"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventRanking",
        foreignKey: {
          name: "EventRanking_eventId_fkey",
          columns: ["eventId"],
          references: { schema: "public", table: "Event", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventRanking",
        foreignKey: {
          name: "EventRanking_memberId_fkey",
          columns: ["memberId"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventRespawnWindowSummary",
        foreignKey: {
          name: "EventRespawnWindowSummary_heroNpcId_fkey",
          columns: ["heroNpcId"],
          references: {
            schema: "public",
            table: "EventHeroNpc",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "EventRespawnWindowSummary",
        foreignKey: {
          name: "EventRespawnWindowSummary_killId_fkey",
          columns: ["killId"],
          references: {
            schema: "public",
            table: "EventHeroKill",
            columns: ["id"],
          },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "GuildDocument",
        foreignKey: {
          name: "GuildDocument_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "GuildDocumentHistory",
        foreignKey: {
          name: "GuildDocumentHistory_documentId_fkey",
          columns: ["documentId"],
          references: {
            schema: "public",
            table: "GuildDocument",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "GuildDocumentHistory",
        foreignKey: {
          name: "GuildDocumentHistory_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "GuildKillSummary",
        foreignKey: {
          name: "GuildKillSummary_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "GuildKillSummaryBucket",
        foreignKey: {
          name: "GuildKillSummaryBucket_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootComment",
        foreignKey: {
          name: "LootComment_memberId_fkey",
          columns: ["memberId"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootComment",
        foreignKey: {
          name: "LootComment_organizationLootRecordId_fkey",
          columns: ["organizationLootRecordId"],
          references: {
            schema: "public",
            table: "OrganizationLootRecord",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootItem",
        foreignKey: {
          name: "LootItem_itemSnapshotId_fkey",
          columns: ["itemSnapshotId"],
          references: {
            schema: "public",
            table: "ItemSnapshot",
            columns: ["id"],
          },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootItem",
        foreignKey: {
          name: "LootItem_lootId_fkey",
          columns: ["lootId"],
          references: { schema: "public", table: "Loot", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootNpc",
        foreignKey: {
          name: "LootNpc_lootId_fkey",
          columns: ["lootId"],
          references: { schema: "public", table: "Loot", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootNpc",
        foreignKey: {
          name: "LootNpc_npcSnapshotId_fkey",
          columns: ["npcSnapshotId"],
          references: {
            schema: "public",
            table: "NpcSnapshot",
            columns: ["id"],
          },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootPlayer",
        foreignKey: {
          name: "LootPlayer_lootId_fkey",
          columns: ["lootId"],
          references: { schema: "public", table: "Loot", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootPlayer",
        foreignKey: {
          name: "LootPlayer_playerSnapshotId_fkey",
          columns: ["playerSnapshotId"],
          references: {
            schema: "public",
            table: "PlayerSnapshot",
            columns: ["id"],
          },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootSubmission",
        foreignKey: {
          name: "LootSubmission_memberId_fkey",
          columns: ["memberId"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootSubmission",
        foreignKey: {
          name: "LootSubmission_organizationLootRecordId_fkey",
          columns: ["organizationLootRecordId"],
          references: {
            schema: "public",
            table: "OrganizationLootRecord",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "LootlogConfigNpc",
        foreignKey: {
          name: "LootlogConfigNpc_lootlogConfigId_fkey",
          columns: ["lootlogConfigId"],
          references: {
            schema: "public",
            table: "LootlogConfig",
            columns: ["id"],
          },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "MapTemplate",
        foreignKey: {
          name: "MapTemplate_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Member",
        foreignKey: {
          name: "Member_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "NotificationJob",
        foreignKey: {
          name: "NotificationJob_ruleId_fkey",
          columns: ["ruleId"],
          references: {
            schema: "public",
            table: "NotificationRule",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "NotificationJob",
        foreignKey: {
          name: "NotificationJob_targetId_fkey",
          columns: ["targetId"],
          references: {
            schema: "public",
            table: "NotificationTarget",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "NotificationRule",
        foreignKey: {
          name: "NotificationRule_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "NotificationRuleTarget",
        foreignKey: {
          name: "NotificationRuleTarget_ruleId_fkey",
          columns: ["ruleId"],
          references: {
            schema: "public",
            table: "NotificationRule",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "NotificationRuleTarget",
        foreignKey: {
          name: "NotificationRuleTarget_targetId_fkey",
          columns: ["targetId"],
          references: {
            schema: "public",
            table: "NotificationTarget",
            columns: ["id"],
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "NpcKillStats",
        foreignKey: {
          name: "NpcKillStats_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "NpcKillStats",
        foreignKey: {
          name: "NpcKillStats_memberId_fkey",
          columns: ["memberId"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "NpcKillStatsBucket",
        foreignKey: {
          name: "NpcKillStatsBucket_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "NpcKillStatsBucket",
        foreignKey: {
          name: "NpcKillStatsBucket_memberId_fkey",
          columns: ["memberId"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "OrganizationLootRecord",
        foreignKey: {
          name: "OrganizationLootRecord_archivedByMemberId_fkey",
          columns: ["archivedByMemberId"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "OrganizationLootRecord",
        foreignKey: {
          name: "OrganizationLootRecord_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "OrganizationLootRecord",
        foreignKey: {
          name: "OrganizationLootRecord_lootId_fkey",
          columns: ["lootId"],
          references: { schema: "public", table: "Loot", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Reservation",
        foreignKey: {
          name: "Reservation_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ReservationShare",
        foreignKey: {
          name: "ReservationShare_firstGuildId_fkey",
          columns: ["firstGuildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ReservationShare",
        foreignKey: {
          name: "ReservationShare_secondGuildId_fkey",
          columns: ["secondGuildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ReservationShareInvitation",
        foreignKey: {
          name: "ReservationShareInvitation_sourceGuildId_fkey",
          columns: ["sourceGuildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ReservationShareInvitation",
        foreignKey: {
          name: "ReservationShareInvitation_targetGuildId_fkey",
          columns: ["targetGuildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Role",
        foreignKey: {
          name: "Role_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Timer",
        foreignKey: {
          name: "Timer_actorCharacterSnapshotId_fkey",
          columns: ["actorCharacterSnapshotId"],
          references: {
            schema: "public",
            table: "PlayerSnapshot",
            columns: ["id"],
          },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Timer",
        foreignKey: {
          name: "Timer_createdById_fkey",
          columns: ["createdById"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Timer",
        foreignKey: {
          name: "Timer_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "TimerHistoryEntry",
        foreignKey: {
          name: "TimerHistoryEntry_actorCharacterSnapshotId_fkey",
          columns: ["actorCharacterSnapshotId"],
          references: {
            schema: "public",
            table: "PlayerSnapshot",
            columns: ["id"],
          },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "TimerHistoryEntry",
        foreignKey: {
          name: "TimerHistoryEntry_actorMemberId_fkey",
          columns: ["actorMemberId"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "TimerHistoryEntry",
        foreignKey: {
          name: "TimerHistoryEntry_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "TimerHistoryEntry",
        foreignKey: {
          name: "TimerHistoryEntry_timerActorCharacterSnapshotId_fkey",
          columns: ["timerActorCharacterSnapshotId"],
          references: {
            schema: "public",
            table: "PlayerSnapshot",
            columns: ["id"],
          },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "TimerHistoryEntry",
        foreignKey: {
          name: "TimerHistoryEntry_timerCreatedById_fkey",
          columns: ["timerCreatedById"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "UserPinnedEvent",
        foreignKey: {
          name: "UserPinnedEvent_eventId_fkey",
          columns: ["eventId"],
          references: { schema: "public", table: "Event", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "UserPinnedReservationSpot",
        foreignKey: {
          name: "UserPinnedReservationSpot_guildId_fkey",
          columns: ["guildId"],
          references: { schema: "public", table: "Guild", columns: ["id"] },
          onDelete: "restrict",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "WatchedItem",
        foreignKey: {
          name: "WatchedItem_notificationRuleId_fkey",
          columns: ["notificationRuleId"],
          references: {
            schema: "public",
            table: "NotificationRule",
            columns: ["id"],
          },
          onDelete: "setNull",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "_EventMapToMember",
        foreignKey: {
          name: "_EventMapToMember_A_fkey",
          columns: ["A"],
          references: { schema: "public", table: "EventMap", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "_EventMapToMember",
        foreignKey: {
          name: "_EventMapToMember_B_fkey",
          columns: ["B"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "_MemberToRole",
        foreignKey: {
          name: "_MemberToRole_A_fkey",
          columns: ["A"],
          references: { schema: "public", table: "Member", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "_MemberToRole",
        foreignKey: {
          name: "_MemberToRole_B_fkey",
          columns: ["B"],
          references: { schema: "public", table: "Role", columns: ["id"] },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
      }),
      rawSql({
        id: "legacy.array-defaults",
        label: "Preserve legacy empty-array defaults",
        operationClass: "additive",
        target: {
          id: "postgres",
          details: { schema: "public", objectType: "schema", name: "public" },
        },
        precheck: [],
        execute: [
          {
            description:
              "Restore defaults which Prisma RC cannot express for nullable arrays",
            sql: `ALTER TABLE "public"."DiscordGuildChannelSnapshot"
  ALTER COLUMN "requiredPermissions" SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN "grantedPermissions" SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN "missingPermissions" SET DEFAULT ARRAY[]::text[];
ALTER TABLE "public"."DiscordGuildSyncState"
  ALTER COLUMN "requiredPermissions" SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN "grantedPermissions" SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN "missingPermissions" SET DEFAULT ARRAY[]::text[];
ALTER TABLE "public"."Role"
  ALTER COLUMN "permissions" SET DEFAULT ARRAY[]::"Permission"[];
ALTER TABLE "public"."UserCharactersLootlogSettings"
  ALTER COLUMN "catchingGuildIds" SET DEFAULT ARRAY[]::text[];
ALTER TABLE "public"."UserGuildTimerSettings"
  ALTER COLUMN "hiddenTimers" SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN "pinnedTimers" SET DEFAULT ARRAY[]::text[];
ALTER TABLE "public"."UserSettings"
  ALTER COLUMN "guildsOrder" SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN "hiddenGuildIds" SET DEFAULT ARRAY[]::text[]`,
          },
        ],
        postcheck: [
          {
            description: "Verify all legacy array defaults exist",
            sql: `SELECT COUNT(*) = 12 AS result
FROM pg_attrdef d
JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
JOIN pg_class c ON c.oid = d.adrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    (c.relname = 'DiscordGuildChannelSnapshot' AND a.attname IN ('requiredPermissions', 'grantedPermissions', 'missingPermissions'))
    OR (c.relname = 'DiscordGuildSyncState' AND a.attname IN ('requiredPermissions', 'grantedPermissions', 'missingPermissions'))
    OR (c.relname = 'Role' AND a.attname = 'permissions')
    OR (c.relname = 'UserCharactersLootlogSettings' AND a.attname = 'catchingGuildIds')
    OR (c.relname = 'UserGuildTimerSettings' AND a.attname IN ('hiddenTimers', 'pinnedTimers'))
    OR (c.relname = 'UserSettings' AND a.attname IN ('guildsOrder', 'hiddenGuildIds'))
  )`,
          },
        ],
      }),
      rawSql({
        id: "trigger.Reservation_rollout_bridge",
        label: "Create reservation rollout compatibility bridge",
        operationClass: "additive",
        target: { id: "postgres" },
        precheck: [],
        execute: [
          {
            description: "Create reservation rollout compatibility function",
            sql: `CREATE FUNCTION "Reservation_rollout_bridge"()
RETURNS TRIGGER AS $$
DECLARE
  legacy_write BOOLEAN;
  v2_write BOOLEAN;
  matched_member RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    legacy_write := NEW."spotId" IS NULL;
    v2_write := NEW."reservationId" IS NULL;

    IF legacy_write THEN
      NEW."spotName" := COALESCE(NEW."spotName", NEW."reservationId");
      NEW."spotId" := COALESCE(
        NEW."spotId",
        NULLIF(
          trim(
            BOTH '-' FROM regexp_replace(
              translate(
                lower(trim(NEW."reservationId")),
                'ąćęłńóśźż',
                'acelnoszz'
              ),
              '[^a-z0-9]+',
              '-',
              'g'
            )
          ),
          ''
        ),
        concat('legacy-', NEW."id")
      );
      NEW."startsAt" := COALESCE(NEW."startsAt", NEW."fromDate");
      NEW."endsAt" := COALESCE(NEW."endsAt", NEW."toDate");
      NEW."createdAt" := COALESCE(NEW."createdDate", NEW."createdAt");

      SELECT
        member."globalUserId",
        member."userId",
        member."name",
        member."avatar"
      INTO matched_member
      FROM "Member" AS member
      WHERE member."guildId" = NEW."guildId"
        AND member."userId" = NEW."createdBy"
      ORDER BY member."active" DESC, member."updatedAt" DESC
      LIMIT 1;

      NEW."createdByUserId" := COALESCE(
        NEW."createdByUserId",
        matched_member."globalUserId"
      );
      NEW."authorDisplayName" := COALESCE(
        NEW."authorDisplayName",
        matched_member."name",
        'Nieznany użytkownik'
      );
      NEW."authorAvatarUrl" := COALESCE(
        NEW."authorAvatarUrl",
        CASE
          WHEN matched_member."avatar" IS NULL THEN NULL
          ELSE concat(
            'https://cdn.discordapp.com/avatars/',
            matched_member."userId",
            '/',
            matched_member."avatar",
            CASE
              WHEN starts_with(matched_member."avatar", 'a_') THEN '.gif'
              ELSE '.webp'
            END,
            '?size=128'
          )
        END
      );
    ELSIF v2_write THEN
      NEW."reservationId" := NEW."spotName";
      NEW."createdDate" := NEW."createdAt";
      NEW."fromDate" := NEW."startsAt";
      NEW."toDate" := NEW."endsAt";

      SELECT member."userId"
      INTO matched_member
      FROM "Member" AS member
      WHERE member."guildId" = NEW."guildId"
        AND member."globalUserId" = NEW."createdByUserId"
      ORDER BY member."active" DESC, member."updatedAt" DESC
      LIMIT 1;

      NEW."createdBy" := matched_member."userId";
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW."spotName" IS DISTINCT FROM OLD."spotName" THEN
      NEW."reservationId" := NEW."spotName";
    ELSIF NEW."reservationId" IS DISTINCT FROM OLD."reservationId" THEN
      NEW."spotName" := NEW."reservationId";
    END IF;

    IF NEW."startsAt" IS DISTINCT FROM OLD."startsAt" THEN
      NEW."fromDate" := NEW."startsAt";
    ELSIF NEW."fromDate" IS DISTINCT FROM OLD."fromDate" THEN
      NEW."startsAt" := NEW."fromDate";
    END IF;

    IF NEW."endsAt" IS DISTINCT FROM OLD."endsAt" THEN
      NEW."toDate" := NEW."endsAt";
    ELSIF NEW."toDate" IS DISTINCT FROM OLD."toDate" THEN
      NEW."endsAt" := NEW."toDate";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql`,
          },
          {
            description: "Create reservation rollout compatibility trigger",
            sql: `CREATE TRIGGER "Reservation_rollout_bridge_trigger"
BEFORE INSERT OR UPDATE ON "Reservation"
FOR EACH ROW
EXECUTE FUNCTION "Reservation_rollout_bridge"()`,
          },
        ],
        postcheck: [
          {
            description: "Verify the rollout trigger is installed",
            sql: `SELECT EXISTS (
  SELECT 1
  FROM pg_trigger
  WHERE tgname = 'Reservation_rollout_bridge_trigger'
    AND NOT tgisinternal
) AS result`,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
