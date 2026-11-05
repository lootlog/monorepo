import { sql } from "drizzle-orm";
import {
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
import { professionEnum, playerSnapshotTable } from "./loot.schema.js";
import { guildTable, memberTable } from "./organization.schema.js";

export const heroSightingStateEnum = pgEnum("HeroSightingState", [
  "ROAMING",
  "SPAWNING",
]);

export const heroSightingCloseReasonEnum = pgEnum("HeroSightingCloseReason", [
  "KILLED",
  "PROBABLY_KILLED",
]);

/**
 * Where a hero detector placed a hero, per Organization. One open row per hero
 * is the current sighting; closed rows are its history, pruned to the newest
 * HERO_SIGHTING_HISTORY_LIMIT per hero. Times are Margonem's answer times.
 */
export const heroSightingTable = pgTable(
  "HeroSighting",
  {
    id: serial("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    world: text("world").notNull(),
    heroKey: text("heroKey").notNull(),
    heroName: text("heroName").notNull(),
    heroLvl: integer("heroLvl").notNull(),
    heroProf: professionEnum("heroProf"),
    state: heroSightingStateEnum("state").notNull(),
    mapName: text("mapName").notNull(),
    firstSeenAt: timestamp("firstSeenAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
    lastSeenAt: timestamp("lastSeenAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
    /** When a detected spawn was first seen roaming on its map. */
    spawnedAt: timestamp("spawnedAt", { mode: "date", precision: 3 }),
    detectedById: integer("detectedById").notNull(),
    detectorCharacterSnapshotId: integer("detectorCharacterSnapshotId"),
    detectorCharacterLvl: integer("detectorCharacterLvl"),
    lastSeenById: integer("lastSeenById").notNull(),
    closedAt: timestamp("closedAt", { mode: "date", precision: 3 }),
    closeReason: heroSightingCloseReasonEnum("closeReason"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("HeroSighting_open_guildId_world_heroKey_key")
      .on(table.guildId, table.world, table.heroKey)
      .where(sql`${table.closedAt} IS NULL`),
    index("HeroSighting_guildId_world_heroKey_id_idx").on(
      table.guildId,
      table.world,
      table.heroKey,
      table.id,
    ),
    index("HeroSighting_guildId_world_lastSeenAt_idx").on(
      table.guildId,
      table.world,
      table.lastSeenAt,
    ),
    index("HeroSighting_detectedById_idx").on(table.detectedById),
    index("HeroSighting_lastSeenById_idx").on(table.lastSeenById),
    index("HeroSighting_detectorCharacterSnapshotId_idx").on(
      table.detectorCharacterSnapshotId,
    ),
    check(
      "HeroSighting_closed_check",
      sql`(${table.closedAt} IS NULL) = (${table.closeReason} IS NULL)`,
    ),
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "HeroSighting_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.detectedById],
      foreignColumns: [memberTable.id],
      name: "HeroSighting_detectedById_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.lastSeenById],
      foreignColumns: [memberTable.id],
      name: "HeroSighting_lastSeenById_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.detectorCharacterSnapshotId],
      foreignColumns: [playerSnapshotTable.id],
      name: "HeroSighting_detectorCharacterSnapshotId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

/** A Member's explicit declaration that they camp a sighted hero. */
export const heroSightingClaimTable = pgTable(
  "HeroSightingClaim",
  {
    sightingId: integer("sightingId").notNull(),
    memberId: integer("memberId").notNull(),
    characterSnapshotId: integer("characterSnapshotId"),
    characterLvl: integer("characterLvl"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.sightingId, table.memberId],
      name: "HeroSightingClaim_pkey",
    }),
    index("HeroSightingClaim_memberId_idx").on(table.memberId),
    index("HeroSightingClaim_characterSnapshotId_idx").on(
      table.characterSnapshotId,
    ),
    foreignKey({
      columns: [table.sightingId],
      foreignColumns: [heroSightingTable.id],
      name: "HeroSightingClaim_sightingId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [memberTable.id],
      name: "HeroSightingClaim_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.characterSnapshotId],
      foreignColumns: [playerSnapshotTable.id],
      name: "HeroSightingClaim_characterSnapshotId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);
