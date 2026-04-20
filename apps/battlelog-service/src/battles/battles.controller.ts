import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { validator } from "hono/validator";
import type { AppVariables } from "../lib/hono.types.js";
import {
  battleSchema,
  createBattleResponseSchema,
  deleteBattleResponseSchema,
  getBattleCharactersResponseSchema,
  getBattlesResponseSchema,
  getUserWorldsResponseSchema,
  rawBattleResponseSchema,
  searchWarriorsResponseSchema,
} from "./dto/battle-response.dto.js";
import {
  battleDurationStatsSchema,
  headToHeadPaginatedResponseSchema,
  phGrowthDataPointSchema,
  playerVsPlayerPaginatedResponseSchema,
  professionWinRateSchema,
  ratingDeltaByOpponentSchema,
  ratingGrowthDataPointSchema,
  streakSchema,
} from "./dto/battle-statistics-response.dto.js";
import {
  type CreateBattleDto,
  createBattleSchema,
} from "./dto/create-battle.dto.js";
import {
  type QueryBattleAnalyticsDto,
  queryBattleAnalyticsSchema,
} from "./dto/query-battle-analytics.dto.js";
import {
  type QueryBattleStatisticsDto,
  type QueryPlayerVsPlayerDto,
  queryBattleStatisticsSchema,
  queryPlayerVsPlayerSchema,
} from "./dto/query-battle-statistics.dto.js";
import {
  type QueryBattlesDto,
  queryBattlesSchema,
} from "./dto/query-battles.dto.js";
import {
  type UpdateBattleDto,
  updateBattleSchema,
} from "./dto/update-battle.dto.js";
import { ForbiddenError, NotFoundError } from "../lib/errors/http-errors.js";
import { requireAuth } from "../lib/middleware/auth.middleware.js";
import { BattlesService } from "./battles.service.js";
import { BattleAnalyticsService } from "./services/battle-analytics.service.js";
import { DrizzleService } from "../shared/modules/drizzle/drizzle.service.js";

const battleIdParamsSchema = z.object({
  battleId: z.string(),
});

const searchWarriorsQuerySchema = z.object({
  q: z.string().optional(),
});

const battleAnalyticsResponseSchema = z.object({
  totalBattles: z.number(),
  wins: z.number(),
  losses: z.number(),
  winRatio: z.number(),
  totalPH: z.number(),
});

const errorResponseSchema = z.object({
  message: z.string(),
});

type BattleRouteDependencies = {
  battlesService: BattlesService;
  battleAnalyticsService: BattleAnalyticsService;
  drizzleService: DrizzleService;
};

const ensureBattleAccess = (drizzleService: DrizzleService) =>
  validator("param", async (value, c) => {
    const { battleId } = battleIdParamsSchema.parse(value);
    const userId = c.var.userId;

    if (!userId) {
      throw new ForbiddenError("User not authenticated");
    }

    const battle = await drizzleService.db.query.battles.findFirst({
      where: { id: battleId },
      columns: { public: true, userId: true },
    });

    if (!battle) {
      throw new NotFoundError(`Battle with ID ${battleId} not found`);
    }

    if (!battle.public && battle.userId !== userId) {
      throw new ForbiddenError(
        "Access denied: Battle is private and you are not the owner",
      );
    }

    return value;
  });

const ensureBattleOwner = (drizzleService: DrizzleService) =>
  validator("param", async (value, c) => {
    const { battleId } = battleIdParamsSchema.parse(value);
    const userId = c.var.userId;

    if (!userId) {
      throw new ForbiddenError("User not authenticated");
    }

    const battle = await drizzleService.db.query.battles.findFirst({
      where: { id: battleId },
      columns: { userId: true },
    });

    if (!battle) {
      throw new NotFoundError(`Battle with ID ${battleId} not found`);
    }

    if (battle.userId !== userId) {
      throw new ForbiddenError("You can only modify your own battles");
    }

    return value;
  });

const createBattleRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Battles"],
  summary: "Create a battle log entry",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createBattleSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: createBattleResponseSchema,
        },
      },
      description: "Created battle identifier",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Missing auth headers",
    },
  },
});

const getDashboardBattlesRoute = createRoute({
  method: "get",
  path: "/@me",
  tags: ["Battles"],
  summary: "Get the authenticated user's battles",
  request: {
    query: queryBattlesSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: getBattlesResponseSchema,
        },
      },
      description: "Paginated battles list",
    },
  },
});

const getUserCharactersRoute = createRoute({
  method: "get",
  path: "/@me/characters",
  tags: ["Battles"],
  summary: "Get known characters for the authenticated user",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: getBattleCharactersResponseSchema,
        },
      },
      description: "Known user characters",
    },
  },
});

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
          schema: battleAnalyticsResponseSchema,
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

const searchWarriorsRoute = createRoute({
  method: "get",
  path: "/@me/warriors/search",
  tags: ["Battles"],
  summary: "Search warriors by name for the authenticated user",
  request: {
    query: searchWarriorsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: searchWarriorsResponseSchema,
        },
      },
      description: "Matching warriors",
    },
  },
});

const getUserWorldsRoute = createRoute({
  method: "get",
  path: "/@me/worlds",
  tags: ["Battles"],
  summary: "Get worlds used by the authenticated user",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: getUserWorldsResponseSchema,
        },
      },
      description: "Known user worlds",
    },
  },
});

const getBattleRoute = createRoute({
  method: "get",
  path: "/{battleId}",
  tags: ["Battles"],
  summary: "Get a battle by id",
  request: {
    params: battleIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: battleSchema,
        },
      },
      description: "Battle details",
    },
  },
});

