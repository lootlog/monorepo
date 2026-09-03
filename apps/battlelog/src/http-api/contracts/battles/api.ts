/** Endpoints owned by the battles HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  BattlesControllerCreateBattle201,
  BattlesControllerCreateBattleRequestJson,
  BattlesControllerDeleteBattle200,
  BattlesControllerDeleteBattlePathParams,
  BattlesControllerGetAbyssSeasons200,
  BattlesControllerGetAbyssSeasonsQuery,
  BattlesControllerGetBattle200,
  BattlesControllerGetBattleAnalytics200,
  BattlesControllerGetBattleAnalyticsQuery,
  BattlesControllerGetBattleDuration200,
  BattlesControllerGetBattleDurationQuery,
  BattlesControllerGetBattlePathParams,
  BattlesControllerGetBattleRawData200,
  BattlesControllerGetBattleRawDataPathParams,
  BattlesControllerGetBattleTimeline200,
  BattlesControllerGetBattleTimelinePathParams,
  BattlesControllerGetCombatProfile200,
  BattlesControllerGetCombatProfileQuery,
  BattlesControllerGetCurrentStreak200,
  BattlesControllerGetCurrentStreakQuery,
  BattlesControllerGetDashboardBattles200,
  BattlesControllerGetDashboardBattlesQuery,
  BattlesControllerGetHeadToHead200,
  BattlesControllerGetHeadToHeadQuery,
  BattlesControllerGetPhGrowth200,
  BattlesControllerGetPhGrowthQuery,
  BattlesControllerGetPlayerVsPlayerBattles200,
  BattlesControllerGetPlayerVsPlayerBattlesQuery,
  BattlesControllerGetProfessionWinRate200,
  BattlesControllerGetProfessionWinRateQuery,
  BattlesControllerGetRatingDeltaByOpponent200,
  BattlesControllerGetRatingDeltaByOpponentQuery,
  BattlesControllerGetRatingGrowth200,
  BattlesControllerGetRatingGrowthQuery,
  BattlesControllerGetUserCharacters200,
  BattlesControllerGetUserWorlds200,
  BattlesControllerSearchWarriors200,
  BattlesControllerSearchWarriorsQuery,
  BattlesControllerUpdateBattle200,
  BattlesControllerUpdateBattlePathParams,
  BattlesControllerUpdateBattleRequestJson,
} from "./endpoints.schemas.js";
import { BearerSecurityMiddleware } from "./security.js";

export class BattlesGroup extends HttpApiGroup.make("battles").add(
  HttpApiEndpoint.post("BattlesControllerCreateBattle", "/battles", {
    payload: BattlesControllerCreateBattleRequestJson,
    success: BattlesControllerCreateBattle201.pipe(HttpApiSchema.status(201)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_createBattle")
    .annotate(OpenApi.Summary, "Create a battle"),
  HttpApiEndpoint.get("BattlesControllerGetDashboardBattles", "/battles/@me", {
    query: BattlesControllerGetDashboardBattlesQuery,
    success: BattlesControllerGetDashboardBattles200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getDashboardBattles")
    .annotate(OpenApi.Summary, "Get authenticated user battles"),
  HttpApiEndpoint.get(
    "BattlesControllerGetUserCharacters",
    "/battles/@me/characters",
    { success: BattlesControllerGetUserCharacters200 },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getUserCharacters")
    .annotate(OpenApi.Summary, "Get authenticated user battle characters"),
  HttpApiEndpoint.get(
    "BattlesControllerGetBattleAnalytics",
    "/battles/@me/analytics",
    {
      query: BattlesControllerGetBattleAnalyticsQuery,
      success: BattlesControllerGetBattleAnalytics200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getBattleAnalytics")
    .annotate(OpenApi.Summary, "Get authenticated user battle analytics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetAbyssSeasons",
    "/battles/@me/abyss/seasons",
    {
      query: BattlesControllerGetAbyssSeasonsQuery,
      success: BattlesControllerGetAbyssSeasons200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getAbyssSeasons")
    .annotate(OpenApi.Summary, "Get authenticated user Abyss seasons"),
  HttpApiEndpoint.get(
    "BattlesControllerGetCombatProfile",
    "/battles/@me/statistics/combat-profile",
    {
      query: BattlesControllerGetCombatProfileQuery,
      success: BattlesControllerGetCombatProfile200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getCombatProfile")
    .annotate(OpenApi.Summary, "Get combat profile statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetProfessionWinRate",
    "/battles/@me/statistics/profession-win-rate",
    {
      query: BattlesControllerGetProfessionWinRateQuery,
      success: BattlesControllerGetProfessionWinRate200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getProfessionWinRate")
    .annotate(OpenApi.Summary, "Get profession win rate statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetHeadToHead",
    "/battles/@me/statistics/head-to-head",
    {
      query: BattlesControllerGetHeadToHeadQuery,
      success: BattlesControllerGetHeadToHead200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getHeadToHead")
    .annotate(OpenApi.Summary, "Get head-to-head statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetCurrentStreak",
    "/battles/@me/statistics/streak",
    {
      query: BattlesControllerGetCurrentStreakQuery,
      success: BattlesControllerGetCurrentStreak200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getCurrentStreak")
    .annotate(OpenApi.Summary, "Get current battle streak statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetBattleDuration",
    "/battles/@me/statistics/duration",
    {
      query: BattlesControllerGetBattleDurationQuery,
      success: BattlesControllerGetBattleDuration200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getBattleDuration")
    .annotate(OpenApi.Summary, "Get battle duration statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetPhGrowth",
    "/battles/@me/statistics/ph-growth",
    {
      query: BattlesControllerGetPhGrowthQuery,
      success: BattlesControllerGetPhGrowth200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getPhGrowth")
    .annotate(OpenApi.Summary, "Get PH growth statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetRatingGrowth",
    "/battles/@me/statistics/rating-growth",
    {
      query: BattlesControllerGetRatingGrowthQuery,
      success: BattlesControllerGetRatingGrowth200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getRatingGrowth")
    .annotate(OpenApi.Summary, "Get rating growth statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetRatingDeltaByOpponent",
    "/battles/@me/statistics/rating-delta-by-opponent",
    {
      query: BattlesControllerGetRatingDeltaByOpponentQuery,
      success: BattlesControllerGetRatingDeltaByOpponent200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getRatingDeltaByOpponent")
    .annotate(OpenApi.Summary, "Get rating delta by opponent statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetPlayerVsPlayerBattles",
    "/battles/@me/statistics/player-vs-player",
    {
      query: BattlesControllerGetPlayerVsPlayerBattlesQuery,
      success: BattlesControllerGetPlayerVsPlayerBattles200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getPlayerVsPlayerBattles")
    .annotate(OpenApi.Summary, "Get player-vs-player battles"),
  HttpApiEndpoint.get(
    "BattlesControllerSearchWarriors",
    "/battles/@me/warriors/search",
    {
      query: BattlesControllerSearchWarriorsQuery,
      success: BattlesControllerSearchWarriors200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_searchWarriors")
    .annotate(OpenApi.Summary, "Search warriors for authenticated user"),
  HttpApiEndpoint.get("BattlesControllerGetUserWorlds", "/battles/@me/worlds", {
    success: BattlesControllerGetUserWorlds200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getUserWorlds")
    .annotate(OpenApi.Summary, "Get worlds used by authenticated user battles"),
  HttpApiEndpoint.get(
    "BattlesControllerGetBattleTimeline",
    "/battles/:battleId/timeline",
    {
      params: BattlesControllerGetBattleTimelinePathParams,
      success: BattlesControllerGetBattleTimeline200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getBattleTimeline")
    .annotate(OpenApi.Summary, "Get computed battle timeline"),
  HttpApiEndpoint.get("BattlesControllerGetBattle", "/battles/:battleId", {
    params: BattlesControllerGetBattlePathParams,
    success: BattlesControllerGetBattle200,
    error: HttpApiSchema.Empty(404),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getBattle")
    .annotate(OpenApi.Summary, "Get a single battle"),
  HttpApiEndpoint.delete(
    "BattlesControllerDeleteBattle",
    "/battles/:battleId",
    {
      params: BattlesControllerDeleteBattlePathParams,
      success: BattlesControllerDeleteBattle200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_deleteBattle")
    .annotate(OpenApi.Summary, "Delete a battle"),
  HttpApiEndpoint.patch("BattlesControllerUpdateBattle", "/battles/:battleId", {
    params: BattlesControllerUpdateBattlePathParams,
    payload: BattlesControllerUpdateBattleRequestJson,
    success: BattlesControllerUpdateBattle200,
    error: HttpApiSchema.Empty(404),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_updateBattle")
    .annotate(OpenApi.Summary, "Update battle visibility"),
  HttpApiEndpoint.get(
    "BattlesControllerGetBattleRawData",
    "/battles/:battleId/raw",
    {
      params: BattlesControllerGetBattleRawDataPathParams,
      success: BattlesControllerGetBattleRawData200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getBattleRawData")
    .annotate(OpenApi.Summary, "Get raw battle payload"),
) {}
