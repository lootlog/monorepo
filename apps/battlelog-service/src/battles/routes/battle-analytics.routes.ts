import { createRoute, z } from "@hono/zod-openapi";
import { requireAuth } from "../../lib/middleware/auth.middleware.js";
import {
  battleDurationStatsSchema,
  headToHeadPaginatedResponseSchema,
  phGrowthDataPointSchema,
  playerVsPlayerPaginatedResponseSchema,
  professionWinRateSchema,
  ratingDeltaByOpponentSchema,
  ratingGrowthDataPointSchema,
  streakSchema,
} from "../schemas/battle-statistics-response.schema.js";
import {
  queryBattleAnalyticsSchema,
  type QueryBattleAnalyticsQuery,
} from "../schemas/query-battle-analytics.schema.js";
import {
  queryBattleStatisticsSchema,
  queryPlayerVsPlayerSchema,
  type QueryBattleStatisticsQuery,
  type QueryPlayerVsPlayerQuery,
} from "../schemas/query-battle-statistics.schema.js";
import {
  battleAnalyticsSummarySchema,
  createBattleRouteGroup,
  type BattleRoutesDependencies,
} from "./route-helpers.js";

const getBattleAnalyticsRoute = createRoute({
  method: "get",
  path: "/@me/analytics",
  tags: ["Battle Analytics"],
  summary: "Get aggregated battle analytics",
  request: {
    query: queryBattleAnalyticsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: battleAnalyticsSummarySchema,
        },
      },
      description: "Battle analytics summary",
    },
  },
});

const professionWinRateRoute = createRoute({
  method: "get",
  path: "/@me/statistics/profession-win-rate",
  tags: ["Battle Statistics"],
  summary: "Get profession win rate statistics",
  request: {
    query: queryBattleStatisticsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(professionWinRateSchema),
        },
      },
      description: "Profession win rate entries",
    },
  },
});

const headToHeadRoute = createRoute({
  method: "get",
  path: "/@me/statistics/head-to-head",
  tags: ["Battle Statistics"],
  summary: "Get head-to-head battle statistics",
  request: {
    query: queryBattleStatisticsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: headToHeadPaginatedResponseSchema,
        },
      },
      description: "Head-to-head records",
    },
  },
});

const streakRoute = createRoute({
  method: "get",
  path: "/@me/statistics/streak",
  tags: ["Battle Statistics"],
  summary: "Get current and longest streaks",
  request: {
    query: queryBattleStatisticsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: streakSchema,
        },
      },
      description: "Streak statistics",
    },
  },
});

const durationRoute = createRoute({
  method: "get",
  path: "/@me/statistics/duration",
  tags: ["Battle Statistics"],
  summary: "Get duration statistics",
  request: {
    query: queryBattleStatisticsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: battleDurationStatsSchema,
        },
      },
      description: "Duration statistics",
    },
  },
});

const phGrowthRoute = createRoute({
  method: "get",
  path: "/@me/statistics/ph-growth",
  tags: ["Battle Statistics"],
  summary: "Get PH growth time series",
  request: {
    query: queryBattleStatisticsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(phGrowthDataPointSchema),
        },
      },
      description: "PH growth data points",
    },
  },
});

const ratingGrowthRoute = createRoute({
  method: "get",
  path: "/@me/statistics/rating-growth",
  tags: ["Battle Statistics"],
  summary: "Get rating growth time series",
  request: {
    query: queryBattleStatisticsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(ratingGrowthDataPointSchema),
        },
      },
      description: "Rating growth data points",
    },
  },
});

const ratingDeltaByOpponentRoute = createRoute({
  method: "get",
  path: "/@me/statistics/rating-delta-by-opponent",
  tags: ["Battle Statistics"],
  summary: "Get rating delta by opponent",
  request: {
    query: queryBattleStatisticsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(ratingDeltaByOpponentSchema),
        },
      },
      description: "Opponent rating delta entries",
    },
  },
});

const playerVsPlayerRoute = createRoute({
  method: "get",
  path: "/@me/statistics/player-vs-player",
  tags: ["Battle Statistics"],
  summary: "Get player-versus-player battles against a specific opponent",
  request: {
    query: queryPlayerVsPlayerSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: playerVsPlayerPaginatedResponseSchema,
        },
      },
      description: "Player-versus-player battle history",
    },
  },
});

export function createBattleAnalyticsRoutes({
  battleAnalytics,
}: Pick<BattleRoutesDependencies, "battleAnalytics">) {
  const routes = createBattleRouteGroup();

  routes.use("*", requireAuth);

  routes.openapi(getBattleAnalyticsRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleAnalyticsQuery;
    return c.json(
      await battleAnalytics.getBattleAnalytics(query, c.var.userId!),
      200,
    );
  });

  routes.openapi(professionWinRateRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsQuery;
    return c.json(
      await battleAnalytics.calculateProfessionWinRate(query, c.var.userId!),
      200,
    );
  });

  routes.openapi(headToHeadRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsQuery;
    return c.json(await battleAnalytics.getHeadToHead(query, c.var.userId!), 200);
  });

  routes.openapi(streakRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsQuery;
    return c.json(
      await battleAnalytics.getCurrentStreak(query, c.var.userId!),
      200,
    );
  });

  routes.openapi(durationRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsQuery;
    return c.json(
      await battleAnalytics.getBattleDurationStats(query, c.var.userId!),
      200,
    );
  });

  routes.openapi(phGrowthRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsQuery;
    return c.json(
      await battleAnalytics.getPhGrowthTimeSeries(query, c.var.userId!),
      200,
    );
  });

  routes.openapi(ratingGrowthRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsQuery;
    return c.json(
      await battleAnalytics.getRatingGrowthTimeSeries(query, c.var.userId!),
      200,
    );
  });

  routes.openapi(ratingDeltaByOpponentRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsQuery;
    return c.json(
      await battleAnalytics.getRatingDeltaByOpponent(query, c.var.userId!),
      200,
    );
  });

  routes.openapi(playerVsPlayerRoute, async (c) => {
    const query = c.req.valid("query") as QueryPlayerVsPlayerQuery;
    return c.json(
      await battleAnalytics.getPlayerVsPlayerBattles(query, c.var.userId!),
      200,
    );
  });

  return routes;
}
