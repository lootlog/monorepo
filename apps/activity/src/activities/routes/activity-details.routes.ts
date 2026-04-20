import { createRoute } from "@hono/zod-openapi";
import { Permission } from "@lootlog/types";
import {
  activityResponseSchema,
  deleteActivityResponseSchema,
} from "../schemas/activity-response.schema.js";
import {
  createActivityRouteGroup,
  createGuildPermissionMiddleware,
  errorResponseSchema,
  guildActivityParamsSchema,
  type ActivityRoutesDependencies,
} from "./route-helpers.js";

const getActivityRoute = createRoute({
  method: "get",
  path: "/{guildId}/activity-logs/{id}",
  tags: ["Guild Activity"],
  summary: "Get a single activity by ID",
  request: {
    params: guildActivityParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: activityResponseSchema,
        },
      },
      description: "Activity details",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Activity not found",
    },
  },
});

const deleteActivityRoute = createRoute({
  method: "delete",
  path: "/{guildId}/activity-logs/{id}",
  tags: ["Guild Activity"],
  summary: "Delete a specific activity by ID",
  request: {
    params: guildActivityParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: deleteActivityResponseSchema,
        },
      },
      description: "Activity deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Activity not found",
    },
  },
});

export function createActivityDetailsRoutes({
  activityQuery,
  activityStore,
  permissionsService,
}: ActivityRoutesDependencies) {
  const routes = createActivityRouteGroup();

  routes.openapi(
    {
      ...getActivityRoute,
      middleware: createGuildPermissionMiddleware(permissionsService, [
        Permission.ADMIN,
      ]),
    },
    async (c) => {
      const { id } = guildActivityParamsSchema.parse(c.req.param());
      return c.json(
        (await activityQuery.findOne(id, c.var.guildId!)) as never,
        200,
      );
    },
  );

  routes.openapi(
    {
      ...deleteActivityRoute,
      middleware: createGuildPermissionMiddleware(permissionsService, [
        Permission.OWNER,
      ]),
    },
    async (c) => {
      const { id } = guildActivityParamsSchema.parse(c.req.param());
      const count = await activityStore.deleteOne(id, c.var.guildId!);
      return c.json({ count }, 200);
    },
  );

  return routes;
}
