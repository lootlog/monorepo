import { createRoute } from "@hono/zod-openapi";
import {
  battleSchema,
  rawBattleResponseSchema,
} from "../schemas/battle-response.schema.js";
import {
  battleIdParamsSchema,
  createBattleRouteGroup,
  type BattleRoutesDependencies,
} from "./route-helpers.js";

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

export function createPublicBattlesRoutes({
  battleStore,
}: Pick<BattleRoutesDependencies, "battleStore">) {
  const routes = createBattleRouteGroup();

  routes.openapi(getPublicBattleRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    return c.json((await battleStore.getPublicBattle(battleId)) as never, 200);
  });

  routes.openapi(getPublicBattleRawRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    return c.json(await battleStore.getPublicBattleRaw(battleId), 200);
  });

  return routes;
}
