/** Endpoints owned by the internal HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { OrganizationSummary } from "#src/contracts/shared";
import { HttpErrorResponse } from "../shared.js";
import {
  InternalMemberIdentityPath,
  InternalMemberIdentityResponse,
  OrganizationLookupPath,
  InternalUserPermissionsResponse,
  InternalUserPermissionsQuery,
} from "#src/contracts/internal/schemas";

export class InternalGroup extends HttpApiGroup.make("internal").add(
  HttpApiEndpoint.get(
    "GuildsInternalControllerGetUserPermissions",
    "/internal/guilds/user-permissions",
    {
      query: InternalUserPermissionsQuery,
      success: InternalUserPermissionsResponse,
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
      params: OrganizationLookupPath,
      success: OrganizationSummary,
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
  HttpApiEndpoint.get(
    "GuildsInternalControllerGetMemberIdentity",
    "/internal/guilds/:guildId/members/:discordId/identity",
    {
      params: InternalMemberIdentityPath,
      success: InternalMemberIdentityResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .annotate(OpenApi.Identifier, "GuildsInternalController_getMemberIdentity")
    .annotate(OpenApi.Summary, "[Internal] Resolve an active member's User")
    .annotate(
      OpenApi.Description,
      "Internal endpoint for the Discord bot to resolve the Lootlog User behind an active member's Discord identity in a guild.",
    ),
) {}
