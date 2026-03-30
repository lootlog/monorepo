import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const notificationOwnerType = pgEnum("notification_owner_type", [
  "guild",
  "user",
]);

export const notificationProvider = pgEnum("notification_provider", [
  "discord",
]);

export const notificationTargetType = pgEnum("notification_target_type", [
  "channel",
  "dm",
]);

export const notificationTriggerType = pgEnum("notification_trigger_type", [
  "timer_before_spawn",
  "npc_spawned",
  "watched_item_dropped",
]);

export const notificationJobStatus = pgEnum("notification_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const notificationTargets = pgTable(
  "notification_targets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ownerType: notificationOwnerType("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
    provider: notificationProvider("provider").notNull(),
    targetType: notificationTargetType("target_type").notNull(),
    externalId: text("external_id").notNull(),
    displayName: text("display_name"),
    guildName: text("guild_name"),
    enabled: boolean("enabled").default(true).notNull(),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("uq_target_owner_provider_external").on(
      table.ownerType,
      table.ownerId,
      table.provider,
      table.externalId,
    ),
    index("idx_target_owner").on(table.ownerType, table.ownerId),
  ],
);

export const notificationRules = pgTable(
  "notification_rules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ownerType: notificationOwnerType("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
    triggerType: notificationTriggerType("trigger_type").notNull(),
    guildId: text("guild_id"),
    world: text("world"),
    filters: jsonb("filters").default({}).notNull(),
    leadTimeMinutes: integer("lead_time_minutes"),
    dedupeWindowSeconds: integer("dedupe_window_seconds")
      .default(300)
      .notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_rule_owner").on(table.ownerType, table.ownerId),
    index("idx_rule_trigger_guild").on(
      table.triggerType,
      table.guildId,
      table.world,
    ),
  ],
);

export const notificationRulesToTargets = pgTable(
  "notification_rules_to_targets",
  {
    ruleId: text("rule_id")
      .notNull()
      .references(() => notificationRules.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => notificationTargets.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.ruleId, table.targetId] })],
);

export const watchedItems = pgTable(
  "watched_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").notNull(),
    itemId: integer("item_id").notNull(),
    itemName: text("item_name").notNull(),
    itemIcon: text("item_icon"),
    world: text("world"),
    ruleId: text("rule_id").references(() => notificationRules.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_watched_item_user_item_world").on(
      table.userId,
      table.itemId,
      table.world,
    ),
    index("idx_watched_item_user").on(table.userId),
    index("idx_watched_item_item_world").on(table.itemId, table.world),
  ],
);

export const notificationJobs = pgTable(
  "notification_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ruleId: text("rule_id")
      .notNull()
      .references(() => notificationRules.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => notificationTargets.id, { onDelete: "cascade" }),
    scheduledFor: timestamp("scheduled_for").notNull(),
    status: notificationJobStatus("status").default("pending").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    payload: jsonb("payload").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    lastError: text("last_error"),
    processedAt: timestamp("processed_at"),
    bullJobId: text("bull_job_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_job_status_scheduled").on(table.status, table.scheduledFor),
    index("idx_job_rule").on(table.ruleId),
  ],
);

export const discordChannelCache = pgTable(
  "discord_channel_cache",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    discordGuildId: text("discord_guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    channelName: text("channel_name").notNull(),
    channelType: text("channel_type").notNull(),
    cachedAt: timestamp("cached_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_discord_channel_guild_channel").on(
      table.discordGuildId,
      table.channelId,
    ),
    index("idx_discord_channel_guild").on(table.discordGuildId),
  ],
);

export type NotificationTarget = typeof notificationTargets.$inferSelect;
export type NewNotificationTarget = typeof notificationTargets.$inferInsert;

export type NotificationRule = typeof notificationRules.$inferSelect;
export type NewNotificationRule = typeof notificationRules.$inferInsert;

export type WatchedItem = typeof watchedItems.$inferSelect;
export type NewWatchedItem = typeof watchedItems.$inferInsert;

export type NotificationJob = typeof notificationJobs.$inferSelect;
export type NewNotificationJob = typeof notificationJobs.$inferInsert;

export type DiscordChannelCacheEntry = typeof discordChannelCache.$inferSelect;
export type NewDiscordChannelCacheEntry =
  typeof discordChannelCache.$inferInsert;
