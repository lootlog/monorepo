import {
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { npcTypeEnum } from "./loot.schema.js";
import { guildTable, memberTable } from "./organization.schema.js";

const killTime = (name: string) =>
  timestamp(name, { mode: "date", precision: 3, withTimezone: true });

/**
 * Hourly personal kills. A TimescaleDB hypertable on `periodStart` where the
 * extension is loaded (see drizzle/README.md); a plain table elsewhere.
 */
export const userKillBucketTable = pgTable(
  "UserKillBucket",
  {
    periodStart: killTime("periodStart").notNull(),
    discordUserId: text("discordUserId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    kills: integer("kills").notNull(),
    lastKilledAt: killTime("lastKilledAt").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.discordUserId,
        table.world,
        table.npcId,
        table.periodStart,
      ],
      name: "UserKillBucket_pkey",
    }),
    index("UserKillBucket_discordUserId_periodStart_idx").on(
      table.discordUserId,
      table.periodStart.desc(),
    ),
  ],
);

/**
 * Hourly personal kills per Margonem character, recorded alongside
 * `UserKillBucket` since per-character tracking began. Older kills have no
 * character and stay only in the account-wide tables. A TimescaleDB hypertable
 * on `periodStart` where the extension is loaded.
 */
export const userCharacterKillBucketTable = pgTable(
  "UserCharacterKillBucket",
  {
    periodStart: killTime("periodStart").notNull(),
    discordUserId: text("discordUserId").notNull(),
    world: text("world").notNull(),
    characterId: text("characterId").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    kills: integer("kills").notNull(),
    lastKilledAt: killTime("lastKilledAt").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.discordUserId,
        table.world,
        table.characterId,
        table.npcId,
        table.periodStart,
      ],
      name: "UserCharacterKillBucket_pkey",
    }),
    index("UserCharacterKillBucket_character_periodStart_idx").on(
      table.discordUserId,
      table.characterId,
      table.periodStart.desc(),
    ),
  ],
);

/**
 * A User's characters with recorded kills, described by the latest kill that
 * reported them. `firstKilledAt` is when tracking this character began.
 */
export const userKillCharacterTable = pgTable(
  "UserKillCharacter",
  {
    discordUserId: text("discordUserId").notNull(),
    world: text("world").notNull(),
    characterId: text("characterId").notNull(),
    name: text("name"),
    level: integer("level"),
    profession: text("profession"),
    icon: text("icon"),
    kills: integer("kills").notNull(),
    firstKilledAt: killTime("firstKilledAt").notNull(),
    lastKilledAt: killTime("lastKilledAt").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.discordUserId, table.world, table.characterId],
      name: "UserKillCharacter_pkey",
    }),
  ],
);

/** Hourly kills reported by an Organization member. */
export const memberKillBucketTable = pgTable(
  "MemberKillBucket",
  {
    periodStart: killTime("periodStart").notNull(),
    guildId: text("guildId").notNull(),
    memberId: integer("memberId").notNull(),
    discordUserId: text("discordUserId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    kills: integer("kills").notNull(),
    lastKilledAt: killTime("lastKilledAt").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.guildId,
        table.memberId,
        table.world,
        table.npcId,
        table.periodStart,
      ],
      name: "MemberKillBucket_pkey",
    }),
    index("MemberKillBucket_guildId_periodStart_idx").on(
      table.guildId,
      table.periodStart.desc(),
    ),
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "MemberKillBucket_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [memberTable.id],
      name: "MemberKillBucket_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/** Hourly kills counted once per Organization, however many members reported them. */
export const guildKillBucketTable = pgTable(
  "GuildKillBucket",
  {
    periodStart: killTime("periodStart").notNull(),
    guildId: text("guildId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    kills: integer("kills").notNull(),
    lastKilledAt: killTime("lastKilledAt").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.guildId, table.world, table.npcId, table.periodStart],
      name: "GuildKillBucket_pkey",
    }),
    index("GuildKillBucket_guildId_periodStart_idx").on(
      table.guildId,
      table.periodStart.desc(),
    ),
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "GuildKillBucket_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/**
 * Lifetime kills per scope, incremented in the same transaction as the hourly
 * bucket. Only the natural key is indexed and the migration sets fillfactor 70,
 * so increments are heap-only tuple updates.
 */
export const userKillTotalTable = pgTable(
  "UserKillTotal",
  {
    discordUserId: text("discordUserId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    kills: integer("kills").notNull(),
    lastKilledAt: killTime("lastKilledAt").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.discordUserId, table.world, table.npcId],
      name: "UserKillTotal_pkey",
    }),
  ],
);

export const memberKillTotalTable = pgTable(
  "MemberKillTotal",
  {
    guildId: text("guildId").notNull(),
    memberId: integer("memberId").notNull(),
    discordUserId: text("discordUserId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    kills: integer("kills").notNull(),
    lastKilledAt: killTime("lastKilledAt").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.guildId, table.memberId, table.world, table.npcId],
      name: "MemberKillTotal_pkey",
    }),
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "MemberKillTotal_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [memberTable.id],
      name: "MemberKillTotal_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const guildKillTotalTable = pgTable(
  "GuildKillTotal",
  {
    guildId: text("guildId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    kills: integer("kills").notNull(),
    lastKilledAt: killTime("lastKilledAt").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.guildId, table.world, table.npcId],
      name: "GuildKillTotal_pkey",
    }),
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "GuildKillTotal_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/** Short-lived accepted Organization kills and their durable publication intent. */
export const guildKillActivityTable = pgTable(
  "GuildKillActivity",
  {
    id: text("id").primaryKey(),
    guildId: text("guildId")
      .notNull()
      .references(() => guildTable.id, { onDelete: "restrict" }),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    npcProf: text("npcProf"),
    npcIcon: text("npcIcon"),
    occurredAt: timestamp("occurredAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
  },
  (table) => [
    index("GuildKillActivity_guildId_occurredAt_idx").on(
      table.guildId,
      table.occurredAt,
    ),
    index("GuildKillActivity_occurredAt_idx").on(table.occurredAt),
  ],
);
