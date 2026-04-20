import { createRoute } from "@hono/zod-openapi";
import { Permission } from "@lootlog/types";
import { paginatedActivitiesResponseSchema } from "../schemas/activity-response.schema.js";
import { queryActivitiesSchema } from "../schemas/query-activities.schema.js";
import {
  createActivityRouteGroup,
  createGuildPermissionMiddleware,
  errorResponseSchema,
  guildIdParamsSchema,
  guildUserParamsSchema,
  type ActivityRoutesDependencies,
} from "./route-helpers.js";

const getGuildActivitiesRoute = createRoute({
  method: "get",
  path: "/{guildId}/activity-logs",
  tags: ["Guild Activity"],
  summary: "Get activities for a specific guild",
  request: {
    params: guildIdParamsSchema,
    query: queryActivitiesSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: paginatedActivitiesResponseSchema,
        },
      },
      description: "Paginated guild activities",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Unauthorized",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Forbidden",
    },
  },
});

const getUserActivitiesRoute = createRoute({
  method: "get",
  path: "/{guildId}/users/{userId}/activity-logs",
  tags: ["Guild Activity"],
  summary: "Get activities for a specific user in a guild",
  request: {
    params: guildUserParamsSchema,
    query: queryActivitiesSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: paginatedActivitiesResponseSchema,
        },
      },
      description: "Paginated user activities",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Unauthorized",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Forbidden",
    },
  },
});

export function createActivityListRoutes({
  activityQuery,
  permissionsService,
}: Pick<ActivityRoutesDependencies, "activityQuery" | "permissionsService">) {
  const routes = createActivityRouteGroup();
  const adminMiddleware = createGuildPermissionMiddleware(permissionsService, [
    Permission.ADMIN,
  ]);

  routes.openapi(
    {
      ...getGuildActivitiesRoute,
      middleware: adminMiddleware,
    },
    async (c) => {
      const query = queryActivitiesSchema.parse(c.req.query());
      return c.json(
        (await activityQuery.findByGuild(c.var.guildId!, query)) as never,
        200,
      );
    },
  );

  routes.openapi(
    {
      ...getUserActivitiesRoute,
      middleware: adminMiddleware,
    },
    async (c) => {
      const { userId } = guildUserParamsSchema.parse(c.req.param());
      const query = queryActivitiesSchema.parse(c.req.query());

      return c.json(
        (await activityQuery.findByUser(
          userId,
          c.var.guildId!,
          query,
        )) as never,
        200,
      );
    },
  );

  return routes;
}
