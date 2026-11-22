import { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import type { ProfessionEnum } from "@lootlog/schema/loot";
import { sql } from "drizzle-orm";
import {
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { guildTable, memberTable, npcTypeEnum } from "./organization.schema.js";

const int4multirange = customType<{ data: string }>({
  dataType: () => "int4multirange",
  codec: "int4multirange",
});

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

export const gameVersionEnum = pgEnum("GameVersion", ["pl", "en"]);

export const lootShareSourceEnum = pgEnum("LootShareSource", [
  "NONE",
  "ITEM_OWNER",
  "CHAT_MESSAGE",
]);

export const lootTable = pgTable(
  "Loot",
  {
    id: serial("id").notNull().primaryKey(),
    uniqueId: text("uniqueId").notNull(),
    world: text("world").notNull(),
    gameVersion: gameVersionEnum("gameVersion").notNull(),
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
    check(
      "Loot_lootShare_object_check",
      sql`jsonb_typeof(${table["lootShare"]}) = 'object'`,
    ),
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
    gameVersion: gameVersionEnum("gameVersion").notNull(),
    statsHash: text("statsHash").notNull(),
    snapshotHash: text("snapshotHash"),
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
    uniqueIndex("ItemSnapshot_itemId_snapshotHash_key").on(
      table["itemId"],
      table["snapshotHash"],
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
    instanceStat: text("instanceStat"),
  },
  (table) => [
    index("LootItem_lootId_itemSnapshotId_idx").on(
      table["lootId"],
      table["itemSnapshotId"],
    ),
    index("LootItem_hid_idx").using("hash", table["hid"]),
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
    index("PlayerSnapshot_name_trgm_idx").using(
      "gin",
      sql`${table["name"]} gin_trgm_ops`,
    ),
  ],
);

export const lootPlayerTable = pgTable(
  "LootPlayer",
  {
    id: serial("id").notNull(),
    lootId: integer("lootId").notNull(),
    playerSnapshotId: integer("playerSnapshotId").notNull(),
    lvl: integer("lvl"),
    hpp: integer("hpp"),
  },
  (table) => [
    primaryKey({
      columns: [table["lootId"], table["id"]],
      name: "LootPlayer_pkey",
    }),
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
    identityNamespace: text("identityNamespace")
      .$type<NpcIdentityNamespace>()
      .default(NpcIdentityNamespace.LEGACY)
      .notNull(),
    gameVersion: gameVersionEnum("gameVersion").notNull(),
    snapshotHash: text("snapshotHash"),
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
    uniqueIndex("NpcSnapshot_npcId_snapshotHash_key").on(
      table.npcId,
      table.snapshotHash,
    ),
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
    runtimeNpcId: integer("runtimeNpcId"),
  },
  (table) => [
    index("LootNpc_lootId_idx").on(table["lootId"]),
    index("LootNpc_npcSnapshotId_lootId_idx").on(
      table["npcSnapshotId"],
      table["lootId"],
    ),
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
    lootWorld: text("lootWorld").notNull(),
    lootCreatedAt: timestamp("lootCreatedAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
    lootRarityMask: smallint("lootRarityMask").notNull(),
    npcTypeMask: smallint("npcTypeMask").notNull(),
    npcVisibility: int4multirange("npcVisibility").notNull(),
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
    index("OrganizationLootRecord_guildId_world_lootId_page_active_idx")
      .on(
        table["guildId"],
        table["lootWorld"],
        table["lootId"].desc().nullsFirst(),
        table["lootRarityMask"],
        table["npcTypeMask"],
        table["npcVisibility"],
      )
      .where(sql`${table["archivedAt"]} IS NULL`),
    index("OrganizationLootRecord_createdAt_brin_idx")
      .using("brin", table["createdAt"])
      .with({ pages_per_range: 16, autosummarize: "on" }),
    index("OrganizationLootRecord_archivedByMemberId_notnull_idx")
      .on(table["archivedByMemberId"])
      .where(sql`${table["archivedByMemberId"]} IS NOT NULL`),
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

export const lootMapPlayerTable = pgTable(
  "LootMapPlayer",
  {
    organizationLootRecordId: integer("organizationLootRecordId").notNull(),
    playerSnapshotId: integer("playerSnapshotId").notNull(),
    lvl: integer("lvl"),
  },
  (table) => [
    primaryKey({
      columns: [table.organizationLootRecordId, table.playerSnapshotId],
      name: "LootMapPlayer_pkey",
    }),
    index("LootMapPlayer_playerSnapshotId_idx").on(table.playerSnapshotId),
    foreignKey({
      columns: [table.organizationLootRecordId],
      foreignColumns: [organizationLootRecordTable.id],
      name: "LootMapPlayer_organizationLootRecordId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.playerSnapshotId],
      foreignColumns: [playerSnapshotTable.id],
      name: "LootMapPlayer_playerSnapshotId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const lootSubmissionTable = pgTable(
  "LootSubmission",
  {
    organizationLootRecordId: integer("organizationLootRecordId").notNull(),
    memberId: integer("memberId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table["organizationLootRecordId"], table["memberId"]],
      name: "LootSubmission_pkey",
    }),
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

export const lootLikeTable = pgTable(
  "LootLike",
  {
    organizationLootRecordId: integer("organizationLootRecordId").notNull(),
    memberId: integer("memberId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table["organizationLootRecordId"], table["memberId"]],
      name: "LootLike_pkey",
    }),
    index("LootLike_memberId_idx").on(table["memberId"]),
    foreignKey({
      columns: [table["organizationLootRecordId"]],
      foreignColumns: [organizationLootRecordTable["id"]],
      name: "LootLike_organizationLootRecordId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "LootLike_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export type LootDrawEntrantRecord = {
  name: string;
  accountId: number | null;
  characterId: number | null;
  prof: ProfessionEnum | null;
  lvl: number | null;
  icon: string | null;
  source: "WINNER" | "PARTY" | "MAP" | "MANUAL";
  tickets: number;
};

export const lootDrawTable = pgTable(
  "LootDraw",
  {
    id: serial("id").notNull().primaryKey(),
    organizationLootRecordId: integer("organizationLootRecordId").notNull(),
    itemHid: text("itemHid").notNull(),
    entrants: jsonb("entrants").$type<LootDrawEntrantRecord[]>().notNull(),
    ticketOrder: jsonb("ticketOrder").$type<number[]>().notNull(),
    roll: integer("roll").notNull(),
    winnerIndex: integer("winnerIndex").notNull(),
    createdByMemberId: integer("createdByMemberId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    voidedAt: timestamp("voidedAt", { mode: "date", precision: 3 }),
    voidedByMemberId: integer("voidedByMemberId"),
    voidReason: text("voidReason"),
  },
  (table) => [
    index("LootDraw_organizationLootRecordId_createdAt_idx").on(
      table["organizationLootRecordId"],
      table["createdAt"],
    ),
    uniqueIndex("LootDraw_organizationLootRecordId_itemHid_active_key")
      .on(table["organizationLootRecordId"], table["itemHid"])
      .where(sql`${table["voidedAt"]} IS NULL`),
    check(
      "LootDraw_void_complete",
      sql`(${table["voidedAt"]} IS NULL) = (${table["voidedByMemberId"]} IS NULL) AND (${table["voidedAt"]} IS NULL) = (${table["voidReason"]} IS NULL)`,
    ),
    foreignKey({
      columns: [table["organizationLootRecordId"]],
      foreignColumns: [organizationLootRecordTable["id"]],
      name: "LootDraw_organizationLootRecordId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["createdByMemberId"]],
      foreignColumns: [memberTable["id"]],
      name: "LootDraw_createdByMemberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["voidedByMemberId"]],
      foreignColumns: [memberTable["id"]],
      name: "LootDraw_voidedByMemberId_fkey",
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
    index("LootlogConfigNpc_lootlogConfigId_idx").on(table["lootlogConfigId"]),
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
