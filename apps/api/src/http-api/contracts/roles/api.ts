/** Endpoints owned by the roles HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  RolesControllerGetGuildRoles200,
  RolesControllerGetGuildRolesPathParams,
  RolesControllerUpdateGuildRole200,
  RolesControllerUpdateGuildRolePathParams,
  RolesControllerUpdateGuildRoleRequestJson,
} from "./schemas.js";

export class RolesGroup extends HttpApiGroup.make("roles").add(
  HttpApiEndpoint.get(
    "RolesControllerGetGuildRoles",
    "/guilds/:guildId/roles",
    {
      params: RolesControllerGetGuildRolesPathParams,
      success: RolesControllerGetGuildRoles200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "RolesController_getGuildRoles")
    .annotate(OpenApi.Summary, "Get guild roles")
    .annotate(OpenApi.Description, "Retrieve all roles for a guild"),
  HttpApiEndpoint.patch(
    "RolesControllerUpdateGuildRole",
    "/guilds/:guildId/roles/:roleId/permissions",
    {
      params: RolesControllerUpdateGuildRolePathParams,
      payload: RolesControllerUpdateGuildRoleRequestJson,
      success: RolesControllerUpdateGuildRole200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "RolesController_updateGuildRole")
    .annotate(OpenApi.Summary, "Update role permissions")
    .annotate(OpenApi.Description, "Update permissions for a specific role"),
) {}
