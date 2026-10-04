// Hand-maintained Battlelog database schema; Drizzle generates SQL migrations from it.
// `battles`, `battle_warriors` and `battle_timelines` are TimescaleDB hypertables
// partitioned by battle ID; the migration creates them, the schema cannot.
import { sql } from "drizzle-orm";
import {
  boolean,
  bytea,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const battles = pgTable(
  "battles",
  {
    // UUIDv7 that encodes `createdAt`; see `createBattleId`.
    id: uuid("id").primaryKey(),
    createdAt: timestamp("createdAt", {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
    public: boolean("public").default(false).notNull(),
    userId: text("userId").notNull(),

    accountId: text("accountId").notNull(),
    characterId: text("characterId").notNull(),
    semanticFingerprint: text("semanticFingerprint"),
    world: text("world").notNull(),
    duration: doublePrecision("duration").notNull(),
    type: text("type").notNull(),
    winner: text("winner").notNull(),
    loser: text("loser").notNull(),
    winningTeam: integer("winningTeam").notNull(),
    losingTeam: integer("losingTeam").notNull(),
    honorPoints: integer("honorPoints").default(0).notNull(),
    hasFlee: boolean("hasFlee").default(false).notNull(),
    matchmaking: boolean("matchmaking").default(false).notNull(),

    difficultyRank: integer("difficultyRank"),
    result: integer("result"),
    ratingDelta: integer("ratingDelta"),
    opponentLvl: integer("opponentLvl"),
    opponentOplvl: integer("opponentOplvl"),
    opponentRating: integer("opponentRating"),
    rating: integer("rating"),
    status: integer("status"),
    pointsGained: integer("pointsGained"),
    placementCur: integer("placementCur"),
    placementMax: integer("placementMax"),
    dailyStageId: integer("dailyStageId"),
    dailyPointsCur: integer("dailyPointsCur"),
    dailyPointsMax: integer("dailyPointsMax"),
    dailyPointsStep: integer("dailyPointsStep"),
    dailyRewardsLast: integer("dailyRewardsLast"),
    dailyRewardsCur: integer("dailyRewardsCur"),
    dailyRewardsMax: integer("dailyRewardsMax"),
  },
  (table) => [
    index("battles_userId_id_idx").on(table.userId, table.id),
    index("battles_userId_world_id_idx").on(
      table.userId,
      table.world,
      table.id,
    ),
    index("battles_characterId_id_idx").on(table.characterId, table.id),
    index("battles_semanticFingerprint_id_idx").on(
      table.semanticFingerprint,
      table.id,
    ),
    check(
      "battles_id_createdAt_check",
      sql`battle_id_created_at(${table.id}) = ${table.createdAt}`,
    ),
  ],
);

/**
 * A unique index on a hypertable must contain the battle ID, so the owner's
 * submission IDs live in this plain table. A retry finds its battle here.
 */
export const battleSubmissions = pgTable(
  "battle_submissions",
  {
    userId: text("userId").notNull(),
    submissionId: text("submissionId").notNull(),
    battleId: uuid("battleId").notNull(),
  },
  (table) => [
    primaryKey({
      name: "battle_submissions_pkey",
      columns: [table.userId, table.submissionId],
    }),
    index("battle_submissions_battleId_idx").on(table.battleId),
  ],
);

/** The submitted Margonem events of a battle, as zstd-compressed JSON. */
export const battleTimelines = pgTable(
  "battle_timelines",
  {
    battleId: uuid("battleId").primaryKey(),
    userId: text("userId").notNull(),
    events: bytea("events").notNull(),
  },
  (table) => [
    index("battle_timelines_userId_battleId_idx").on(
      table.userId,
      table.battleId,
    ),
  ],
);

/**
 * Battles saved before UUIDv7 IDs keep their old public links and R2 object
 * keys here. Their timelines stay in R2 under the old ID; drop the table with
 * the R2 bucket.
 */
export const battleLegacyIds = pgTable("battle_legacy_ids", {
  legacyId: text("legacyId").primaryKey(),
  battleId: uuid("battleId").notNull().unique("battle_legacy_ids_battleId_key"),
});

export const battleObjectDeletions = pgTable(
  "battle_object_deletions",
  {
    // The R2 object ID of a deleted battle saved before UUIDv7 IDs.
    battleId: text("battleId").primaryKey(),
    userId: text("userId").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    retryAt: timestamp("retryAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("battle_object_deletions_retryAt_idx").on(table.retryAt)],
);

export const userCharacters = pgTable(
  "user_characters",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    characterId: text("characterId").notNull(),
    name: text("name").notNull(),
    world: text("world").notNull(),
    icon: text("icon").default("").notNull(),
    lastSeenAt: timestamp("lastSeenAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_characters_userId_characterId_world_key").on(
      table.userId,
      table.characterId,
      table.world,
    ),
    index("user_characters_userId_idx").on(table.userId),
  ],
);

export const battleWarriors = pgTable(
  "battle_warriors",
  {
    battleId: uuid("battleId").notNull(),
    // The battle owner, so compression segments and deletions follow the owner.
    userId: text("userId").notNull(),

    originalId: text("originalId").notNull(),
    name: text("name").notNull(),
    lvl: integer("lvl").notNull(),
    prof: text("prof").notNull(),
    icon: text("icon").notNull(),
    team: integer("team").notNull(),
    turns: integer("turns").notNull(),
    turnsLost: integer("turnsLost").default(0).notNull(),
    steps: integer("steps").default(0).notNull(),
    normalAttacks: integer("normalAttacks").default(0).notNull(),
    spellsUsed: integer("spellsUsed").default(0).notNull(),
    spellsUsedMap: jsonb("spellsUsedMap")
      .$type<Record<string, number>>()
      .default({})
      .notNull(),

    isDead: boolean("isDead").default(false).notNull(),
    surrendered: boolean("surrendered").default(false).notNull(),
    fled: boolean("fled").default(false).notNull(),
    maxHp: integer("maxHp").default(0).notNull(),

    damageDealt: integer("damageDealt").default(0).notNull(),
    distanceDamage: integer("distanceDamage").default(0).notNull(),
    meleeDamage: integer("meleeDamage").default(0).notNull(),
    auxiliaryDamage: integer("auxiliaryDamage").default(0).notNull(),
    fireDamage: integer("fireDamage").default(0).notNull(),
    frostDamage: integer("frostDamage").default(0).notNull(),
    lightningDamage: integer("lightningDamage").default(0).notNull(),
    thirdAttDamage: integer("thirdAttDamage").default(0).notNull(),
    damageDealtAfterDefensive: integer("damageDealtAfterDefensive")
      .default(0)
      .notNull(),
    damageDealtAfterDefensivePercentage: doublePrecision(
      "damageDealtAfterDefensivePercentage",
    )
      .default(0)
      .notNull(),
    damageTaken: integer("damageTaken").default(0).notNull(),
    distanceDamageTaken: integer("distanceDamageTaken").default(0).notNull(),
    meleeDamageTaken: integer("meleeDamageTaken").default(0).notNull(),
    auxiliaryDamageTaken: integer("auxiliaryDamageTaken").default(0).notNull(),
    fireDamageTaken: integer("fireDamageTaken").default(0).notNull(),
    frostDamageTaken: integer("frostDamageTaken").default(0).notNull(),
    lightningDamageTaken: integer("lightningDamageTaken").default(0).notNull(),
    thirdAttDamageTaken: integer("thirdAttDamageTaken").default(0).notNull(),
    flatDamageTaken: integer("flatDamageTaken").default(0).notNull(),
    rageDamageDealt: integer("rageDamageDealt").default(0).notNull(),
    trueDamageDealt: integer("trueDamageDealt").default(0).notNull(),
    trueDamageTaken: integer("trueDamageTaken").default(0).notNull(),
    stigmaDamageDealt: integer("stigmaDamageDealt").default(0).notNull(),
    stigmaDamageTaken: integer("stigmaDamageTaken").default(0).notNull(),

    passiveHealing: integer("passiveHealing").default(0).notNull(),
    activeHealing: integer("activeHealing").default(0).notNull(),

    armorPierces: integer("armorPierces").default(0).notNull(),
    criticalHits: integer("criticalHits").default(0).notNull(),
    reducedArmor: integer("reducedArmor").default(0).notNull(),
    reducedPoisonResistance: integer("reducedPoisonResistance")
      .default(0)
      .notNull(),
    magicResistanceDestroyed: integer("magicResistanceDestroyed")
      .default(0)
      .notNull(),
    evasions: integer("evasions").default(0).notNull(),
    attacksEvaded: integer("attacksEvaded").default(0).notNull(),
    counters: integer("counters").default(0).notNull(),
    fastArrows: integer("fastArrows").default(0).notNull(),
    blocks: integer("blocks").default(0).notNull(),
    attacksBlocked: integer("attacksBlocked").default(0).notNull(),
    blockedDamage: integer("blockedDamage").default(0).notNull(),

    woundDamageTaken: integer("woundDamageTaken").default(0).notNull(),
    poisonDamageTaken: integer("poisonDamageTaken").default(0).notNull(),
    injureDamageTaken: integer("injureDamageTaken").default(0).notNull(),
    injures: integer("injures").default(0).notNull(),
    critWoundDamageTaken: integer("critWoundDamageTaken").default(0).notNull(),
    firePassiveDamageTaken: integer("firePassiveDamageTaken")
      .default(0)
      .notNull(),
    lightningPassiveDamageTaken: integer("lightningPassiveDamageTaken")
      .default(0)
      .notNull(),

    destroyedEnergy: integer("destroyedEnergy").default(0).notNull(),
    destroyedMana: integer("destroyedMana").default(0).notNull(),
    regeneratedEnergy: integer("regeneratedEnergy").default(0).notNull(),
    regeneratedMana: integer("regeneratedMana").default(0).notNull(),

    reflectedDamage: integer("reflectedDamage").default(0).notNull(),
    reflectedDamageTaken: integer("reflectedDamageTaken").default(0).notNull(),

    legbons: integer("legbons").default(0).notNull(),
    legbonCurse: integer("legbonCurse").default(0).notNull(),
    legbonCleanse: integer("legbonCleanse").default(0).notNull(),
    legbonLastheal: integer("legbonLastheal").default(0).notNull(),
    legbonLasthealValue: integer("legbonLasthealValue").default(0).notNull(),
    legbonGlare: integer("legbonGlare").default(0).notNull(),
    legbonHolytouch: integer("legbonHolytouch").default(0).notNull(),
    legbonHolytouchValue: integer("legbonHolytouchValue").default(0).notNull(),
    legbonCritredValue: integer("legbonCritredValue").default(0).notNull(),
    legbonFacadeValue: integer("legbonFacadeValue").default(0).notNull(),
    legbonPunctureValue: integer("legbonPunctureValue").default(0).notNull(),
    legbonVerycrit: integer("legbonVerycrit").default(0).notNull(),
    legbonAnguish: integer("legbonAnguish").default(0).notNull(),
    legbonAnguishDamageTaken: integer("legbonAnguishDamageTaken")
      .default(0)
      .notNull(),

    ph: integer("ph").default(0).notNull(),
  },
  (table) => [
    primaryKey({
      name: "battle_warriors_pkey",
      columns: [table.battleId, table.originalId],
    }),
    index("battle_warriors_originalId_battleId_idx").on(
      table.originalId,
      table.battleId,
    ),
  ],
);

export type Battle = typeof battles.$inferSelect;

export type NewBattle = typeof battles.$inferInsert;

export type BattleWarrior = typeof battleWarriors.$inferSelect;

export type NewBattleWarrior = typeof battleWarriors.$inferInsert;

export type UserCharacter = typeof userCharacters.$inferSelect;
