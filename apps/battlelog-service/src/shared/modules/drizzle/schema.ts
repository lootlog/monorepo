import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const battles = pgTable(
  "battles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
    public: boolean("public").default(false).notNull(),
    userId: text("userId").notNull(),

    accountId: text("accountId").notNull(),
    characterId: text("characterId").notNull(),
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
    statistics: jsonb("statistics").notNull(),

    difficultyRank: integer("difficultyRank"),
    result: integer("result"),
    ratingDelta: integer("ratingDelta"),
    opponentLvl: integer("opponentLvl"),
    opponentOplvl: integer("opponentOplvl"),
    opponentRating: integer("opponentRating"),
    rating: integer("rating"),
    status: integer("status"),
  },
  (table) => [
    index("battles_userId_createdAt_idx").on(table.userId, table.createdAt),
    index("battles_world_createdAt_idx").on(table.world, table.createdAt),
    index("battles_userId_world_createdAt_idx").on(
      table.userId,
      table.world,
      table.createdAt,
    ),
    index("battles_characterId_createdAt_idx").on(
      table.characterId,
      table.createdAt,
    ),
    index("battles_public_createdAt_idx").on(table.public, table.createdAt),
    index("battles_id_idx").on(table.id),
  ],
);

export const userCharacters = pgTable(
  "user_characters",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId").notNull(),
    characterId: text("characterId").notNull(),
    name: text("name").notNull(),
    world: text("world").notNull(),
    icon: text("icon").default("").notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
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
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    battleId: text("battleId")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),

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
    spellsUsedMap: jsonb("spellsUsedMap").default("{}").notNull(),

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
    index("battle_warriors_originalId_idx").on(table.originalId),
    index("battle_warriors_name_idx").on(table.name),
    index("battle_warriors_battleId_team_idx").on(table.battleId, table.team),
  ],
);

export type Battle = typeof battles.$inferSelect;
export type NewBattle = typeof battles.$inferInsert;
export type BattleWarrior = typeof battleWarriors.$inferSelect;
export type NewBattleWarrior = typeof battleWarriors.$inferInsert;
export type UserCharacter = typeof userCharacters.$inferSelect;
