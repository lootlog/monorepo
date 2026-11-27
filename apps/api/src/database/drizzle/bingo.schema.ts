import type { JsonValue } from "#src/database/json";
import type { BingoTileCondition } from "@lootlog/schema/bingo";
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
import { guildTable, memberTable } from "./organization.schema.js";

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
      sql`${table.row} >= 0 AND ${table.row} < 5 AND ${table.col} >= 0 AND ${table.col} < 5`,
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
