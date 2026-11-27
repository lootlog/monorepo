import type { JsonValue } from "#src/database/json";
import {
  BINGO_DEFAULT_BOARD_SIZE,
  BINGO_MAX_BOARD_SIZE,
  BINGO_MIN_BOARD_SIZE,
  type BingoMilestoneNotificationEvent,
  type BingoTileCondition,
} from "@lootlog/schema/bingo";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { guildTable, memberTable, npcTypeEnum } from "./organization.schema.js";

export const bingoBoardModeEnum = pgEnum("BingoBoardMode", ["RACE", "LOCKOUT"]);

export const bingoBoardStatusEnum = pgEnum("BingoBoardStatus", [
  "DRAFT",
  "ACTIVE",
  "FINISHED",
]);

export const bingoTileConditionKindEnum = pgEnum("BingoTileConditionKind", [
  "LOOT",
  "KILL",
  "HERO_SIGHTING",
  "BATTLE",
  "MANUAL",
]);

export const bingoBoardTable = pgTable(
  "BingoBoard",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    world: text("world"),
    mode: bingoBoardModeEnum("mode").default("RACE").notNull(),
    status: bingoBoardStatusEnum("status").default("DRAFT").notNull(),
    size: smallint("size").default(BINGO_DEFAULT_BOARD_SIZE).notNull(),
    pointsPerTile: integer("pointsPerTile").default(1).notNull(),
    pointsPerLine: integer("pointsPerLine").default(5).notNull(),
    firstCompleterBonus: integer("firstCompleterBonus").default(0).notNull(),
    blackoutBonus: integer("blackoutBonus").default(10).notNull(),
    startsAt: timestamp("startsAt", { mode: "date", precision: 3 }),
    endsAt: timestamp("endsAt", { mode: "date", precision: 3 }),
    createdByMemberId: integer("createdByMemberId"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("BingoBoard_guildId_status_updatedAt_idx").on(
      table.guildId,
      table.status,
      table.updatedAt.desc(),
    ),
    index("BingoBoard_status_world_idx").on(table.status, table.world),
    check(
      "BingoBoard_size_check",
      sql`${table.size} BETWEEN ${sql.raw(String(BINGO_MIN_BOARD_SIZE))} AND ${sql.raw(String(BINGO_MAX_BOARD_SIZE))}`,
    ),
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "BingoBoard_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdByMemberId],
      foreignColumns: [memberTable.id],
      name: "BingoBoard_createdByMemberId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const bingoTileTable = pgTable(
  "BingoTile",
  {
    id: text("id").notNull().primaryKey(),
    boardId: text("boardId").notNull(),
    row: smallint("row").notNull(),
    col: smallint("col").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    points: integer("points"),
    conditionKind: bingoTileConditionKindEnum("conditionKind").notNull(),
    condition: jsonb("condition").$type<BingoTileCondition>().notNull(),
    lockedByMemberId: integer("lockedByMemberId"),
    lockedAt: timestamp("lockedAt", { mode: "date", precision: 3 }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("BingoTile_boardId_row_col_key").on(
      table.boardId,
      table.row,
      table.col,
    ),
    index("BingoTile_boardId_conditionKind_idx").on(
      table.boardId,
      table.conditionKind,
    ),
    check(
      "BingoTile_row_col_bounds_check",
      sql`${table.row} >= 0 AND ${table.row} < ${sql.raw(String(BINGO_MAX_BOARD_SIZE))} AND ${table.col} >= 0 AND ${table.col} < ${sql.raw(String(BINGO_MAX_BOARD_SIZE))}`,
    ),
    foreignKey({
      columns: [table.boardId],
      foreignColumns: [bingoBoardTable.id],
      name: "BingoTile_boardId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.lockedByMemberId],
      foreignColumns: [memberTable.id],
      name: "BingoTile_lockedByMemberId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const bingoTileProgressTable = pgTable(
  "BingoTileProgress",
  {
    id: serial("id").notNull().primaryKey(),
    boardId: text("boardId").notNull(),
    tileId: text("tileId").notNull(),
    memberId: integer("memberId").notNull(),
    currentCount: integer("currentCount").default(0).notNull(),
    targetCount: integer("targetCount").notNull(),
    completedAt: timestamp("completedAt", { mode: "date", precision: 3 }),
    manualOverride: boolean("manualOverride").default(false).notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("BingoTileProgress_tileId_memberId_key").on(
      table.tileId,
      table.memberId,
    ),
    index("BingoTileProgress_boardId_memberId_idx").on(
      table.boardId,
      table.memberId,
    ),
    foreignKey({
      columns: [table.boardId],
      foreignColumns: [bingoBoardTable.id],
      name: "BingoTileProgress_boardId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tileId],
      foreignColumns: [bingoTileTable.id],
      name: "BingoTileProgress_tileId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [memberTable.id],
      name: "BingoTileProgress_memberId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const bingoProgressEventTable = pgTable(
  "BingoProgressEvent",
  {
    id: text("id").notNull().primaryKey(),
    boardId: text("boardId").notNull(),
    tileId: text("tileId").notNull(),
    memberId: integer("memberId").notNull(),
    sourceKind: bingoTileConditionKindEnum("sourceKind").notNull(),
    dedupKey: text("dedupKey").notNull(),
    delta: integer("delta").notNull(),
    previousCount: integer("previousCount").notNull(),
    newCount: integer("newCount").notNull(),
    completedTile: boolean("completedTile").default(false).notNull(),
    completedLineCount: integer("completedLineCount").default(0).notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<JsonValue>(),
    occurredAt: timestamp("occurredAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("BingoProgressEvent_tileId_memberId_dedupKey_key").on(
      table.tileId,
      table.memberId,
      table.dedupKey,
    ),
    index("BingoProgressEvent_boardId_createdAt_idx").on(
      table.boardId,
      table.createdAt.desc(),
    ),
    foreignKey({
      columns: [table.boardId],
      foreignColumns: [bingoBoardTable.id],
      name: "BingoProgressEvent_boardId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tileId],
      foreignColumns: [bingoTileTable.id],
      name: "BingoProgressEvent_tileId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [memberTable.id],
      name: "BingoProgressEvent_memberId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const bingoMilestoneOutboxTable = pgTable(
  "BingoMilestoneOutbox",
  {
    id: serial("id").primaryKey(),
    guildId: text("guildId").notNull(),
    event: jsonb("event").$type<BingoMilestoneNotificationEvent>().notNull(),
    lastAttemptAt: timestamp("lastAttemptAt", { precision: 3 }),
    createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "BingoMilestoneOutbox_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    index("BingoMilestoneOutbox_lastAttemptAt_id_idx").on(
      table.lastAttemptAt.asc().nullsFirst(),
      table.id.asc(),
    ),
  ],
);

export const bingoKillOutboxTable = pgTable(
  "BingoKillOutbox",
  {
    id: serial("id").primaryKey(),
    guildId: text("guildId").notNull(),
    memberId: integer("memberId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    killedAt: timestamp("killedAt", { mode: "date", precision: 3 }).notNull(),
    lastAttemptAt: timestamp("lastAttemptAt", { precision: 3 }),
    createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "BingoKillOutbox_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [memberTable.id],
      name: "BingoKillOutbox_memberId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    index("BingoKillOutbox_lastAttemptAt_id_idx").on(
      table.lastAttemptAt.asc().nullsFirst(),
      table.id.asc(),
    ),
  ],
);
