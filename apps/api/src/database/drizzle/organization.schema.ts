import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const permissionEnum = pgEnum("Permission", [
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
  "LOOTLOG_PRESENCE_LOCATION_READ",
]);

export const memberTypeEnum = pgEnum("MemberType", [
  "OWNER",
  "ADMIN",
  "USER",
  "BOT",
]);

export const refreshJobStatusEnum = pgEnum("RefreshJobStatus", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

export const discordGuildSyncStatusEnum = pgEnum("DiscordGuildSyncStatus", [
  "SYNCED",
  "SYNCING",
  "FAILED",
  "STALE",
  "NOT_FOUND",
]);

export const guildTable = pgTable(
  "Guild",
  {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull(),
    icon: text("icon"),
    banner: text("banner"),
    ownerId: text("ownerId").notNull(),
    vanityUrl: text("vanityUrl"),
    notificationRuleLimit: integer("notificationRuleLimit")
      .default(20)
      .notNull(),
    publicStatsCardEnabled: boolean("publicStatsCardEnabled")
      .default(false)
      .notNull(),
    reservationMaxDurationMinutes: integer("reservationMaxDurationMinutes")
      .default(180)
      .notNull(),
    reservationMinDurationMinutes: integer("reservationMinDurationMinutes")
      .default(30)
      .notNull(),
    reservationTimeGranularityMinutes: integer(
      "reservationTimeGranularityMinutes",
    )
      .default(15)
      .notNull(),
    reservationMaxAdvanceDays: integer("reservationMaxAdvanceDays")
      .default(7)
      .notNull(),
    reservationActiveLimitPerSpot: integer("reservationActiveLimitPerSpot")
      .default(3)
      .notNull(),
    documentLimit: integer("documentLimit").default(50).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
    active: boolean("active").default(true).notNull(),
  },
  (table) => [
    // Organization ids are Discord snowflakes (digits only). A vanity URL that
    // could be one must not exist, so it can never be mistaken for an id.
    check(
      "Guild_vanityUrl_not_id_like_check",
      sql`${table["vanityUrl"]} <> '' AND ${table["vanityUrl"]} !~ '^[0-9]+$'`,
    ),
    uniqueIndex("Guild_vanityUrl_key").on(table["vanityUrl"]),
    index("Guild_ownerId_idx").on(table["ownerId"]),
  ],
);

export const roleTable = pgTable(
  "Role",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    name: text("name").notNull(),
    color: integer("color"),
    position: integer("position"),
    permissions: permissionEnum("permissions")
      .array()
      .default(sql`'{}'::"Permission"[]`)
      .notNull(),
    lvlRangeFrom: integer("lvlRangeFrom").default(0),
    lvlRangeTo: integer("lvlRangeTo").default(500),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("Role_id_guildId_key").on(table["id"], table["guildId"]),
    index("Role_guildId_idx").on(table["guildId"]),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "Role_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const memberTable = pgTable(
  "Member",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    guildId: text("guildId").notNull(),
    type: memberTypeEnum("type").default("USER").notNull(),
    name: text("name").notNull(),
    /** The User's Discord display name, independent of the server nickname in `name`. */
    discordDisplayName: text("discordDisplayName"),
    avatar: text("avatar"),
    banner: text("banner"),
    active: boolean("active").default(true).notNull(),
    globalUserId: text("globalUserId"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
    lastDiscordSyncAt: timestamp("lastDiscordSyncAt", {
      mode: "date",
      precision: 3,
    }),
    lastDiscordAttemptAt: timestamp("lastDiscordAttemptAt", {
      mode: "date",
      precision: 3,
    }),
    lastDiscordStatus: text("lastDiscordStatus"),
  },
  (table) => [
    uniqueIndex("Member_userId_guildId_key").on(
      table["userId"],
      table["guildId"],
    ),
    index("Member_guildId_id_idx").on(table["guildId"], table["id"]),
    index("Member_globalUserId_guildId_active_idx").on(
      table["globalUserId"],
      table["guildId"],
      table["active"],
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "Member_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const memberSyncDeliveryTable = pgTable("MemberSyncDelivery", {
  memberId: integer("memberId")
    .primaryKey()
    .references(() => memberTable.id, { onDelete: "cascade" }),
  permissionsChanged: boolean("permissionsChanged").notNull(),
  version: integer("version").default(1).notNull(),
  claimedUntil: timestamp("claimedUntil", { mode: "date", precision: 3 }),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull(),
});

export const discordGuildChannelSnapshotTable = pgTable(
  "DiscordGuildChannelSnapshot",
  {
    id: serial("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    channelId: text("channelId").notNull(),
    name: text("name").notNull(),
    channelType: text("channelType").notNull(),
    parentId: text("parentId"),
    position: integer("position").notNull(),
    active: boolean("active").default(true).notNull(),
    canView: boolean("canView").default(true).notNull(),
    canSend: boolean("canSend").default(true).notNull(),
    hasRequiredPermissions: boolean("hasRequiredPermissions")
      .default(false)
      .notNull(),
    requiredPermissions: text("requiredPermissions")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    grantedPermissions: text("grantedPermissions")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    missingPermissions: text("missingPermissions")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    lastSyncedAt: timestamp("lastSyncedAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("DiscordGuildChannelSnapshot_guildId_channelId_key").on(
      table["guildId"],
      table["channelId"],
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "DiscordGuildChannelSnapshot_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const discordGuildSyncStateTable = pgTable(
  "DiscordGuildSyncState",
  {
    guildId: text("guildId").notNull().primaryKey(),
    status: discordGuildSyncStatusEnum("status").default("STALE").notNull(),
    hasRequiredPermissions: boolean("hasRequiredPermissions")
      .default(false)
      .notNull(),
    requiredPermissions: text("requiredPermissions")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    grantedPermissions: text("grantedPermissions")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    missingPermissions: text("missingPermissions")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    channelCount: integer("channelCount").default(0).notNull(),
    selectableChannelCount: integer("selectableChannelCount")
      .default(0)
      .notNull(),
    lastAttemptAt: timestamp("lastAttemptAt", { mode: "date", precision: 3 }),
    lastSuccessAt: timestamp("lastSuccessAt", { mode: "date", precision: 3 }),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "DiscordGuildSyncState_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const memberRefreshJobTable = pgTable(
  "MemberRefreshJob",
  {
    id: serial("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    requestedBy: text("requestedBy").notNull(),
    status: refreshJobStatusEnum("status").default("PENDING").notNull(),
    totalMembers: integer("totalMembers").default(0).notNull(),
    processedMembers: integer("processedMembers").default(0).notNull(),
    failedMembers: integer("failedMembers").default(0).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
    completedAt: timestamp("completedAt", { mode: "date", precision: 3 }),
  },
  (table) => [index("MemberRefreshJob_guildId_idx").on(table["guildId"])],
);

export const memberToRoleTable = pgTable(
  "_MemberToRole",
  { A: integer("A").notNull(), B: text("B").notNull() },
  (table) => [
    primaryKey({ columns: [table.A, table.B], name: "_MemberToRole_AB_pkey" }),
    index("_MemberToRole_B_index").on(table.B),
    foreignKey({
      columns: [table.A],
      foreignColumns: [memberTable.id],
      name: "_MemberToRole_A_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.B],
      foreignColumns: [roleTable.id],
      name: "_MemberToRole_B_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);
