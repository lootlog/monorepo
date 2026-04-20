import { createRoute } from "@hono/zod-openapi";
import { requireAuth } from "../../lib/middleware/auth.middleware.js";
import {
  createBattleResponseSchema,
  getBattleCharactersResponseSchema,
  getBattlesResponseSchema,
  getUserWorldsResponseSchema,
  searchWarriorsResponseSchema,
} from "../schemas/battle-response.schema.js";
import {
  createBattleSchema,
  type CreateBattleInput,
} from "../schemas/create-battle.schema.js";
import {
  queryBattlesSchema,
  type QueryBattlesQuery,
} from "../schemas/query-battles.schema.js";
import {
  createBattleRouteGroup,
  errorResponseSchema,
  searchWarriorsQuerySchema,
  type BattleRoutesDependencies,
} from "./route-helpers.js";

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

export function createMyBattlesRoutes({
  battleStore,
}: Pick<BattleRoutesDependencies, "battleStore">) {
  const routes = createBattleRouteGroup();

  routes.use("*", requireAuth);

  routes.openapi(createBattleRoute, async (c) => {
    const payload = c.req.valid("json") as CreateBattleInput;
    return c.json(
      await battleStore.createBattle({
        data: payload,
        userId: c.var.userId!,
      }),
      200,
    );
  });

  routes.openapi(getDashboardBattlesRoute, async (c) => {
    const query = c.req.valid("query") as QueryBattlesQuery;
    return c.json(
      (await battleStore.getDashboardBattles(query, c.var.userId!)) as never,
      200,
    );
  });

  routes.openapi(getUserCharactersRoute, async (c) => {
    return c.json(await battleStore.getUserCharacters(c.var.userId!), 200);
  });

  routes.openapi(searchWarriorsRoute, async (c) => {
    const query = c.req.valid("query").q ?? "";
    return c.json(await battleStore.searchWarriors(query, c.var.userId!), 200);
  });

  routes.openapi(getUserWorldsRoute, async (c) => {
    return c.json(await battleStore.getUserWorlds(c.var.userId!), 200);
  });

  return routes;
}