const getBattleRawRoute = createRoute({
  method: "get",
  path: "/{battleId}/raw",
  tags: ["Battles"],
  summary: "Get raw battle payload by id",
  request: {
    params: battleIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: rawBattleResponseSchema,
        },
      },
      description: "Raw battle payload",
    },
  },
});

const updateBattleRoute = createRoute({
  method: "patch",
  path: "/{battleId}",
  tags: ["Battles"],
  summary: "Update a battle",
  request: {
    params: battleIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: updateBattleSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: battleSchema,
        },
      },
      description: "Updated battle",
    },
  },
});

const deleteBattleRoute = createRoute({
  method: "delete",
  path: "/{battleId}",
  tags: ["Battles"],
  summary: "Delete a battle",
  request: {
    params: battleIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: deleteBattleResponseSchema,
        },
      },
      description: "Deletion result",
    },
  },
});

const getPublicBattleRoute = createRoute({
  method: "get",
  path: "/public/{battleId}",
  tags: ["Public Battles"],
  summary: "Get a public battle by id",
  request: {
    params: battleIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: battleSchema,
        },
      },
      description: "Public battle details",
    },
  },
});

const getPublicBattleRawRoute = createRoute({
  method: "get",
  path: "/public/{battleId}/raw",
  tags: ["Public Battles"],
  summary: "Get a public raw battle payload by id",
  request: {
    params: battleIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: rawBattleResponseSchema,
        },
      },
      description: "Public raw battle payload",
    },
  },
});

export function createBattlesController({
  battlesService,
  battleAnalyticsService,
  drizzleService,
}: BattleRouteDependencies) {
  const battles = new OpenAPIHono<{
    Variables: AppVariables;
  }>({ strict: false });

  battles.openapi(getPublicBattleRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    return c.json(
      (await battlesService.getPublicBattle(battleId)) as never,
      200,
    );
  });

  battles.openapi(getPublicBattleRawRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    return c.json(await battlesService.getPublicBattleRaw(battleId), 200);
  });

  battles.use("*", requireAuth);

  battles.openapi(createBattleRoute, async (c) => {
    const payload = c.req.valid("json") as CreateBattleDto;
    return c.json(
      await battlesService.createBattle({
        data: payload,
        userId: c.var.userId!,
      }),
      200,
    );
  });

  battles.openapi(getDashboardBattlesRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattlesDto;
    return c.json(
      (await battlesService.getDashboardBattles(query, c.var.userId!)) as never,
      200,
    );
  });

  battles.openapi(getUserCharactersRoute, async (c) => {
    return c.json(await battlesService.getUserCharacters(c.var.userId!), 200);
  });

  battles.openapi(getBattleAnalyticsRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleAnalyticsDto;
    return c.json(
      await battleAnalyticsService.getBattleAnalytics(query, c.var.userId!),
      200,
    );
  });

  battles.openapi(professionWinRateRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsDto;
    return c.json(
      await battleAnalyticsService.calculateProfessionWinRate(
        query,
        c.var.userId!,
      ),
      200,
    );
  });

  battles.openapi(headToHeadRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsDto;
    return c.json(
      await battleAnalyticsService.getHeadToHead(query, c.var.userId!),
      200,
    );
  });

  battles.openapi(streakRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsDto;
    return c.json(
      await battleAnalyticsService.getCurrentStreak(query, c.var.userId!),
      200,
    );
  });

  battles.openapi(durationRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsDto;
    return c.json(
      await battleAnalyticsService.getBattleDurationStats(query, c.var.userId!),
      200,
    );
  });

  battles.openapi(phGrowthRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsDto;
    return c.json(
      await battleAnalyticsService.getPhGrowthTimeSeries(query, c.var.userId!),
      200,
    );
  });

  battles.openapi(ratingGrowthRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsDto;
    return c.json(
      await battleAnalyticsService.getRatingGrowthTimeSeries(
        query,
        c.var.userId!,
      ),
      200,
    );
  });

  battles.openapi(ratingDeltaByOpponentRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattleStatisticsDto;
    return c.json(
      await battleAnalyticsService.getRatingDeltaByOpponent(
        query,
        c.var.userId!,
      ),
      200,
    );
  });

  battles.openapi(playerVsPlayerRoute, async (c) => {
    const query = c.req.valid("query") as QueryPlayerVsPlayerDto;
    return c.json(
      await battleAnalyticsService.getPlayerVsPlayerBattles(
        query,
        c.var.userId!,
      ),
      200,
    );
  });

  battles.openapi(searchWarriorsRoute, async (c) => {
    const query = c.req.valid("query").q ?? "";
    return c.json(
      await battlesService.searchWarriors(query, c.var.userId!),
      200,
    );
  });

  battles.openapi(getUserWorldsRoute, async (c) => {
    return c.json(await battlesService.getUserWorlds(c.var.userId!), 200);
  });

  battles.use("/:battleId", ensureBattleAccess(drizzleService));
  battles.use("/:battleId/raw", ensureBattleAccess(drizzleService));
  battles.use("/:battleId", async (c, next) =>
    c.req.method === "PATCH" || c.req.method === "DELETE"
      ? ensureBattleOwner(drizzleService)(c, next)
      : next(),
  );

  battles.openapi(getBattleRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    return c.json(
      (await battlesService.getBattleFromDatabase(battleId)) as never,
      200,
    );
  });

  battles.openapi(getBattleRawRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    return c.json(await battlesService.getBattleRawData(battleId), 200);
  });

  battles.openapi(updateBattleRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    const payload = c.req.valid("json") as UpdateBattleDto;
    return c.json(
      (await battlesService.updateBattle(battleId, payload)) as never,
      200,
    );
  });

  battles.openapi(deleteBattleRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    return c.json(await battlesService.deleteBattle(battleId), 200);
  });

  return battles;
}
