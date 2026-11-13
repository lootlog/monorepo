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
} from "drizzle-orm/pg-core";
import { guildTable, memberTable } from "./organization.schema.js";
import { playerSnapshotTable } from "./loot.schema.js";

export const timerHistoryActionEnum = pgEnum("TimerHistoryAction", [
  "CREATE",
  "RESET",
  "DELETE",
  "RESTORE",
]);

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
    entranceClosesAt: timestamp("entranceClosesAt", {
      mode: "date",
      precision: 3,
    }),
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
