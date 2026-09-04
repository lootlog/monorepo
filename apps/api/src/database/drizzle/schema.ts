// Generated from drizzle/legacy-prisma/schema.prisma. Do not edit by hand.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
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
export const npcTypeEnum = pgEnum("NpcType", [
  "COMMON",
  "ELITE",
  "ELITE2",
  "ELITE3",
  "HERO",
  "EVENT_HERO",
  "TITAN",
  "COLOSSUS",
  "NPC",
]);
export const itemTypeEnum = pgEnum("ItemType", [
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
]);
export const itemRarityEnum = pgEnum("ItemRarity", [
  "UNIQUE",
  "HEROIC",
  "LEGENDARY",
  "UPGRADED",
]);
export const professionEnum = pgEnum("Profession", [
  "WARRIOR",
  "PALADIN",
  "HUNTER",
  "MAGE",
  "BLADE_DANCER",
  "TRACKER",
]);
export const lootSourceEnum = pgEnum("LootSource", [
  "LOOTBOX",
  "DIALOG",
  "FIGHT",
]);
export const lootShareSourceEnum = pgEnum("LootShareSource", [
  "NONE",
  "ITEM_OWNER",
  "CHAT_MESSAGE",
]);
export const timerHistoryActionEnum = pgEnum("TimerHistoryAction", [
  "CREATE",
  "RESET",
  "DELETE",
  "RESTORE",
]);
export const guildDocumentHistoryActionEnum = pgEnum(
  "GuildDocumentHistoryAction",
  ["SAVE", "DELETE", "RESTORE"],
);
export const refreshJobStatusEnum = pgEnum("RefreshJobStatus", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);
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
]);
export const notificationScheduleStrategyEnum = pgEnum(
  "NotificationScheduleStrategy",
  ["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"],
);
export const settingsScopeTypeEnum = pgEnum("SettingsScopeType", [
  "USER",
  "GAME_ACCOUNT",
  "CHARACTER",
  "GUILD",
]);
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
export const discordGuildSyncStatusEnum = pgEnum("DiscordGuildSyncStatus", [
  "SYNCED",
  "SYNCING",
  "FAILED",
  "STALE",
  "NOT_FOUND",
]);
export const coverageGapTypeEnum = pgEnum("CoverageGapType", [
  "UNASSIGNED",
  "UNCOVERED",
]);
export const eventScoringModeEnum = pgEnum("EventScoringMode", [
  "SIMPLE",
  "ADVANCED",
]);
export const pointsEditTypeEnum = pgEnum("PointsEditType", [
  "KILL_POINT",
  "RANKING",
]);

