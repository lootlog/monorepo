import type { RedisStore } from "../src/infrastructure/redis-store.js";
import { Effect } from "effect";
import type { Battles } from "../src/battles/battles.service.js";
import type { BattleAnalytics } from "../src/battles/analytics/battle-analytics.service.js";
import type { BattleWithRelations } from "#src/battles/battle-service";
import {
  buildBattleWarriorStats,
  type InflatedBattleWarrior,
} from "#src/battles/statistics/battle-warrior-stats";

export const createWarriorFixture = (
  overrides: Partial<InflatedBattleWarrior> = {},
): InflatedBattleWarrior => ({
  ...buildBattleWarriorStats({}),
  id: "warrior-1",
  battleId: "battle-1",
  originalId: "character-1",
  name: "Character",
  lvl: 100,
  prof: "w",
  icon: "",
  team: 1,
  ph: 0,
  ...overrides,
});

export const createBattleFixture = ({
  warriors = [],
  ...overrides
}: Omit<Partial<BattleWithRelations>, "warriors"> & {
  warriors?: Array<Partial<InflatedBattleWarrior>>;
} = {}): BattleWithRelations => ({
  id: "battle-1",
  userId: "user-1",
  accountId: "account-1",
  characterId: "character-1",
  world: "world-1",
  duration: 0,
  semanticFingerprint: null,
  submissionId: null,
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
  matchmaking: false,
  statistics: {
    topDamageDealer: null,
    topTank: null,
    bestEfficiency: null,
    criticalMaster: null,
    evasionExpert: null,
    shieldWall: null,
    damagePerTurn: null,
    mostActive: null,
    legendaryWarrior: null,
    untouchable: null,
  },
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
  getPublicBattles: unexpectedOperation,
  getPublicBattleTimeline: unexpectedOperation,
  getUserCharacters: unexpectedOperation,
  getUserWorlds: unexpectedOperation,
  searchWarriors: unexpectedOperation,
  updateBattle: unexpectedOperation,
} satisfies Battles;

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

export const unusedDeleteQueue = {
  add: () => Promise.reject(new Error("Unexpected delete job")),
};

const unexpectedRedisOperation = () =>
  Promise.reject(new Error("Unexpected Redis operation"));

export const unusedRedisStore = {
  set: unexpectedRedisOperation,
  get: unexpectedRedisOperation,
  getJson: unexpectedRedisOperation,
  setJson: unexpectedRedisOperation,
  getOrSetJson: unexpectedRedisOperation,
  getOrSetJsonBestEffort: unexpectedRedisOperation,
  deleteByPattern: unexpectedRedisOperation,
  setNX: unexpectedRedisOperation,
  eval: unexpectedRedisOperation,
  del: unexpectedRedisOperation,
  zadd: unexpectedRedisOperation,
  zcard: unexpectedRedisOperation,
  zrange: unexpectedRedisOperation,
  zrem: unexpectedRedisOperation,
  zremrangebyrank: unexpectedRedisOperation,
} satisfies RedisStore;
