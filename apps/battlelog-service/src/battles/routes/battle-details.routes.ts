import { createRoute } from "@hono/zod-openapi";
import { requireAuth } from "../../lib/middleware/auth.middleware.js";
import {
  battleSchema,
  deleteBattleResponseSchema,
  rawBattleResponseSchema,
} from "../schemas/battle-response.schema.js";
import {
  type UpdateBattleInput,
  updateBattleSchema,
} from "../schemas/update-battle.schema.js";
import {
  battleIdParamsSchema,
  createBattleRouteGroup,
  ensureBattleAccess,
  ensureBattleOwner,
  type BattleRoutesDependencies,
} from "./route-helpers.js";

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

export function createBattleDetailsRoutes({
  battleStore,
  drizzleDatabase,
}: Pick<BattleRoutesDependencies, "battleStore" | "drizzleDatabase">) {
  const routes = createBattleRouteGroup();

  routes.use("*", requireAuth);
  routes.use("/:battleId", ensureBattleAccess(drizzleDatabase));
  routes.use("/:battleId/raw", ensureBattleAccess(drizzleDatabase));
  routes.use("/:battleId", async (c, next) =>
    c.req.method === "PATCH" || c.req.method === "DELETE"
      ? ensureBattleOwner(drizzleDatabase)(c, next)
      : next(),
  );

  routes.openapi(getBattleRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    return c.json((await battleStore.getBattleFromDatabase(battleId)) as never, 200);
  });

  routes.openapi(getBattleRawRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    return c.json(await battleStore.getBattleRawData(battleId), 200);
  });

  routes.openapi(updateBattleRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    const payload = c.req.valid("json") as UpdateBattleInput;
    return c.json((await battleStore.updateBattle(battleId, payload)) as never, 200);
  });

  routes.openapi(deleteBattleRoute, async (c) => {
    const { battleId } = c.req.valid("param");
    return c.json(await battleStore.deleteBattle(battleId), 200);
  });

  return routes;
}
