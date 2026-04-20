import { createRoute } from "@hono/zod-openapi";
import { Permission } from "@lootlog/types";
import {
  actorNameSuggestionsResponseSchema,
  clanNameSuggestionsResponseSchema,
  worldSuggestionsResponseSchema,
} from "../schemas/activity-response.schema.js";
import {
  actorNameSuggestionsQuerySchema,
  clanNameSuggestionsQuerySchema,
  worldSuggestionsQuerySchema,
} from "../schemas/query-activities.schema.js";
import {
  createActivityRouteGroup,
  createGuildPermissionMiddleware,
  guildIdParamsSchema,
  type ActivityRoutesDependencies,
} from "./route-helpers.js";

const actorNameSuggestionsRoute = createRoute({
  method: "get",
  path: "/{guildId}/activity-logs/actor-name-suggestions",
  tags: ["Guild Activity"],
  summary: "Get actor name suggestions for a guild",
  request: {
    params: guildIdParamsSchema,
    query: actorNameSuggestionsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: actorNameSuggestionsResponseSchema,
        },
      },
      description: "Actor name suggestions",
    },
  },
});

const worldSuggestionsRoute = createRoute({
  method: "get",
  path: "/{guildId}/activity-logs/world-suggestions",
  tags: ["Guild Activity"],
  summary: "Get world suggestions for a guild",
  request: {
    params: guildIdParamsSchema,
    query: worldSuggestionsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: worldSuggestionsResponseSchema,
        },
      },
      description: "World suggestions",
    },
  },
});

const clanNameSuggestionsRoute = createRoute({
  method: "get",
  path: "/{guildId}/activity-logs/clan-name-suggestions",
  tags: ["Guild Activity"],
  summary: "Get clan name suggestions for a guild",
  request: {
    params: guildIdParamsSchema,
    query: clanNameSuggestionsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: clanNameSuggestionsResponseSchema,
        },
      },
      description: "Clan name suggestions",
    },
  },
});

export function createActivitySuggestionsRoutes({
  activityQuery,
  permissionsService,
}: Pick<ActivityRoutesDependencies, "activityQuery" | "permissionsService">) {
  const routes = createActivityRouteGroup();
  const adminMiddleware = createGuildPermissionMiddleware(permissionsService, [
    Permission.ADMIN,
  ]);

  routes.openapi(
    {
      ...actorNameSuggestionsRoute,
      middleware: adminMiddleware,
    },
    async (c) => {
      const query = actorNameSuggestionsQuerySchema.parse(c.req.query());
      const suggestions = await activityQuery.suggestActorNames(
        c.var.guildId!,
        query.search,
        query.limit,
      );

      return c.json({ suggestions }, 200);
    },
  );

  routes.openapi(
    {
      ...worldSuggestionsRoute,
      middleware: adminMiddleware,
    },
    async (c) => {
      const query = worldSuggestionsQuerySchema.parse(c.req.query());
      const worlds = await activityQuery.suggestWorlds(
        c.var.guildId!,
        query.search,
        query.limit,
      );

      return c.json({ worlds }, 200);
    },
  );

  routes.openapi(
    {
      ...clanNameSuggestionsRoute,
      middleware: adminMiddleware,
    },
    async (c) => {
      const query = clanNameSuggestionsQuerySchema.parse(c.req.query());
      const suggestions = await activityQuery.suggestClanNames(
        c.var.guildId!,
        query.search,
        query.limit,
      );

      return c.json({ suggestions }, 200);
    },
  );

  return routes;
}
