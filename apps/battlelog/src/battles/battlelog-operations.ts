import type { Queue } from "bullmq";
import { Effect } from "effect";
import { battlelogOperation } from "./battlelog-operation.js";
import type { Battles } from "#src/battles/battles.service";
import type { DeleteUserBattlesJobData } from "#src/battles/deletion/delete-user-battles.processor";
import type {
  BattleResponseInput,
  BattlesListResponseInput,
} from "#src/battles/catalog/battle-response";
import type { CreateBattleInput } from "#src/battles/submission/create-battle";
import type { BattleAnalyticsCriteria } from "#src/battles/analytics/query-battle-analytics";
import type {
  AbyssSeasonsQuery,
  BattleStatisticsQuery,
  PlayerVsPlayerQuery,
} from "#src/battles/analytics/query-battle-statistics";
import type { BattleListQuery } from "#src/battles/catalog/query-battles";
import type { BattleUpdate } from "#src/battles/catalog/update-battle";
import type {
  BattleWithRelations,
  GetAllBattlesResult,
} from "#src/battles/battle-service";
import type { BattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import type { DeleteUserData } from "./internal-operations.js";

const normalizeBattleResponse = (
  battle: BattleWithRelations,
): BattleResponseInput => ({
  ...battle,
  createdAt: battle.createdAt.toISOString(),
  updatedAt: battle.updatedAt.toISOString(),
  warriors: battle.warriors.map((warrior) => ({
    ...warrior,
    spellsUsedMap: warrior.spellsUsedMap as Record<string, number>,
  })),
  statistics: battle.statistics as BattleResponseInput["statistics"],
});

const normalizeBattlesListResponse = (
  response: GetAllBattlesResult,
): BattlesListResponseInput => ({
  ...response,
  battles: response.battles.map(normalizeBattleResponse),
});

export const makeBattlelogOperations = (
  battles: Battles,
  analytics: BattleAnalytics,
  deleteQueue: Queue<DeleteUserBattlesJobData>,
) => ({
  battles: {
    createBattle: battlelogOperation(
      "BattlesController_createBattle",
      (data: CreateBattleInput, userId: string) =>
        battles.createBattle({ data, userId }),
    ),
    getDashboardBattles: battlelogOperation(
      "BattlesController_getDashboardBattles",
      (query: BattleListQuery, userId: string) =>
        battles
          .getDashboardBattles(query, userId)
          .pipe(Effect.map(normalizeBattlesListResponse)),
    ),
    getUserCharacters: battlelogOperation(
      "BattlesController_getUserCharacters",
      (userId: string) => battles.getUserCharacters(userId),
    ),
    getBattleAnalytics: battlelogOperation(
      "BattlesController_getBattleAnalytics",
      (query: BattleAnalyticsCriteria, userId: string) =>
        analytics.getBattleAnalytics(query, userId),
    ),
    getAbyssSeasons: battlelogOperation(
      "BattlesController_getAbyssSeasons",
      (query: AbyssSeasonsQuery, userId: string) =>
        analytics.getAbyssSeasons(query, userId),
    ),
    getCombatProfile: battlelogOperation(
      "BattlesController_getCombatProfile",
      (query: BattleStatisticsQuery, userId: string) =>
        analytics.getCombatProfile(query, userId),
    ),
    getProfessionWinRate: battlelogOperation(
      "BattlesController_getProfessionWinRate",
      (query: BattleStatisticsQuery, userId: string) =>
        analytics.calculateProfessionWinRate(query, userId),
    ),
    getHeadToHead: battlelogOperation(
      "BattlesController_getHeadToHead",
      (query: BattleStatisticsQuery, userId: string) =>
        analytics.getHeadToHead(query, userId),
    ),
    getCurrentStreak: battlelogOperation(
      "BattlesController_getCurrentStreak",
      (query: BattleStatisticsQuery, userId: string) =>
        analytics.getCurrentStreak(query, userId),
    ),
    getBattleDuration: battlelogOperation(
      "BattlesController_getBattleDuration",
      (query: BattleStatisticsQuery, userId: string) =>
        analytics.getBattleDurationStats(query, userId),
    ),
    getPhGrowth: battlelogOperation(
      "BattlesController_getPhGrowth",
      (query: BattleStatisticsQuery, userId: string) =>
        analytics.getPhGrowthTimeSeries(query, userId),
    ),
    getRatingGrowth: battlelogOperation(
      "BattlesController_getRatingGrowth",
      (query: BattleStatisticsQuery, userId: string) =>
        analytics.getRatingGrowthTimeSeries(query, userId),
    ),
    getRatingDeltaByOpponent: battlelogOperation(
      "BattlesController_getRatingDeltaByOpponent",
      (query: BattleStatisticsQuery, userId: string) =>
        analytics.getRatingDeltaByOpponent(query, userId),
    ),
    getPlayerVsPlayerBattles: battlelogOperation(
      "BattlesController_getPlayerVsPlayerBattles",
      (query: PlayerVsPlayerQuery, userId: string) =>
        analytics.getPlayerVsPlayerBattles(query, userId),
    ),
    searchWarriors: battlelogOperation(
      "BattlesController_searchWarriors",
      (query: string, userId: string) => battles.searchWarriors(query, userId),
    ),
    getUserWorlds: battlelogOperation(
      "BattlesController_getUserWorlds",
      (userId: string) => battles.getUserWorlds(userId),
    ),
    getBattleTimeline: battlelogOperation(
      "BattlesController_getBattleTimeline",
      (battleId: string, userId: string) =>
        battles.getBattleTimeline(battleId, userId),
    ),
    getBattle: battlelogOperation(
      "BattlesController_getBattle",
      (battleId: string, userId: string) =>
        battles
          .getBattleFromDatabase(battleId, userId)
          .pipe(Effect.map(normalizeBattleResponse)),
    ),
    getBattleRawData: battlelogOperation(
      "BattlesController_getBattleRawData",
      (battleId: string, userId: string) =>
        battles.getBattleRawData(battleId, userId),
    ),
    updateBattle: battlelogOperation(
      "BattlesController_updateBattle",
      (battleId: string, update: BattleUpdate, userId: string) =>
        battles
          .assertBattleOwner(battleId, userId)
          .pipe(
            Effect.andThen(battles.updateBattle(battleId, update)),
            Effect.map(normalizeBattleResponse),
          ),
    ),
    deleteBattle: battlelogOperation(
      "BattlesController_deleteBattle",
      (battleId: string, userId: string) =>
        battles
          .assertBattleOwner(battleId, userId)
          .pipe(Effect.andThen(battles.deleteBattle(battleId))),
    ),
  },
  publicBattles: {
    getPublicBattle: battlelogOperation(
      "PublicBattlesController_getPublicBattle",
      (battleId: string) =>
        battles
          .getPublicBattle(battleId)
          .pipe(Effect.map(normalizeBattleResponse)),
    ),
    getPublicBattleRaw: battlelogOperation(
      "PublicBattlesController_getPublicBattleRaw",
      (battleId: string) => battles.getPublicBattleRaw(battleId),
    ),
    getPublicBattleTimeline: battlelogOperation(
      "PublicBattlesController_getPublicBattleTimeline",
      (battleId: string) => battles.getPublicBattleTimeline(battleId),
    ),
  },
  internal: {
    deleteUserData: battlelogOperation(
      "InternalController_deleteUserData",
      (body: DeleteUserData) =>
        Effect.tryPromise({
          try: () =>
            deleteQueue.add("delete-user-battles", { userId: body.userId }),
          catch: (cause) => cause,
        }).pipe(
          Effect.as({ status: "ACCEPTED" as const }),
          Effect.withSpan("InternalController_enqueueDeleteUserData", {
            attributes: { adapter: "bullmq", retryCount: 0 },
          }),
        ),
    ),
  },
});

export type BattlelogOperations = ReturnType<typeof makeBattlelogOperations>;
