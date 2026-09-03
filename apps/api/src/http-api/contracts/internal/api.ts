/** Endpoints owned by the internal HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  GuildsInternalControllerGetGuildByIdOrVanityUrl200,
  GuildsInternalControllerGetGuildByIdOrVanityUrlPathParams,
  GuildsInternalControllerGetUserPermissions200,
  GuildsInternalControllerGetUserPermissionsQuery,
} from "./schemas.js";

export class InternalGroup extends HttpApiGroup.make("internal").add(
  HttpApiEndpoint.get(
    "GuildsInternalControllerGetUserPermissions",
    "/internal/guilds/user-permissions",
    {
      query: GuildsInternalControllerGetUserPermissionsQuery,
      success: GuildsInternalControllerGetUserPermissions200,
    },
  )
    .annotate(OpenApi.Identifier, "GuildsInternalController_getUserPermissions")
    .annotate(OpenApi.Summary, "[Internal] Get user guilds with permissions")
    .annotate(
      OpenApi.Description,
      "Internal endpoint for gateway service to retrieve user guilds with permissions. Does not require authentication.",
    ),
  HttpApiEndpoint.get(
    "GuildsInternalControllerGetGuildByIdOrVanityUrl",
    "/internal/guilds/:idOrVanityUrl",
    {
      params: GuildsInternalControllerGetGuildByIdOrVanityUrlPathParams,
      success: GuildsInternalControllerGetGuildByIdOrVanityUrl200,
    },
  )
    .annotate(
      OpenApi.Identifier,
      "GuildsInternalController_getGuildByIdOrVanityUrl",
    )
    .annotate(OpenApi.Summary, "[Internal] Get guild by ID or vanity URL")
    .annotate(
      OpenApi.Description,
      "Internal endpoint for services that need to resolve a guild identifier to its canonical guild data.",
    ),
) {}
