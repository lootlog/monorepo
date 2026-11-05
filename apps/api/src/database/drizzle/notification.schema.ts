import type { JsonValue } from "#src/database/json";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { guildTable } from "./organization.schema.js";

export const notificationOwnerTypeEnum = pgEnum("NotificationOwnerType", [
  "GUILD",
  "USER",
]);

export const notificationProviderEnum = pgEnum("NotificationProvider", [
  "DISCORD",
]);

export const notificationTargetTypeEnum = pgEnum("NotificationTargetType", [
  "CHANNEL",
  "DM",
]);

export const notificationTriggerTypeEnum = pgEnum("NotificationTriggerType", [
  "TIMER_BEFORE_SPAWN",
  "NPC_SPAWNED",
  "WATCHED_ITEM_DROPPED",
  "SCHEDULED_MESSAGE",
  "HERO_SIGHTED",
]);

export const notificationScheduleStrategyEnum = pgEnum(
  "NotificationScheduleStrategy",
  ["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"],
);

export const notificationScheduleAnchorEnum = pgEnum(
  "NotificationScheduleAnchor",
  ["MIN_SPAWN", "MAX_SPAWN"],
);

export const notificationScheduleIntervalTypeEnum = pgEnum(
  "NotificationScheduleIntervalType",
  ["ONCE", "HOURLY", "DAILY", "WEEKLY"],
);

export const notificationJobKindEnum = pgEnum("NotificationJobKind", [
  "SCHEDULED",
  "INSTANT",
  "TEST",
]);

export const notificationJobStatusEnum = pgEnum("NotificationJobStatus", [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "BLOCKED",
  "CANCELED",
]);