export const guildTable = pgTable(
  "Guild",
  {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull(),
    icon: text("icon"),
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
    uniqueIndex("Guild_vanityUrl_key").on(table["vanityUrl"]),
    index("Guild_vanityUrl_idx").on(table["vanityUrl"]),
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
    index("Role_id_guildId_idx").on(table["id"], table["guildId"]),
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
    index("Member_id_guildId_idx").on(table["id"], table["guildId"]),
    index("Member_userId_guildId_active_lastDiscordSyncAt_idx").on(
      table["userId"],
      table["guildId"],
      table["active"],
      table["lastDiscordSyncAt"],
    ),
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

export const timerTable = pgTable(
  "Timer",
  {
    createdById: integer("createdById").notNull(),
    guildId: text("guildId").notNull(),
    npcId: integer("npcId").notNull(),
    timerKey: text("timerKey").notNull(),
    world: text("world").notNull(),
    minSpawnTime: timestamp("minSpawnTime", {
      mode: "date",
      precision: 3,
    }).notNull(),
    maxSpawnTime: timestamp("maxSpawnTime", {
      mode: "date",
      precision: 3,
    }).notNull(),
    latestRespBaseSeconds: integer("latestRespBaseSeconds")
      .default(0)
      .notNull(),
    latestRespawnRandomness: integer("latestRespawnRandomness")
      .default(0)
      .notNull(),
    tempId: text("tempId"),
    wasReset: boolean("wasReset").default(false).notNull(),
    npc: jsonb("npc").notNull(),
    windowOpenedAt: timestamp("windowOpenedAt", { mode: "date", precision: 3 }),
    actorCharacterSnapshotId: integer("actorCharacterSnapshotId"),
    actorCharacterLvl: integer("actorCharacterLvl"),
    deletedAt: timestamp("deletedAt", { mode: "date", precision: 3 }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table["guildId"], table["world"], table["timerKey"]],
      name: "Timer_pkey",
    }),
    index("Timer_guildId_world_timerKey_idx").on(
      table["guildId"],
      table["world"],
      table["timerKey"],
    ),
    index("Timer_npcId_guildId_idx").on(table["npcId"], table["guildId"]),
    index("Timer_guildId_maxSpawnTime_idx").on(
      table["guildId"],
      table["maxSpawnTime"],
    ),
    index("Timer_guildId_world_deletedAt_maxSpawnTime_idx").on(
      table["guildId"],
      table["world"],
      table["deletedAt"],
      table["maxSpawnTime"],
    ),
    index("Timer_world_guildId_idx").on(table["world"], table["guildId"]),
    index("Timer_createdById_idx").on(table["createdById"]),
    index("Timer_actorCharacterSnapshotId_idx").on(
      table["actorCharacterSnapshotId"],
    ),
    foreignKey({
      columns: [table["createdById"]],
      foreignColumns: [memberTable["id"]],
      name: "Timer_createdById_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "Timer_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["actorCharacterSnapshotId"]],
      foreignColumns: [playerSnapshotTable["id"]],
      name: "Timer_actorCharacterSnapshotId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    index("idx_timer_npc_name").using("btree", sql`(${table["npc"]}->>'name')`),
  ],
);

export const lootTable = pgTable(
  "Loot",
  {
    id: serial("id").notNull().primaryKey(),
    uniqueId: text("uniqueId").notNull(),
    world: text("world").notNull(),
    source: lootSourceEnum("source").notNull(),
    location: text("location").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
    lootShare: jsonb("lootShare")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    lootShareSource: lootShareSourceEnum("lootShareSource")
      .default("NONE")
      .notNull(),
  },
  (table) => [
    uniqueIndex("Loot_uniqueId_key").on(table["uniqueId"]),
    index("Loot_createdAt_idx").on(table["createdAt"]),
    index("Loot_world_createdAt_idx").on(table["world"], table["createdAt"]),
    index("Loot_world_id_idx").on(table["world"], table["id"]),
  ],
);

export const itemSnapshotTable = pgTable(
  "ItemSnapshot",
  {
    id: serial("id").notNull().primaryKey(),
    itemId: integer("itemId").notNull(),
    statsHash: text("statsHash").notNull(),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    lvl: integer("lvl"),
    rarity: itemRarityEnum("rarity"),
    itemType: text("itemType"),
    statRaw: text("statRaw").notNull(),
    statsSnapshot: jsonb("statsSnapshot").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("ItemSnapshot_itemId_statsHash_key").on(
      table["itemId"],
      table["statsHash"],
    ),
    index("ItemSnapshot_name_idx").on(table["name"]),
    index("ItemSnapshot_rarity_lvl_idx").on(table["rarity"], table["lvl"]),
  ],
);

export const lootItemTable = pgTable(
  "LootItem",
  {
    id: serial("id").notNull().primaryKey(),
    lootId: integer("lootId").notNull(),
    itemSnapshotId: integer("itemSnapshotId").notNull(),
    hid: text("hid").notNull(),
  },
  (table) => [
    index("LootItem_lootId_itemSnapshotId_idx").on(
      table["lootId"],
      table["itemSnapshotId"],
    ),
    index("LootItem_hid_lootId_idx").on(table["hid"], table["lootId"]),
    index("LootItem_itemSnapshotId_lootId_idx").on(
      table["itemSnapshotId"],
      table["lootId"],
    ),
    foreignKey({
      columns: [table["lootId"]],
      foreignColumns: [lootTable["id"]],
      name: "LootItem_lootId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["itemSnapshotId"]],
      foreignColumns: [itemSnapshotTable["id"]],
      name: "LootItem_itemSnapshotId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const playerSnapshotTable = pgTable(
  "PlayerSnapshot",
  {
    id: serial("id").notNull().primaryKey(),
    world: text("world").notNull(),
    accountId: integer("accountId").notNull(),
    characterId: integer("characterId").notNull(),
    snapshotHash: text("snapshotHash").notNull(),
    name: text("name").notNull(),
    prof: professionEnum("prof"),
    icon: text("icon"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex(
      "PlayerSnapshot_world_accountId_characterId_snapshotHash_key",
    ).on(
      table["world"],
      table["accountId"],
      table["characterId"],
      table["snapshotHash"],
    ),
    index("PlayerSnapshot_world_name_idx").on(table["world"], table["name"]),
    index("PlayerSnapshot_accountId_characterId_idx").on(
      table["accountId"],
      table["characterId"],
    ),
    index("PlayerSnapshot_name_idx").on(table["name"]),
  ],
);

export const timerHistoryEntryTable = pgTable(
  "TimerHistoryEntry",
  {
    id: serial("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    world: text("world").notNull(),
    timerKey: text("timerKey").notNull(),
    npcId: integer("npcId").notNull(),
    npc: jsonb("npc").notNull(),
    action: timerHistoryActionEnum("action").notNull(),
    actorMemberId: integer("actorMemberId").notNull(),
    actorCharacterSnapshotId: integer("actorCharacterSnapshotId"),
    actorCharacterLvl: integer("actorCharacterLvl"),
    minSpawnTime: timestamp("minSpawnTime", { mode: "date", precision: 3 }),
    maxSpawnTime: timestamp("maxSpawnTime", { mode: "date", precision: 3 }),
    latestRespBaseSeconds: integer("latestRespBaseSeconds"),
    latestRespawnRandomness: integer("latestRespawnRandomness"),
    wasReset: boolean("wasReset"),
    windowOpenedAt: timestamp("windowOpenedAt", { mode: "date", precision: 3 }),
    timerCreatedById: integer("timerCreatedById"),
    timerActorCharacterSnapshotId: integer("timerActorCharacterSnapshotId"),
    timerActorCharacterLvl: integer("timerActorCharacterLvl"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("TimerHistoryEntry_guildId_world_timerKey_createdAt_idx").on(
      table["guildId"],
      table["world"],
      table["timerKey"],
      table["createdAt"],
    ),
    index("TimerHistoryEntry_guildId_world_createdAt_idx").on(
      table["guildId"],
      table["world"],
      table["createdAt"],
    ),
    index("TimerHistoryEntry_actorMemberId_idx").on(table["actorMemberId"]),
    index("TimerHistoryEntry_actorCharacterSnapshotId_idx").on(
      table["actorCharacterSnapshotId"],
    ),
    index("TimerHistoryEntry_timerCreatedById_idx").on(
      table["timerCreatedById"],
    ),
    index("TimerHistoryEntry_timerActorCharacterSnapshotId_idx").on(
      table["timerActorCharacterSnapshotId"],
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "TimerHistoryEntry_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["actorMemberId"]],
      foreignColumns: [memberTable["id"]],
      name: "TimerHistoryEntry_actorMemberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["actorCharacterSnapshotId"]],
      foreignColumns: [playerSnapshotTable["id"]],
      name: "TimerHistoryEntry_actorCharacterSnapshotId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["timerCreatedById"]],
      foreignColumns: [memberTable["id"]],
      name: "TimerHistoryEntry_timerCreatedById_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["timerActorCharacterSnapshotId"]],
      foreignColumns: [playerSnapshotTable["id"]],
      name: "TimerHistoryEntry_timerActorCharacterSnapshotId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const lootPlayerTable = pgTable(
  "LootPlayer",
  {
    id: serial("id").notNull().primaryKey(),
    lootId: integer("lootId").notNull(),
    playerSnapshotId: integer("playerSnapshotId").notNull(),
    lvl: integer("lvl"),
    hpp: integer("hpp"),
  },
  (table) => [
    index("LootPlayer_lootId_idx").on(table["lootId"]),
    index("LootPlayer_playerSnapshotId_idx").on(table["playerSnapshotId"]),
    foreignKey({
      columns: [table["lootId"]],
      foreignColumns: [lootTable["id"]],
      name: "LootPlayer_lootId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["playerSnapshotId"]],
      foreignColumns: [playerSnapshotTable["id"]],
      name: "LootPlayer_playerSnapshotId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const npcSnapshotTable = pgTable(
  "NpcSnapshot",
  {
    id: serial("id").notNull().primaryKey(),
    npcId: integer("npcId").notNull(),
    name: text("name").notNull(),
    type: npcTypeEnum("type"),
    lvl: integer("lvl"),
    icon: text("icon"),
    wt: integer("wt"),
    margonemType: integer("margonemType"),
    prof: professionEnum("prof"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("NpcSnapshot_npcId_name_key").on(table["npcId"], table["name"]),
    index("NpcSnapshot_name_idx").on(table["name"]),
    index("NpcSnapshot_type_lvl_idx").on(table["type"], table["lvl"]),
  ],
);

export const lootNpcTable = pgTable(
  "LootNpc",
  {
    id: serial("id").notNull().primaryKey(),
    lootId: integer("lootId").notNull(),
    npcSnapshotId: integer("npcSnapshotId").notNull(),
  },
  (table) => [
    index("LootNpc_lootId_idx").on(table["lootId"]),
    index("LootNpc_npcSnapshotId_idx").on(table["npcSnapshotId"]),
    foreignKey({
      columns: [table["lootId"]],
      foreignColumns: [lootTable["id"]],
      name: "LootNpc_lootId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["npcSnapshotId"]],
      foreignColumns: [npcSnapshotTable["id"]],
      name: "LootNpc_npcSnapshotId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const organizationLootRecordTable = pgTable(
  "OrganizationLootRecord",
  {
    id: serial("id").notNull().primaryKey(),
    lootId: integer("lootId").notNull(),
    guildId: text("guildId").notNull(),
    archivedAt: timestamp("archivedAt", { mode: "date", precision: 3 }),
    archivedByMemberId: integer("archivedByMemberId"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("OrganizationLootRecord_guildId_lootId_key").on(
      table["guildId"],
      table["lootId"],
    ),
    index("OrganizationLootRecord_lootId_idx").on(table["lootId"]),
    index("OrganizationLootRecord_guildId_archivedAt_lootId_idx").on(
      table["guildId"],
      table["archivedAt"],
      table["lootId"],
    ),
    index("OrganizationLootRecord_archivedByMemberId_idx").on(
      table["archivedByMemberId"],
    ),
    foreignKey({
      columns: [table["lootId"]],
      foreignColumns: [lootTable["id"]],
      name: "OrganizationLootRecord_lootId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "OrganizationLootRecord_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["archivedByMemberId"]],
      foreignColumns: [memberTable["id"]],
      name: "OrganizationLootRecord_archivedByMemberId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const lootSubmissionTable = pgTable(
  "LootSubmission",
  {
    id: serial("id").notNull().primaryKey(),
    organizationLootRecordId: integer("organizationLootRecordId").notNull(),
    memberId: integer("memberId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("LootSubmission_organizationLootRecordId_memberId_key").on(
      table["organizationLootRecordId"],
      table["memberId"],
    ),
    index("LootSubmission_memberId_idx").on(table["memberId"]),
    foreignKey({
      columns: [table["organizationLootRecordId"]],
      foreignColumns: [organizationLootRecordTable["id"]],
      name: "LootSubmission_organizationLootRecordId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "LootSubmission_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const lootCommentTable = pgTable(
  "LootComment",
  {
    id: serial("id").notNull().primaryKey(),
    organizationLootRecordId: integer("organizationLootRecordId").notNull(),
    memberId: integer("memberId").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("LootComment_organizationLootRecordId_createdAt_idx").on(
      table["organizationLootRecordId"],
      table["createdAt"],
    ),
    index("LootComment_memberId_idx").on(table["memberId"]),
    foreignKey({
      columns: [table["organizationLootRecordId"]],
      foreignColumns: [organizationLootRecordTable["id"]],
      name: "LootComment_organizationLootRecordId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "LootComment_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const lootlogConfigNpcTable = pgTable(
  "LootlogConfigNpc",
  {
    id: serial("id").notNull().primaryKey(),
    lootlogConfigId: text("lootlogConfigId").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    allowedRarities: itemRarityEnum("allowedRarities").array().notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table["lootlogConfigId"]],
      foreignColumns: [lootlogConfigTable["id"]],
      name: "LootlogConfigNpc_lootlogConfigId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const lootlogConfigTable = pgTable("LootlogConfig", {
  id: text("id").notNull().primaryKey(),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
});

export const reservationTable = pgTable(
  "Reservation",
  {
    id: serial("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    spotId: text("spotId").notNull(),
    spotName: text("spotName").notNull(),
    startsAt: timestamp("startsAt", { mode: "date", precision: 3 }).notNull(),
    endsAt: timestamp("endsAt", { mode: "date", precision: 3 }).notNull(),
    createdByUserId: text("createdByUserId"),
    authorDisplayName: text("authorDisplayName").notNull(),
    authorAvatarUrl: text("authorAvatarUrl"),
    reminderMinutesBefore: integer("reminderMinutesBefore"),
    comment: text("comment"),
    legacyReservationId: text("reservationId"),
    legacyCreatedDate: timestamp("createdDate", { mode: "date", precision: 3 }),
    legacyFromDate: timestamp("fromDate", { mode: "date", precision: 3 }),
    legacyToDate: timestamp("toDate", { mode: "date", precision: 3 }),
    legacyCreatedByDiscordId: text("createdBy"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("Reservation_guildId_spotId_startsAt_endsAt_idx").on(
      table["guildId"],
      table["spotId"],
      table["startsAt"],
      table["endsAt"],
    ),
    index("Reservation_guildId_endsAt_idx").on(
      table["guildId"],
      table["endsAt"],
    ),
    index("Reservation_createdByUserId_endsAt_idx").on(
      table["createdByUserId"],
      table["endsAt"],
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "Reservation_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    check(
      "Reservation_valid_time_range_check",
      sql`${table["endsAt"]} > ${table["startsAt"]}`,
    ),
    check(
      "Reservation_reminder_minutes_check",
      sql`${table["reminderMinutesBefore"]} IS NULL OR ${table["reminderMinutesBefore"]} IN (0, 5, 15, 30)`,
    ),
  ],
);

export const reservationShareTable = pgTable(
  "ReservationShare",
  {
    id: text("id").notNull().primaryKey(),
    firstGuildId: text("firstGuildId").notNull(),
    secondGuildId: text("secondGuildId").notNull(),
    createdByUserId: text("createdByUserId").notNull(),
    acceptedByUserId: text("acceptedByUserId").notNull(),
    revokedAt: timestamp("revokedAt", { mode: "date", precision: 3 }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("ReservationShare_firstGuildId_secondGuildId_key").on(
      table["firstGuildId"],
      table["secondGuildId"],
    ),
    index("ReservationShare_firstGuildId_revokedAt_idx").on(
      table["firstGuildId"],
      table["revokedAt"],
    ),
    index("ReservationShare_secondGuildId_revokedAt_idx").on(
      table["secondGuildId"],
      table["revokedAt"],
    ),
    foreignKey({
      columns: [table["firstGuildId"]],
      foreignColumns: [guildTable["id"]],
      name: "ReservationShare_firstGuildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["secondGuildId"]],
      foreignColumns: [guildTable["id"]],
      name: "ReservationShare_secondGuildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    check(
      "ReservationShare_distinct_guilds_check",
      sql`${table["firstGuildId"]} < ${table["secondGuildId"]}`,
    ),
  ],
);

export const reservationShareInvitationTable = pgTable(
  "ReservationShareInvitation",
  {
    id: text("id").notNull().primaryKey(),
    sourceGuildId: text("sourceGuildId").notNull(),
    tokenHash: text("tokenHash").notNull(),
    createdByUserId: text("createdByUserId").notNull(),
    expiresAt: timestamp("expiresAt", { mode: "date", precision: 3 }).notNull(),
    acceptedAt: timestamp("acceptedAt", { mode: "date", precision: 3 }),
    acceptedByUserId: text("acceptedByUserId"),
    targetGuildId: text("targetGuildId"),
    revokedAt: timestamp("revokedAt", { mode: "date", precision: 3 }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("ReservationShareInvitation_tokenHash_key").on(
      table["tokenHash"],
    ),
    index("ReservationShareInvitation_sourceGuildId_createdAt_idx").on(
      table["sourceGuildId"],
      table["createdAt"],
    ),
    index("ReservationShareInvitation_targetGuildId_idx").on(
      table["targetGuildId"],
    ),
    index("ReservationShareInvitation_expiresAt_idx").on(table["expiresAt"]),
    foreignKey({
      columns: [table["sourceGuildId"]],
      foreignColumns: [guildTable["id"]],
      name: "ReservationShareInvitation_sourceGuildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["targetGuildId"]],
      foreignColumns: [guildTable["id"]],
      name: "ReservationShareInvitation_targetGuildId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const userPinnedReservationSpotTable = pgTable(
  "UserPinnedReservationSpot",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    guildId: text("guildId").notNull(),
    spotId: text("spotId").notNull(),
    pinnedAt: timestamp("pinnedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("UserPinnedReservationSpot_userId_guildId_spotId_key").on(
      table["userId"],
      table["guildId"],
      table["spotId"],
    ),
    index("UserPinnedReservationSpot_userId_guildId_pinnedAt_idx").on(
      table["userId"],
      table["guildId"],
      table["pinnedAt"].desc(),
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "UserPinnedReservationSpot_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const userCharactersLootlogSettingsTable = pgTable(
  "UserCharactersLootlogSettings",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    accountId: text("accountId").notNull(),
    characterId: text("characterId").notNull(),
    catchingGuildIds: text("catchingGuildIds")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex(
      "UserCharactersLootlogSettings_userId_accountId_characterId_key",
    ).on(table["userId"], table["accountId"], table["characterId"]),
  ],
);

export const userSettingsTable = pgTable(
  "UserSettings",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    guildsOrder: text("guildsOrder")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    hiddenGuildIds: text("hiddenGuildIds")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    theme: text("theme").default("default").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("UserSettings_userId_key").on(table["userId"]),
    index("UserSettings_userId_idx").on(table["userId"]),
  ],
);

export const userSettingDocumentTable = pgTable(
  "UserSettingDocument",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    domain: text("domain").notNull(),
    scopeType: settingsScopeTypeEnum("scopeType").notNull(),
    scopeId: text("scopeId").notNull(),
    overrides: jsonb("overrides")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    schemaVersion: integer("schemaVersion").default(1).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("UserSettingDocument_userId_domain_scopeType_scopeId_key").on(
      table["userId"],
      table["domain"],
      table["scopeType"],
      table["scopeId"],
    ),
    index("UserSettingDocument_userId_domain_idx").on(
      table["userId"],
      table["domain"],
    ),
    index("UserSettingDocument_userId_scopeType_scopeId_idx").on(
      table["userId"],
      table["scopeType"],
      table["scopeId"],
    ),
  ],
);

export const userGameAccountSettingsTable = pgTable(
  "UserGameAccountSettings",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    accountId: text("accountId").notNull(),
    settings: jsonb("settings")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("UserGameAccountSettings_userId_accountId_key").on(
      table["userId"],
      table["accountId"],
    ),
    index("UserGameAccountSettings_userId_idx").on(table["userId"]),
  ],
);

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
    metadata: jsonb("metadata"),
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
    filters: jsonb("filters"),
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
      .onDelete("set null")
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
    payloadSnapshot: jsonb("payloadSnapshot").notNull(),
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
    index("DiscordGuildChannelSnapshot_guildId_active_canSend_idx").on(
      table["guildId"],
      table["active"],
      table["canSend"],
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
  (table) => [
    index("MemberRefreshJob_guildId_idx").on(table["guildId"]),
    index("MemberRefreshJob_status_idx").on(table["status"]),
  ],
);

export const userTimerSettingsTable = pgTable(
  "UserTimerSettings",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    generalConfig: jsonb("generalConfig").notNull(),
    displayConfig: jsonb("displayConfig").notNull(),
    customColors: jsonb("customColors").notNull(),
    timersColors: jsonb("timersColors").notNull(),
    alwaysVisibleExpiredTimers: jsonb("alwaysVisibleExpiredTimers")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    defaultColorNames: jsonb("defaultColorNames").notNull(),
    overriddenDefaultColors: jsonb("overriddenDefaultColors").notNull(),
    hiddenDefaultColors: jsonb("hiddenDefaultColors").notNull(),
    timerFiltersEnabled: boolean("timerFiltersEnabled").default(true).notNull(),
    colorFiltersEnabled: boolean("colorFiltersEnabled")
      .default(false)
      .notNull(),
    timersSortOrder: text("timersSortOrder").default("asc").notNull(),
    syncEnabled: boolean("syncEnabled").default(true).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("UserTimerSettings_userId_key").on(table["userId"]),
    index("UserTimerSettings_userId_idx").on(table["userId"]),
  ],
);

export const userGuildTimerSettingsTable = pgTable(
  "UserGuildTimerSettings",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    guildId: text("guildId").notNull(),
    hiddenTimers: text("hiddenTimers")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    pinnedTimers: text("pinnedTimers")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("UserGuildTimerSettings_userId_guildId_key").on(
      table["userId"],
      table["guildId"],
    ),
    index("UserGuildTimerSettings_userId_idx").on(table["userId"]),
    index("UserGuildTimerSettings_guildId_idx").on(table["guildId"]),
  ],
);

export const userSoundSettingsTable = pgTable(
  "UserSoundSettings",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    masterVolume: doublePrecision("masterVolume").default(0.5).notNull(),
    notificationsVolume: doublePrecision("notificationsVolume")
      .default(0.5)
      .notNull(),
    detectorVolume: doublePrecision("detectorVolume").default(0.5).notNull(),
    timersVolume: doublePrecision("timersVolume").default(0.5).notNull(),
    pingsVolume: doublePrecision("pingsVolume").default(0).notNull(),
    notificationsConfig: jsonb("notificationsConfig")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    detectorConfig: jsonb("detectorConfig")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    timersConfig: jsonb("timersConfig")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("UserSoundSettings_userId_key").on(table["userId"]),
    index("UserSoundSettings_userId_idx").on(table["userId"]),
  ],
);

export const eventTable = pgTable(
  "Event",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    name: text("name").notNull(),
    world: text("world").notNull(),
    startsAt: timestamp("startsAt", { mode: "date", precision: 3 }),
    endsAt: timestamp("endsAt", { mode: "date", precision: 3 }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
    basePointsPerKill: integer("basePointsPerKill").default(1).notNull(),
    assignmentTimeoutMinutes: integer("assignmentTimeoutMinutes")
      .default(5)
      .notNull(),
    participationConfirmationMinutes: integer(
      "participationConfirmationMinutes",
    )
      .default(0)
      .notNull(),
    mapAssignmentCap: integer("mapAssignmentCap"),
    scoringMode: eventScoringModeEnum("scoringMode")
      .default("SIMPLE")
      .notNull(),
    scoringRules: jsonb("scoringRules"),
    rulebookMarkdown: text("rulebookMarkdown"),
  },
  (table) => [
    index("Event_guildId_startsAt_endsAt_idx").on(
      table["guildId"],
      table["startsAt"],
      table["endsAt"],
    ),
    index("Event_world_idx").on(table["world"]),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "Event_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const userPinnedEventTable = pgTable(
  "UserPinnedEvent",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    eventId: text("eventId").notNull(),
    pinnedAt: timestamp("pinnedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("UserPinnedEvent_userId_eventId_key").on(
      table["userId"],
      table["eventId"],
    ),
    index("UserPinnedEvent_userId_pinnedAt_idx").on(
      table["userId"],
      table["pinnedAt"].desc(),
    ),
    index("UserPinnedEvent_eventId_idx").on(table["eventId"]),
    foreignKey({
      columns: [table["eventId"]],
      foreignColumns: [eventTable["id"]],
      name: "UserPinnedEvent_eventId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const eventMapLocationTable = pgTable(
  "EventMapLocation",
  {
    id: text("id").notNull().primaryKey(),
    heroNpcId: text("heroNpcId").notNull(),
    name: text("name").notNull(),
    order: integer("order").default(0).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("EventMapLocation_heroNpcId_name_key").on(
      table["heroNpcId"],
      table["name"],
    ),
    index("EventMapLocation_heroNpcId_order_idx").on(
      table["heroNpcId"],
      table["order"],
    ),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventMapLocation_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const eventMapTable = pgTable(
  "EventMap",
  {
    id: text("id").notNull().primaryKey(),
    heroNpcId: text("heroNpcId").notNull(),
    locationId: text("locationId"),
    mapId: integer("mapId").notNull(),
    mapName: text("mapName").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("EventMap_heroNpcId_mapId_key").on(
      table["heroNpcId"],
      table["mapId"],
    ),
    index("EventMap_mapId_idx").on(table["mapId"]),
    index("EventMap_mapName_idx").on(table["mapName"]),
    index("EventMap_locationId_idx").on(table["locationId"]),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventMap_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["locationId"]],
      foreignColumns: [eventMapLocationTable["id"]],
      name: "EventMap_locationId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const eventMapCoverageGapTable = pgTable(
  "EventMapCoverageGap",
  {
    id: text("id").notNull().primaryKey(),
    mapId: text("mapId").notNull(),
    heroNpcId: text("heroNpcId").notNull(),
    gapType: coverageGapTypeEnum("gapType").notNull(),
    startedAt: timestamp("startedAt", { mode: "date", precision: 3 }).notNull(),
    endedAt: timestamp("endedAt", { mode: "date", precision: 3 }),
    durationSeconds: integer("durationSeconds"),
    hadAssignedMembers: boolean("hadAssignedMembers"),
  },
  (table) => [
    index("EventMapCoverageGap_mapId_gapType_endedAt_idx").on(
      table["mapId"],
      table["gapType"],
      table["endedAt"],
    ),
    index("EventMapCoverageGap_heroNpcId_endedAt_idx").on(
      table["heroNpcId"],
      table["endedAt"],
    ),
    index("EventMapCoverageGap_heroNpcId_startedAt_idx").on(
      table["heroNpcId"],
      table["startedAt"],
    ),
    index("EventMapCoverageGap_mapId_startedAt_idx").on(
      table["mapId"],
      table["startedAt"],
    ),
    foreignKey({
      columns: [table["mapId"]],
      foreignColumns: [eventMapTable["id"]],
      name: "EventMapCoverageGap_mapId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventMapCoverageGap_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const eventMapAssignmentHistoryTable = pgTable(
  "EventMapAssignmentHistory",
  {
    id: text("id").notNull().primaryKey(),
    mapId: text("mapId").notNull(),
    heroNpcId: text("heroNpcId").notNull(),
    memberId: integer("memberId").notNull(),
    assignedAt: timestamp("assignedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    unassignedAt: timestamp("unassignedAt", { mode: "date", precision: 3 }),
  },
  (table) => [
    index("EventMapAssignmentHistory_mapId_assignedAt_idx").on(
      table["mapId"],
      table["assignedAt"],
    ),
    index("EventMapAssignmentHistory_heroNpcId_assignedAt_idx").on(
      table["heroNpcId"],
      table["assignedAt"],
    ),
    index("EventMapAssignmentHistory_memberId_idx").on(table["memberId"]),
    foreignKey({
      columns: [table["mapId"]],
      foreignColumns: [eventMapTable["id"]],
      name: "EventMapAssignmentHistory_mapId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventMapAssignmentHistory_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "EventMapAssignmentHistory_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const eventHeroNpcTable = pgTable(
  "EventHeroNpc",
  {
    id: text("id").notNull().primaryKey(),
    eventId: text("eventId").notNull(),
    npcId: integer("npcId"),
    npcName: text("npcName").notNull(),
    npcIcon: text("npcIcon"),
    npcLvl: integer("npcLvl"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("EventHeroNpc_eventId_npcName_key").on(
      table["eventId"],
      table["npcName"],
    ),
    index("EventHeroNpc_npcId_idx").on(table["npcId"]),
    foreignKey({
      columns: [table["eventId"]],
      foreignColumns: [eventTable["id"]],
      name: "EventHeroNpc_eventId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const eventPresenceLogTable = pgTable(
  "EventPresenceLog",
  {
    id: text("id").notNull().primaryKey(),
    mapId: text("mapId").notNull(),
    memberId: integer("memberId").notNull(),
    isAfk: boolean("isAfk").notNull(),
    startedAt: timestamp("startedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("endedAt", { mode: "date", precision: 3 }),
  },
  (table) => [
    index("EventPresenceLog_mapId_memberId_idx").on(
      table["mapId"],
      table["memberId"],
    ),
    index("EventPresenceLog_mapId_endedAt_isAfk_memberId_idx").on(
      table["mapId"],
      table["endedAt"],
      table["isAfk"],
      table["memberId"],
    ),
    index("EventPresenceLog_startedAt_endedAt_idx").on(
      table["startedAt"],
      table["endedAt"],
    ),
    foreignKey({
      columns: [table["mapId"]],
      foreignColumns: [eventMapTable["id"]],
      name: "EventPresenceLog_mapId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "EventPresenceLog_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const eventHeroKillTable = pgTable(
  "EventHeroKill",
  {
    id: text("id").notNull().primaryKey(),
    heroNpcId: text("heroNpcId").notNull(),
    killedAt: timestamp("killedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    minSpawnTimeAtKill: timestamp("minSpawnTimeAtKill", {
      mode: "date",
      precision: 3,
    }).notNull(),
    maxSpawnTimeAtKill: timestamp("maxSpawnTimeAtKill", {
      mode: "date",
      precision: 3,
    }).notNull(),
    timerCreatedById: integer("timerCreatedById"),
    isManualClose: boolean("isManualClose").default(false).notNull(),
  },
  (table) => [
    index("EventHeroKill_heroNpcId_idx").on(table["heroNpcId"]),
    index("EventHeroKill_heroNpcId_killedAt_idx").on(
      table["heroNpcId"],
      table["killedAt"],
    ),
    index("EventHeroKill_killedAt_idx").on(table["killedAt"]),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventHeroKill_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["timerCreatedById"]],
      foreignColumns: [memberTable["id"]],
      name: "EventHeroKill_timerCreatedById_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const eventKillPointTable = pgTable(
  "EventKillPoint",
  {
    id: text("id").notNull().primaryKey(),
    killId: text("killId").notNull(),
    memberId: integer("memberId").notNull(),
    basePoints: doublePrecision("basePoints").notNull(),
    points: doublePrecision("points").notNull(),
    manualAdjustmentPoints: doublePrecision("manualAdjustmentPoints")
      .default(0)
      .notNull(),
    trackingDurationSeconds: integer("trackingDurationSeconds"),
    trackingDurationPercentage: doublePrecision("trackingDurationPercentage"),
    confirmationDeadlineAt: timestamp("confirmationDeadlineAt", {
      mode: "date",
      precision: 3,
    }),
    confirmedAt: timestamp("confirmedAt", { mode: "date", precision: 3 }),
    confirmationExpiredAcknowledgedAt: timestamp(
      "confirmationExpiredAcknowledgedAt",
      { mode: "date", precision: 3 },
    ),
    timeOnMapSeconds: integer("timeOnMapSeconds").notNull(),
    afkPercentage: doublePrecision("afkPercentage").notNull(),
    wasPresent: boolean("wasPresent").notNull(),
    bonusBreakdown: jsonb("bonusBreakdown"),
    mapPresenceData: jsonb("mapPresenceData"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("EventKillPoint_killId_memberId_key").on(
      table["killId"],
      table["memberId"],
    ),
    index("EventKillPoint_memberId_idx").on(table["memberId"]),
    index("EventKillPoint_memberId_confirmationDeadlineAt_confirmedAt_idx").on(
      table["memberId"],
      table["confirmationDeadlineAt"],
      table["confirmedAt"],
    ),
    foreignKey({
      columns: [table["killId"]],
      foreignColumns: [eventHeroKillTable["id"]],
      name: "EventKillPoint_killId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "EventKillPoint_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const eventRankingTable = pgTable(
  "EventRanking",
  {
    id: text("id").notNull().primaryKey(),
    eventId: text("eventId").notNull(),
    memberId: integer("memberId").notNull(),
    heroNpcName: text("heroNpcName").notNull(),
    totalPoints: doublePrecision("totalPoints").default(0).notNull(),
    manualAdjustmentPoints: doublePrecision("manualAdjustmentPoints")
      .default(0)
      .notNull(),
    totalKills: integer("totalKills").default(0).notNull(),
    totalTimeSeconds: integer("totalTimeSeconds").default(0).notNull(),
    avgAfkPercentage: doublePrecision("avgAfkPercentage").default(0).notNull(),
    pointsModified: boolean("pointsModified").default(false).notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("EventRanking_eventId_memberId_heroNpcName_key").on(
      table["eventId"],
      table["memberId"],
      table["heroNpcName"],
    ),
    index("EventRanking_eventId_totalPoints_idx").on(
      table["eventId"],
      table["totalPoints"].desc(),
    ),
    foreignKey({
      columns: [table["eventId"]],
      foreignColumns: [eventTable["id"]],
      name: "EventRanking_eventId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "EventRanking_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const eventPointsEditHistoryTable = pgTable(
  "EventPointsEditHistory",
  {
    id: text("id").notNull().primaryKey(),
    rankingId: text("rankingId").notNull(),
    previousPoints: doublePrecision("previousPoints").notNull(),
    newPoints: doublePrecision("newPoints").notNull(),
    editType: pointsEditTypeEnum("editType").notNull(),
    editedByUserId: text("editedByUserId").notNull(),
    comment: text("comment"),
    editedAt: timestamp("editedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("EventPointsEditHistory_rankingId_editedAt_idx").on(
      table["rankingId"],
      table["editedAt"].desc(),
    ),
    foreignKey({
      columns: [table["rankingId"]],
      foreignColumns: [eventRankingTable["id"]],
      name: "EventPointsEditHistory_rankingId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const eventRespawnWindowSummaryTable = pgTable(
  "EventRespawnWindowSummary",
  {
    id: text("id").notNull().primaryKey(),
    heroNpcId: text("heroNpcId").notNull(),
    killId: text("killId"),
    windowOpenedAt: timestamp("windowOpenedAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
    windowClosedAt: timestamp("windowClosedAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
    minSpawnTime: timestamp("minSpawnTime", {
      mode: "date",
      precision: 3,
    }).notNull(),
    maxSpawnTime: timestamp("maxSpawnTime", {
      mode: "date",
      precision: 3,
    }).notNull(),
    wasManualClose: boolean("wasManualClose").default(false).notNull(),
    totalWindowSeconds: integer("totalWindowSeconds").notNull(),
    totalCoverageSeconds: integer("totalCoverageSeconds").notNull(),
    totalUncoveredSeconds: integer("totalUncoveredSeconds").notNull(),
    totalUnassignedSeconds: integer("totalUnassignedSeconds").notNull(),
    coveragePercentage: doublePrecision("coveragePercentage").notNull(),
    memberStats: jsonb("memberStats").notNull(),
    mapStats: jsonb("mapStats").notNull(),
    gapsTimeline: jsonb("gapsTimeline").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("EventRespawnWindowSummary_killId_key").on(table["killId"]),
    index("EventRespawnWindowSummary_heroNpcId_idx").on(table["heroNpcId"]),
    index("EventRespawnWindowSummary_windowClosedAt_idx").on(
      table["windowClosedAt"],
    ),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventRespawnWindowSummary_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["killId"]],
      foreignColumns: [eventHeroKillTable["id"]],
      name: "EventRespawnWindowSummary_killId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const mapTemplateTable = pgTable(
  "MapTemplate",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    name: text("name").notNull(),
    maps: jsonb("maps").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("MapTemplate_guildId_name_key").on(
      table["guildId"],
      table["name"],
    ),
    index("MapTemplate_guildId_idx").on(table["guildId"]),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "MapTemplate_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const guildDocumentTable = pgTable(
  "GuildDocument",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    title: text("title").notNull(),
    content: jsonb("content").notNull(),
    version: integer("version").default(1).notNull(),
    createdByMemberId: text("createdByMemberId").notNull(),
    updatedByMemberId: text("updatedByMemberId").notNull(),
    deletedAt: timestamp("deletedAt", { mode: "date", precision: 3 }),
    deletedByMemberId: text("deletedByMemberId"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("GuildDocument_guildId_deletedAt_updatedAt_idx").on(
      table["guildId"],
      table["deletedAt"],
      table["updatedAt"].desc(),
    ),
    index("GuildDocument_guildId_deletedAt_idx").on(
      table["guildId"],
      table["deletedAt"].desc(),
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "GuildDocument_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const guildDocumentHistoryTable = pgTable(
  "GuildDocumentHistory",
  {
    id: text("id").notNull().primaryKey(),
    documentId: text("documentId").notNull(),
    guildId: text("guildId").notNull(),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    content: jsonb("content").notNull(),
    action: guildDocumentHistoryActionEnum("action").default("SAVE").notNull(),
    actorMemberId: text("actorMemberId").notNull(),
    editedAt: timestamp("editedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("GuildDocumentHistory_documentId_version_idx").on(
      table["documentId"],
      table["version"],
    ),
    index("GuildDocumentHistory_documentId_editedAt_idx").on(
      table["documentId"],
      table["editedAt"].desc(),
    ),
    index("GuildDocumentHistory_guildId_editedAt_idx").on(
      table["guildId"],
      table["editedAt"].desc(),
    ),
    foreignKey({
      columns: [table["documentId"]],
      foreignColumns: [guildDocumentTable["id"]],
      name: "GuildDocumentHistory_documentId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "GuildDocumentHistory_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const npcKillStatsTable = pgTable(
  "NpcKillStats",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    memberId: integer("memberId").notNull(),
    userId: text("userId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    memberKills: integer("memberKills").default(0).notNull(),
    lastKilledAt: timestamp("lastKilledAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("NpcKillStats_guildId_memberId_world_npcId_key").on(
      table["guildId"],
      table["memberId"],
      table["world"],
      table["npcId"],
    ),
    index("NpcKillStats_guildId_idx").on(table["guildId"]),
    index("NpcKillStats_guildId_npcType_idx").on(
      table["guildId"],
      table["npcType"],
    ),
    index("NpcKillStats_guildId_world_npcType_idx").on(
      table["guildId"],
      table["world"],
      table["npcType"],
    ),
    index("NpcKillStats_memberId_idx").on(table["memberId"]),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "NpcKillStats_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "NpcKillStats_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const userKillStatsTable = pgTable(
  "UserKillStats",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    totalKills: integer("totalKills").default(0).notNull(),
    lastKilledAt: timestamp("lastKilledAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("UserKillStats_userId_world_npcId_key").on(
      table["userId"],
      table["world"],
      table["npcId"],
    ),
    index("UserKillStats_userId_idx").on(table["userId"]),
    index("UserKillStats_userId_npcType_idx").on(
      table["userId"],
      table["npcType"],
    ),
    index("UserKillStats_userId_world_npcType_idx").on(
      table["userId"],
      table["world"],
      table["npcType"],
    ),
  ],
);

export const guildKillSummaryTable = pgTable(
  "GuildKillSummary",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    uniqueKills: integer("uniqueKills").default(0).notNull(),
    lastKilledAt: timestamp("lastKilledAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("GuildKillSummary_guildId_world_npcId_key").on(
      table["guildId"],
      table["world"],
      table["npcId"],
    ),
    index("GuildKillSummary_guildId_idx").on(table["guildId"]),
    index("GuildKillSummary_guildId_npcType_idx").on(
      table["guildId"],
      table["npcType"],
    ),
    index("GuildKillSummary_guildId_world_npcType_idx").on(
      table["guildId"],
      table["world"],
      table["npcType"],
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "GuildKillSummary_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const userKillStatsBucketTable = pgTable(
  "UserKillStatsBucket",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    totalKills: integer("totalKills").default(0).notNull(),
    periodStart: timestamp("periodStart", {
      mode: "date",
      precision: 3,
    }).notNull(),
    lastKilledAt: timestamp("lastKilledAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("UserKillStatsBucket_userId_world_npcId_periodStart_key").on(
      table["userId"],
      table["world"],
      table["npcId"],
      table["periodStart"],
    ),
    index("UserKillStatsBucket_userId_periodStart_idx").on(
      table["userId"],
      table["periodStart"],
    ),
    index("UserKillStatsBucket_userId_npcType_periodStart_idx").on(
      table["userId"],
      table["npcType"],
      table["periodStart"],
    ),
    index("UserKillStatsBucket_userId_world_npcType_periodStart_idx").on(
      table["userId"],
      table["world"],
      table["npcType"],
      table["periodStart"],
    ),
  ],
);

export const npcKillStatsBucketTable = pgTable(
  "NpcKillStatsBucket",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    memberId: integer("memberId").notNull(),
    userId: text("userId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    memberKills: integer("memberKills").default(0).notNull(),
    periodStart: timestamp("periodStart", {
      mode: "date",
      precision: 3,
    }).notNull(),
    lastKilledAt: timestamp("lastKilledAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex(
      "NpcKillStatsBucket_guildId_memberId_world_npcId_periodStart_key",
    ).on(
      table["guildId"],
      table["memberId"],
      table["world"],
      table["npcId"],
      table["periodStart"],
    ),
    index("NpcKillStatsBucket_guildId_periodStart_idx").on(
      table["guildId"],
      table["periodStart"],
    ),
    index("NpcKillStatsBucket_guildId_npcType_periodStart_idx").on(
      table["guildId"],
      table["npcType"],
      table["periodStart"],
    ),
    index("NpcKillStatsBucket_guildId_world_npcType_periodStart_idx").on(
      table["guildId"],
      table["world"],
      table["npcType"],
      table["periodStart"],
    ),
    index("NpcKillStatsBucket_memberId_periodStart_idx").on(
      table["memberId"],
      table["periodStart"],
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "NpcKillStatsBucket_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "NpcKillStatsBucket_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const guildKillSummaryBucketTable = pgTable(
  "GuildKillSummaryBucket",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    uniqueKills: integer("uniqueKills").default(0).notNull(),
    periodStart: timestamp("periodStart", {
      mode: "date",
      precision: 3,
    }).notNull(),
    lastKilledAt: timestamp("lastKilledAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex(
      "GuildKillSummaryBucket_guildId_world_npcId_periodStart_key",
    ).on(
      table["guildId"],
      table["world"],
      table["npcId"],
      table["periodStart"],
    ),
    index("GuildKillSummaryBucket_guildId_periodStart_idx").on(
      table["guildId"],
      table["periodStart"],
    ),
    index("GuildKillSummaryBucket_guildId_npcType_periodStart_idx").on(
      table["guildId"],
      table["npcType"],
      table["periodStart"],
    ),
    index("GuildKillSummaryBucket_guildId_world_npcType_periodStart_idx").on(
      table["guildId"],
      table["world"],
      table["npcType"],
      table["periodStart"],
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "GuildKillSummaryBucket_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
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
export const eventMapToMemberTable = pgTable(
  "_EventMapToMember",
  { A: text("A").notNull(), B: integer("B").notNull() },
  (table) => [
    primaryKey({
      columns: [table.A, table.B],
      name: "_EventMapToMember_AB_pkey",
    }),
    index("_EventMapToMember_B_index").on(table.B),
    foreignKey({
      columns: [table.A],
      foreignColumns: [eventMapTable.id],
      name: "_EventMapToMember_A_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.B],
      foreignColumns: [memberTable.id],
      name: "_EventMapToMember_B_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);
