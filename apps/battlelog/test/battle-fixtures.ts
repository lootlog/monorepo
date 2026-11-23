import type { RedisStore } from "../src/infrastructure/redis-store.js";
import { Effect } from "effect";
import type { Battles } from "../src/battles/battles.service.js";
import type { BattleAnalytics } from "../src/battles/analytics/battle-analytics.service.js";
import type { WeaponKills } from "#src/battles/weapon-kills/weapon-kills";
import type { BattleWithRelations } from "#src/battles/battle-service";
import { sql, type SQL } from "drizzle-orm";
import type { BattleWarrior } from "#src/database/schema";

const createWarriorFixture = (
  overrides: Partial<BattleWarrior> = {},
): BattleWarrior => ({
  battleId: "battle-1",
  originalId: "character-1",
  name: "Character",
  lvl: 100,
  prof: "w",
  icon: "",
  team: 1,
  turns: 0,
  turnsLost: 0,
  steps: 0,
  normalAttacks: 0,
  spellsUsed: 0,
  spellsUsedMap: {},
  isDead: false,
  surrendered: false,
  fled: false,
  maxHp: 0,
  damageDealt: 0,
  distanceDamage: 0,
  meleeDamage: 0,
  auxiliaryDamage: 0,
  fireDamage: 0,
  frostDamage: 0,
  lightningDamage: 0,
  thirdAttDamage: 0,
  damageDealtAfterDefensive: 0,
  damageDealtAfterDefensivePercentage: 0,
  damageTaken: 0,
  distanceDamageTaken: 0,
  meleeDamageTaken: 0,
  auxiliaryDamageTaken: 0,
  fireDamageTaken: 0,
  frostDamageTaken: 0,
  lightningDamageTaken: 0,
  thirdAttDamageTaken: 0,
  flatDamageTaken: 0,
  rageDamageDealt: 0,
  trueDamageDealt: 0,
  trueDamageTaken: 0,
  stigmaDamageDealt: 0,
  stigmaDamageTaken: 0,
  passiveHealing: 0,
  activeHealing: 0,
  armorPierces: 0,
  criticalHits: 0,
  reducedArmor: 0,
  reducedPoisonResistance: 0,
  magicResistanceDestroyed: 0,
  evasions: 0,
  attacksEvaded: 0,
  counters: 0,
  fastArrows: 0,
  blocks: 0,
  attacksBlocked: 0,
  blockedDamage: 0,
  woundDamageTaken: 0,
  poisonDamageTaken: 0,
  injureDamageTaken: 0,
  injures: 0,
  critWoundDamageTaken: 0,
  firePassiveDamageTaken: 0,
  lightningPassiveDamageTaken: 0,
  destroyedEnergy: 0,
  destroyedMana: 0,
  regeneratedEnergy: 0,
  regeneratedMana: 0,
  reflectedDamage: 0,
  reflectedDamageTaken: 0,
  legbons: 0,
  legbonCurse: 0,
  legbonCleanse: 0,
  legbonLastheal: 0,
  legbonLasthealValue: 0,
  legbonGlare: 0,
  legbonHolytouch: 0,
  legbonHolytouchValue: 0,
  legbonCritredValue: 0,
  legbonFacadeValue: 0,
  legbonPunctureValue: 0,
  legbonVerycrit: 0,
  legbonAnguish: 0,
  legbonAnguishDamageTaken: 0,
  ph: 0,
  ...overrides,
});

export const createBattleFixture = ({
  warriors = [],
  ...overrides
}: Omit<Partial<BattleWithRelations>, "warriors"> & {
  warriors?: Array<Partial<BattleWarrior>>;
} = {}): BattleWithRelations => ({
  id: "battle-1",
  userId: "user-1",
  accountId: "account-1",
  characterId: "character-1",
  world: "world-1",
  duration: 0,
  semanticFingerprint: null,
  public: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  type: "1v1",
  winner: "Team 1",
  loser: "Team 2",
  winningTeam: 1,
  losingTeam: 2,
  honorPoints: 0,
  hasFlee: false,
  unfinished: false,
  matchmaking: false,

  difficultyRank: null,
  result: null,
  ratingDelta: null,
  opponentLvl: null,
  opponentOplvl: null,
  opponentRating: null,
  rating: null,
  status: null,
  pointsGained: null,
  placementCur: null,
  placementMax: null,
  dailyStageId: null,
  dailyPointsCur: null,
  dailyPointsMax: null,
  dailyPointsStep: null,
  dailyRewardsLast: null,
  dailyRewardsCur: null,
  dailyRewardsMax: null,
  ...overrides,
  warriors: warriors.map(createWarriorFixture),
});

