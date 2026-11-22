import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import {
  RolesResponse,
  RoleOrganizationPath,
  RoleResponse,
  RolePath,
  UpdateRolePermissionsRequest,
} from "./schemas.js";

export class RolesGroup extends HttpApiGroup.make("roles").add(
  HttpApiEndpoint.get(
    "RolesControllerGetGuildRoles",
    "/guilds/:guildId/roles",
    {
      params: RoleOrganizationPath,
      success: RolesResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
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
      params: RolePath,
      payload: UpdateRolePermissionsRequest,
      success: RoleResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "RolesController_updateGuildRole")
    .annotate(OpenApi.Summary, "Update role permissions")
    .annotate(OpenApi.Description, "Update permissions for a specific role"),
) {}
