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
    isDraw: boolean("isDraw").default(false).notNull(),
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

export type WarriorStats = {
  turnsLost?: number;
  steps?: number;
  normalAttacks?: number;
  spellsUsed?: number;
  spellsUsedMap?: Record<string, number>;
  damageDealt?: number;
  distanceDamage?: number;
  meleeDamage?: number;
  auxiliaryDamage?: number;
  fireDamage?: number;
  frostDamage?: number;
  lightningDamage?: number;
  thirdAttDamage?: number;
  damageDealtAfterDefensive?: number;
  damageDealtAfterDefensivePercentage?: number;
  damageTaken?: number;
  distanceDamageTaken?: number;
  meleeDamageTaken?: number;
  auxiliaryDamageTaken?: number;
  fireDamageTaken?: number;
  frostDamageTaken?: number;
  lightningDamageTaken?: number;
  thirdAttDamageTaken?: number;
  flatDamageTaken?: number;
  rageDamageDealt?: number;
  trueDamageDealt?: number;
  trueDamageTaken?: number;
  stigmaDamageDealt?: number;
  stigmaDamageTaken?: number;
  passiveHealing?: number;
  activeHealing?: number;
  armorPierces?: number;
  criticalHits?: number;
  reducedArmor?: number;
  reducedPoisonResistance?: number;
  magicResistanceDestroyed?: number;
  evasions?: number;
  attacksEvaded?: number;
  counters?: number;
  fastArrows?: number;
  blocks?: number;
  attacksBlocked?: number;
  blockedDamage?: number;
  woundDamageTaken?: number;
  poisonDamageTaken?: number;
  injureDamageTaken?: number;
  injures?: number;
  critWoundDamageTaken?: number;
  firePassiveDamageTaken?: number;
  lightningPassiveDamageTaken?: number;
  destroyedEnergy?: number;
  destroyedMana?: number;
  regeneratedEnergy?: number;
  regeneratedMana?: number;
  reflectedDamage?: number;
  reflectedDamageTaken?: number;
  legbons?: number;
  legbonCurse?: number;
  legbonCleanse?: number;
  legbonLastheal?: number;
  legbonLasthealValue?: number;
  legbonGlare?: number;
  legbonHolytouch?: number;
  legbonHolytouchValue?: number;
  legbonCritredValue?: number;
  legbonFacadeValue?: number;
  legbonPunctureValue?: number;
  legbonVerycrit?: number;
  legbonAnguish?: number;
  legbonAnguishDamageTaken?: number;
  legbonFrenzy?: number;
  legbonRetaliation?: number;
  legbonDmgred?: number;
  legbonResgain?: number;
  legbonPushback?: number;
  absorbedDamage?: number;
  absorbedMagicDamage?: number;
  vampirismHealing?: number;
  energyRecovered?: number;
  crushDamage?: number;
  stuns?: number;
  freezes?: number;
  parries?: number;
  attacksParried?: number;
};

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

    isDead: boolean("isDead").default(false).notNull(),
    surrendered: boolean("surrendered").default(false).notNull(),
    fled: boolean("fled").default(false).notNull(),
    maxHp: integer("maxHp").default(0).notNull(),
    ph: integer("ph").default(0).notNull(),

    stats: jsonb("stats").notNull().default({}).$type<WarriorStats>(),
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