const unexpectedOperation = () =>
  Effect.die(new Error("Unexpected battle operation"));

export const unusedBattles = {
  assertBattleOwner: unexpectedOperation,
  createBattle: unexpectedOperation,
  deleteBattle: unexpectedOperation,
  deleteUserBattles: unexpectedOperation,
  drainObjectDeletions: unexpectedOperation(),
  getBattleFromDatabase: unexpectedOperation,
  getBattleRawData: unexpectedOperation,
  getBattleTimeline: unexpectedOperation,
  getDashboardBattles: unexpectedOperation,
  getPublicBattle: unexpectedOperation,
  getPublicBattleRaw: unexpectedOperation,
  getPublicBattleTimeline: unexpectedOperation,
  resolveBattleId: (battleId: string) => Effect.succeed(battleId),
  updateBattle: unexpectedOperation,
} satisfies Battles;

export const unusedBattleMetadata = {
  getUserCharacters: unexpectedOperation,
  searchWarriors: unexpectedOperation,
};

export const unusedBattleAnalytics = {
  calculateProfessionWinRate: unexpectedOperation,
  getAbyssSeasons: unexpectedOperation,
  getBattleAnalytics: unexpectedOperation,
  getBattleDurationStats: unexpectedOperation,
  getCombatProfile: unexpectedOperation,
  getCurrentStreak: unexpectedOperation,
  getHeadToHead: unexpectedOperation,
  getPhGrowthTimeSeries: unexpectedOperation,
  getPlayerVsPlayerBattles: unexpectedOperation,
  getRatingDeltaByOpponent: unexpectedOperation,
  getRatingGrowthTimeSeries: unexpectedOperation,
  invalidateAnalyticsCache: unexpectedOperation,
} satisfies BattleAnalytics;

export const unusedWeaponKills = {
  getCharacterWeaponKills: unexpectedOperation,
  recordWeaponKills: unexpectedOperation,
} satisfies WeaponKills;

export const unusedDeleteQueue = {
  add: () => Promise.reject(new Error("Unexpected delete job")),
};

const unexpectedRedisOperation = () =>
  Effect.die(new Error("Unexpected Redis operation"));

export const unusedRedisStore = {
  set: unexpectedRedisOperation,
  get: unexpectedRedisOperation,
  getJson: unexpectedRedisOperation,
  setJson: unexpectedRedisOperation,
  getOrSetJson: unexpectedRedisOperation,
  setNX: unexpectedRedisOperation,
  evalScript: unexpectedRedisOperation,
  del: unexpectedRedisOperation,
  zadd: unexpectedRedisOperation,
  zcard: unexpectedRedisOperation,
  zrange: unexpectedRedisOperation,
  zrem: unexpectedRedisOperation,
  expire: unexpectedRedisOperation,
  zremrangebyscore: unexpectedRedisOperation,
} satisfies RedisStore;

export const SYNC_BATTLE_WARRIOR_FILTERS_SQL = `
  INSERT INTO battle_warrior_filters ("userId", "battleId", "originalId", "name", "lvl", "ph", "team")
  SELECT b."userId", w."battleId", w."originalId", w."name", w."lvl", w."ph", w."team"
  FROM battle_warriors w
  INNER JOIN battles b ON b.id = w."battleId"
  ON CONFLICT DO NOTHING
`;

export const syncBattleWarriorFilters = <A, E>(database: {
  execute: (query: SQL) => Effect.Effect<A, E>;
}) => database.execute(sql.raw(SYNC_BATTLE_WARRIOR_FILTERS_SQL));
