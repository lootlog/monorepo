import type { Queue } from "bullmq";
import { Effect } from "effect";
import { battlelogOperation } from "./battlelog-operation.js";
import type { Battles } from "#src/battles/battles.service";
import type { DeleteUserBattlesJobData } from "#src/battles/delete-user-battles.processor";
import type {
  BattleResponseInput,
  BattlesListResponseInput,
} from "#src/battles/dto/battle-response.dto";
import type { CreateBattleDto } from "#src/battles/dto/create-battle.dto";
import type { QueryBattleAnalyticsDto } from "#src/battles/dto/query-battle-analytics.dto";
import type {
  QueryAbyssSeasonsDto,
  QueryBattleStatisticsDto,
  QueryPlayerVsPlayerDto,
} from "#src/battles/dto/query-battle-statistics.dto";
import type { QueryBattlesDto } from "#src/battles/dto/query-battles.dto";
import type { UpdateBattleDto } from "#src/battles/dto/update-battle.dto";
import type {
  BattleWithRelations,
  GetAllBattlesResult,
} from "#src/battles/interfaces/battle-service.interface";
import type { BattleAnalytics } from "#src/battles/services/battle-analytics.service";
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
      (data: CreateBattleDto, userId: string) =>
        battles.createBattle({ data, userId }),
    ),
    getDashboardBattles: battlelogOperation(
      "BattlesController_getDashboardBattles",
      (query: QueryBattlesDto, userId: string) =>
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
      (query: QueryBattleAnalyticsDto, userId: string) =>
        analytics.getBattleAnalytics(query, userId),
    ),
    getAbyssSeasons: battlelogOperation(
      "BattlesController_getAbyssSeasons",
      (query: QueryAbyssSeasonsDto, userId: string) =>
        analytics.getAbyssSeasons(query, userId),
    ),
    getCombatProfile: battlelogOperation(
      "BattlesController_getCombatProfile",
      (query: QueryBattleStatisticsDto, userId: string) =>
        analytics.getCombatProfile(query, userId),
    ),
    getProfessionWinRate: battlelogOperation(
      "BattlesController_getProfessionWinRate",
      (query: QueryBattleStatisticsDto, userId: string) =>
        analytics.calculateProfessionWinRate(query, userId),
    ),
    getHeadToHead: battlelogOperation(
      "BattlesController_getHeadToHead",
      (query: QueryBattleStatisticsDto, userId: string) =>
        analytics.getHeadToHead(query, userId),
    ),
    getCurrentStreak: battlelogOperation(
      "BattlesController_getCurrentStreak",
      (query: QueryBattleStatisticsDto, userId: string) =>
        analytics.getCurrentStreak(query, userId),
    ),
    getBattleDuration: battlelogOperation(
      "BattlesController_getBattleDuration",
      (query: QueryBattleStatisticsDto, userId: string) =>
        analytics.getBattleDurationStats(query, userId),
    ),
    getPhGrowth: battlelogOperation(
      "BattlesController_getPhGrowth",
      (query: QueryBattleStatisticsDto, userId: string) =>
        analytics.getPhGrowthTimeSeries(query, userId),
    ),
    getRatingGrowth: battlelogOperation(
      "BattlesController_getRatingGrowth",
      (query: QueryBattleStatisticsDto, userId: string) =>
        analytics.getRatingGrowthTimeSeries(query, userId),
    ),
    getRatingDeltaByOpponent: battlelogOperation(
      "BattlesController_getRatingDeltaByOpponent",
      (query: QueryBattleStatisticsDto, userId: string) =>
        analytics.getRatingDeltaByOpponent(query, userId),
    ),
    getPlayerVsPlayerBattles: battlelogOperation(
      "BattlesController_getPlayerVsPlayerBattles",
      (query: QueryPlayerVsPlayerDto, userId: string) =>
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
      (battleId: string, update: UpdateBattleDto, userId: string) =>
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
