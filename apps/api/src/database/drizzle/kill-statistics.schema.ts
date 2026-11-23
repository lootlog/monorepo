import {
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { guildTable, memberTable, npcTypeEnum } from "./organization.schema.js";

const killTime = (name: string) =>
  timestamp(name, { mode: "date", precision: 3, withTimezone: true });

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

export const memberKillPurgeTable = pgTable("MemberKillPurge", {
  memberId: integer("memberId")
    .primaryKey()
    .references(() => memberTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  guildId: text("guildId").notNull(),
  before: killTime("before").notNull(),
  claimedUntil: killTime("claimedUntil"),
  createdAt: killTime("createdAt").defaultNow().notNull(),
});

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

export const guildKillDayTable = pgTable(
  "GuildKillDay",
  {
    guildId: text("guildId").notNull(),
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    npcLvl: integer("npcLvl").notNull(),
    kills: integer("kills").notNull(),
    hours: integer("hours").array().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.guildId, table.world, table.npcId, table.day],
      name: "GuildKillDay_pkey",
    }),
  ],
);

export const bossKillTable = pgTable(
  "BossKill",
  {
    world: text("world").notNull(),
    npcId: integer("npcId").notNull(),
    killedAt: killTime("killedAt").notNull(),
    npcName: text("npcName").notNull(),
    npcType: npcTypeEnum("npcType").notNull(),
    guildIds: text("guildIds").array().notNull(),
    lootRolls: doublePrecision("lootRolls"),
    partyWarriors: integer("partyWarriors"),
    partyPaladins: integer("partyPaladins"),
    partyBladeDancers: integer("partyBladeDancers"),
    partyMages: integer("partyMages"),
    partyTrackers: integer("partyTrackers"),
    partyHunters: integer("partyHunters"),
  },
  (table) => [
    primaryKey({
      columns: [table.world, table.npcId, table.killedAt],
      name: "BossKill_pkey",
    }),
  ],
);

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