export const notificationTargetTable = pgTable(
  "NotificationTarget",
  {
    id: serial("id").notNull().primaryKey(),
    ownerType: notificationOwnerTypeEnum("ownerType").notNull(),
    ownerId: text("ownerId").notNull(),
    provider: notificationProviderEnum("provider").notNull(),
    targetType: notificationTargetTypeEnum("targetType").notNull(),
    externalId: text("externalId").notNull(),
    displayName: text("displayName"),
    guildName: text("guildName"),
    metadata: jsonb("metadata").$type<JsonValue>(),
    active: boolean("active").default(true).notNull(),
    canSend: boolean("canSend").default(true).notNull(),
    lastSyncedAt: timestamp("lastSyncedAt", { mode: "date", precision: 3 }),
    lastDeliveryAt: timestamp("lastDeliveryAt", { mode: "date", precision: 3 }),
    lastDeliveryError: text("lastDeliveryError"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex(
      "NotificationTarget_ownerType_ownerId_provider_targetType_ex_key",
    ).on(
      table["ownerType"],
      table["ownerId"],
      table["provider"],
      table["targetType"],
      table["externalId"],
    ),
    index("NotificationTarget_ownerType_ownerId_active_idx").on(
      table["ownerType"],
      table["ownerId"],
      table["active"],
    ),
  ],
);

export const notificationRuleTable = pgTable(
  "NotificationRule",
  {
    id: serial("id").notNull().primaryKey(),
    ownerType: notificationOwnerTypeEnum("ownerType").notNull(),
    ownerId: text("ownerId").notNull(),
    triggerType: notificationTriggerTypeEnum("triggerType").notNull(),
    guildId: text("guildId"),
    world: text("world"),
    name: text("name"),
    filters: jsonb("filters").$type<JsonValue>(),
    contentTemplate: text("contentTemplate"),
    scheduleStrategy: notificationScheduleStrategyEnum("scheduleStrategy"),
    scheduleAnchor: notificationScheduleAnchorEnum("scheduleAnchor"),
    scheduleOffsetMinutes: integer("scheduleOffsetMinutes"),
    scheduledAt: timestamp("scheduledAt", { mode: "date", precision: 3 }),
    scheduleIntervalType: notificationScheduleIntervalTypeEnum(
      "scheduleIntervalType",
    ),
    scheduleIntervalValue: integer("scheduleIntervalValue"),
    scheduleWeekday: integer("scheduleWeekday"),
    scheduleTimeOfDay: text("scheduleTimeOfDay"),
    scheduledUntil: timestamp("scheduledUntil", { mode: "date", precision: 3 }),
    scheduleTimezone: text("scheduleTimezone"),
    enabled: boolean("enabled").default(true).notNull(),
    dedupeWindowSeconds: integer("dedupeWindowSeconds").default(0).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("NotificationRule_ownerType_ownerId_enabled_idx").on(
      table["ownerType"],
      table["ownerId"],
      table["enabled"],
    ),
    index("NotificationRule_guildId_world_triggerType_enabled_idx").on(
      table["guildId"],
      table["world"],
      table["triggerType"],
      table["enabled"],
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "NotificationRule_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const notificationRuleTargetTable = pgTable(
  "NotificationRuleTarget",
  {
    ruleId: integer("ruleId").notNull(),
    targetId: integer("targetId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table["ruleId"], table["targetId"]],
      name: "NotificationRuleTarget_pkey",
    }),
    index("NotificationRuleTarget_targetId_idx").on(table["targetId"]),
    foreignKey({
      columns: [table["ruleId"]],
      foreignColumns: [notificationRuleTable["id"]],
      name: "NotificationRuleTarget_ruleId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["targetId"]],
      foreignColumns: [notificationTargetTable["id"]],
      name: "NotificationRuleTarget_targetId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const notificationJobTable = pgTable(
  "NotificationJob",
  {
    id: text("id").notNull().primaryKey(),
    ruleId: integer("ruleId").notNull(),
    targetId: integer("targetId").notNull(),
    ownerType: notificationOwnerTypeEnum("ownerType").notNull(),
    ownerId: text("ownerId").notNull(),
    jobKind: notificationJobKindEnum("jobKind").notNull(),
    scheduledFor: timestamp("scheduledFor", {
      mode: "date",
      precision: 3,
    }).notNull(),
    status: notificationJobStatusEnum("status").default("PENDING").notNull(),
    idempotencyKey: text("idempotencyKey").notNull(),
    sourceEntityType: text("sourceEntityType"),
    sourceEntityId: text("sourceEntityId"),
    sourceEventId: text("sourceEventId"),
    payloadSnapshot: jsonb("payloadSnapshot").$type<JsonValue>().notNull(),
    attemptCount: integer("attemptCount").default(0).notNull(),
    lastError: text("lastError"),
    blockedReason: text("blockedReason"),
    providerMessageId: text("providerMessageId"),
    processedAt: timestamp("processedAt", { mode: "date", precision: 3 }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("NotificationJob_idempotencyKey_key").on(
      table["idempotencyKey"],
    ),
    index("NotificationJob_ruleId_status_idx").on(
      table["ruleId"],
      table["status"],
    ),
    index("NotificationJob_targetId_status_idx").on(
      table["targetId"],
      table["status"],
    ),
    index("NotificationJob_ownerType_ownerId_status_scheduledFor_idx").on(
      table["ownerType"],
      table["ownerId"],
      table["status"],
      table["scheduledFor"],
    ),
    index("NotificationJob_status_scheduledFor_idx").on(
      table["status"],
      table["scheduledFor"],
    ),
    foreignKey({
      columns: [table["ruleId"]],
      foreignColumns: [notificationRuleTable["id"]],
      name: "NotificationJob_ruleId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["targetId"]],
      foreignColumns: [notificationTargetTable["id"]],
      name: "NotificationJob_targetId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const watchedItemTable = pgTable(
  "WatchedItem",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    itemId: integer("itemId").notNull(),
    itemName: text("itemName").notNull(),
    world: text("world").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    notificationRuleId: integer("notificationRuleId"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("WatchedItem_notificationRuleId_key").on(
      table["notificationRuleId"],
    ),
    uniqueIndex("WatchedItem_userId_itemId_world_key").on(
      table["userId"],
      table["itemId"],
      table["world"],
    ),
    index("WatchedItem_userId_enabled_idx").on(
      table["userId"],
      table["enabled"],
    ),
    index("WatchedItem_itemId_world_enabled_idx").on(
      table["itemId"],
      table["world"],
      table["enabled"],
    ),
    foreignKey({
      columns: [table["notificationRuleId"]],
      foreignColumns: [notificationRuleTable["id"]],
      name: "WatchedItem_notificationRuleId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);
