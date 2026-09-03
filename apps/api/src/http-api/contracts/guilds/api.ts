/** Endpoints owned by the guilds HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  GuildsControllerGetGuildById200,
  GuildsControllerGetGuildByIdPathParams,
  GuildsControllerGetGuildConfig200,
  GuildsControllerGetGuildConfigPathParams,
  GuildsControllerGetGuildDiscordSyncStatus200,
  GuildsControllerGetGuildDiscordSyncStatusPathParams,
  GuildsControllerGetGuildPermissions200,
  GuildsControllerGetGuildPermissionsPathParams,
  GuildsControllerGetManageableUserGuilds200,
  GuildsControllerGetUserGuilds200,
  GuildsControllerGetUserGuildsQuery,
  GuildsControllerGetUserGuildsWithPermissions200,
  GuildsControllerGetWorldsByGuildId200,
  GuildsControllerGetWorldsByGuildIdPathParams,
  GuildsControllerRefreshGuildDiscordSync201,
  GuildsControllerRefreshGuildDiscordSyncPathParams,
  GuildsControllerUpdateGuildConfig200,
  GuildsControllerUpdateGuildConfigPathParams,
  GuildsControllerUpdateGuildConfigRequestJson,
} from "./schemas.js";

export class GuildsGroup extends HttpApiGroup.make("guilds").add(
  HttpApiEndpoint.get("GuildsControllerGetUserGuilds", "/guilds/@me", {
    query: GuildsControllerGetUserGuildsQuery,
    success: GuildsControllerGetUserGuilds200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GuildsController_getUserGuilds")
    .annotate(OpenApi.Summary, "Get user guilds (deprecated)")
    .annotate(
      OpenApi.Description,
      "Legacy endpoint for listing the authenticated user's guilds. Prefer /users/@me/guilds or /users/@me/guilds/accessible.",
    )
    .annotate(OpenApi.Deprecated, true),
  HttpApiEndpoint.get(
    "GuildsControllerGetUserGuildsWithPermissions",
    "/guilds/@me/permissions",
    { success: GuildsControllerGetUserGuildsWithPermissions200 },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "GuildsController_getUserGuildsWithPermissions",
    )
    .annotate(OpenApi.Summary, "Get user guilds with permissions (deprecated)")
    .annotate(
      OpenApi.Description,
      "Legacy endpoint for listing the authenticated user's accessible guilds with role metadata. Prefer /users/@me/guilds for new integrations.",
    )
    .annotate(OpenApi.Deprecated, true),
  HttpApiEndpoint.get(
    "GuildsControllerGetManageableUserGuilds",
    "/guilds/@me/manageable",
    { success: GuildsControllerGetManageableUserGuilds200 },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GuildsController_getManageableUserGuilds")
    .annotate(OpenApi.Summary, "Get manageable user guilds")
    .annotate(
      OpenApi.Description,
      "Retrieve guilds where the authenticated user has Discord administrator permissions",
    ),
  HttpApiEndpoint.get("GuildsControllerGetGuildById", "/guilds/:guildId", {
    params: GuildsControllerGetGuildByIdPathParams,
    success: GuildsControllerGetGuildById200,
    error: HttpApiSchema.Empty(403),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GuildsController_getGuildById")
    .annotate(OpenApi.Summary, "Get guild by ID")
    .annotate(OpenApi.Description, "Retrieve guild information by guild ID"),
  HttpApiEndpoint.get(
    "GuildsControllerGetGuildConfig",
    "/guilds/:guildId/config",
    {
      params: GuildsControllerGetGuildConfigPathParams,
      success: GuildsControllerGetGuildConfig200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GuildsController_getGuildConfig"),
  HttpApiEndpoint.patch(
    "GuildsControllerUpdateGuildConfig",
    "/guilds/:guildId/config",
    {
      params: GuildsControllerUpdateGuildConfigPathParams,
      payload: GuildsControllerUpdateGuildConfigRequestJson,
      success: GuildsControllerUpdateGuildConfig200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GuildsController_updateGuildConfig"),
  HttpApiEndpoint.get(
    "GuildsControllerGetWorldsByGuildId",
    "/guilds/:guildId/worlds",
    {
      params: GuildsControllerGetWorldsByGuildIdPathParams,
      success: GuildsControllerGetWorldsByGuildId200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GuildsController_getWorldsByGuildId")
    .annotate(OpenApi.Summary, "Get guild worlds")
    .annotate(
      OpenApi.Description,
      "Retrieve the list of worlds configured for a guild",
    ),
  HttpApiEndpoint.get(
    "GuildsControllerGetGuildPermissions",
    "/guilds/:guildId/permissions",
    {
      params: GuildsControllerGetGuildPermissionsPathParams,
      success: GuildsControllerGetGuildPermissions200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GuildsController_getGuildPermissions")
    .annotate(OpenApi.Summary, "Get guild permissions")
    .annotate(
      OpenApi.Description,
      "Retrieve resolved permissions for the current member in a guild",
    ),
  HttpApiEndpoint.get(
    "GuildsControllerGetGuildDiscordSyncStatus",
    "/guilds/:guildId/discord-sync",
    {
      params: GuildsControllerGetGuildDiscordSyncStatusPathParams,
      success: GuildsControllerGetGuildDiscordSyncStatus200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GuildsController_getGuildDiscordSyncStatus")
    .annotate(OpenApi.Summary, "Get guild Discord sync status")
    .annotate(
      OpenApi.Description,
      "Retrieve the current Discord channel synchronization state for a guild",
    ),
  HttpApiEndpoint.post(
    "GuildsControllerRefreshGuildDiscordSync",
    "/guilds/:guildId/discord-sync/refresh",
    {
      params: GuildsControllerRefreshGuildDiscordSyncPathParams,
      success: GuildsControllerRefreshGuildDiscordSync201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GuildsController_refreshGuildDiscordSync")
    .annotate(OpenApi.Summary, "Refresh guild Discord sync")
    .annotate(
      OpenApi.Description,
      "Trigger a refresh of the guild Discord channel synchronization state",
    ),
) {}
