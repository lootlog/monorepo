import { OpenAPIHono, z } from "@hono/zod-openapi";
import { Permission } from "@lootlog/types";
import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "../../lib/hono.types.js";
import { requireAuth } from "../../lib/middleware/auth.middleware.js";
import type { PermissionsService } from "../../permissions/permissions-service.js";
import { requireGuildPermission } from "../../permissions/permissions.middleware.js";
import type { ActivityQuery } from "../activity-query.js";
import type { ActivityStore } from "../activity-store.js";

export type ActivityRoutesDependencies = {
  activityQuery: ActivityQuery;
  activityStore: ActivityStore;
  permissionsService: PermissionsService;
};

export const guildIdParamsSchema = z.object({
  guildId: z.string().openapi({
    param: {
      name: "guildId",
      in: "path",
    },
  }),
});

export const guildUserParamsSchema = guildIdParamsSchema.extend({
  userId: z.string().openapi({
    param: {
      name: "userId",
      in: "path",
    },
  }),
});

export const guildActivityParamsSchema = guildIdParamsSchema.extend({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
  }),
});

export const errorResponseSchema = z.object({
  message: z.string(),
});

export function createActivityRouteGroup() {
  return new OpenAPIHono<{
    Variables: AppVariables;
  }>({ strict: false });
}

export function createGuildPermissionMiddleware(
  permissionsService: PermissionsService,
  requiredPermissions: Permission[],
): MiddlewareHandler[] {
  return [
    requireAuth,
    requireGuildPermission(permissionsService, requiredPermissions),
  ];
}
