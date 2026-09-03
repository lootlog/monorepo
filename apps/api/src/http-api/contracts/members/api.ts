/** Endpoints owned by the members HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  MembersControllerDeactivateMember200,
  MembersControllerDeactivateMemberPathParams,
  MembersControllerGetGuildMemberReferences200,
  MembersControllerGetGuildMemberReferencesPathParams,
  MembersControllerGetGuildMemberReferencesQuery,
  MembersControllerGetGuildMembers200,
  MembersControllerGetGuildMembersPathParams,
  MembersControllerGetGuildMembersQuery,
  MembersControllerGetGuildMembersSummary200,
  MembersControllerGetGuildMembersSummaryPathParams,
  MembersControllerGetLatestRefreshJob200,
  MembersControllerGetLatestRefreshJobPathParams,
  MembersControllerGetMe200,
  MembersControllerGetMePathParams,
  MembersControllerGetMemberLootlogConfigSummary200,
  MembersControllerGetMemberLootlogConfigSummaryPathParams,
  MembersControllerGetRefreshJobStatus200,
  MembersControllerGetRefreshJobStatusPathParams,
  MembersControllerRefreshAllMembers201,
  MembersControllerRefreshAllMembersPathParams,
  MembersControllerRefreshMe200,
  MembersControllerRefreshMePathParams,
  MembersControllerRefreshMember200,
  MembersControllerRefreshMemberPathParams,
} from "./schemas.js";

export class MembersGroup extends HttpApiGroup.make("members").add(
  HttpApiEndpoint.get(
    "MembersControllerGetMe",
    "/guilds/:guildId/members/@me",
    {
      params: MembersControllerGetMePathParams,
      success: MembersControllerGetMe200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_getMe")
    .annotate(OpenApi.Summary, "Get current member")
    .annotate(
      OpenApi.Description,
      "Retrieve the authenticated user's member information for this guild",
    ),
  HttpApiEndpoint.post(
    "MembersControllerRefreshMe",
    "/guilds/:guildId/members/@me/refresh",
    {
      params: MembersControllerRefreshMePathParams,
      success: MembersControllerRefreshMe200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_refreshMe")
    .annotate(OpenApi.Summary, "Refresh current member")
    .annotate(
      OpenApi.Description,
      "Refresh the authenticated user's member information from Discord",
    ),
  HttpApiEndpoint.post(
    "MembersControllerRefreshMember",
    "/guilds/:guildId/members/:discordId/refresh",
    {
      params: MembersControllerRefreshMemberPathParams,
      success: MembersControllerRefreshMember200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_refreshMember")
    .annotate(OpenApi.Summary, "Refresh specific member")
    .annotate(
      OpenApi.Description,
      "Refresh a specific member's information from Discord (admin only)",
    ),
  HttpApiEndpoint.patch(
    "MembersControllerDeactivateMember",
    "/guilds/:guildId/members/:discordId/deactivate",
    {
      params: MembersControllerDeactivateMemberPathParams,
      success: MembersControllerDeactivateMember200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_deactivateMember")
    .annotate(OpenApi.Summary, "Deactivate member")
    .annotate(OpenApi.Description, "Deactivate a specific member (admin only)"),
  HttpApiEndpoint.get(
    "MembersControllerGetMemberLootlogConfigSummary",
    "/guilds/:guildId/members/:discordId/lootlog-config-summary",
    {
      params: MembersControllerGetMemberLootlogConfigSummaryPathParams,
      success: MembersControllerGetMemberLootlogConfigSummary200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "MembersController_getMemberLootlogConfigSummary",
    )
    .annotate(OpenApi.Summary, "Get member lootlog config summary")
    .annotate(
      OpenApi.Description,
      "Retrieve guild-scoped lootlog configuration summary for a specific member (admin only)",
    ),
  HttpApiEndpoint.get(
    "MembersControllerGetGuildMembers",
    "/guilds/:guildId/members",
    {
      params: MembersControllerGetGuildMembersPathParams,
      query: MembersControllerGetGuildMembersQuery,
      success: MembersControllerGetGuildMembers200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_getGuildMembers")
    .annotate(OpenApi.Summary, "Get guild members")
    .annotate(OpenApi.Description, "Retrieve all members for a guild"),
  HttpApiEndpoint.get(
    "MembersControllerGetGuildMemberReferences",
    "/guilds/:guildId/members/references",
    {
      params: MembersControllerGetGuildMemberReferencesPathParams,
      query: MembersControllerGetGuildMemberReferencesQuery,
      success: MembersControllerGetGuildMemberReferences200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_getGuildMemberReferences")
    .annotate(OpenApi.Summary, "Get guild member references")
    .annotate(
      OpenApi.Description,
      "Retrieve limited member reference data for guild-scoped historical views",
    ),
  HttpApiEndpoint.get(
    "MembersControllerGetGuildMembersSummary",
    "/guilds/:guildId/members/summary",
    {
      params: MembersControllerGetGuildMembersSummaryPathParams,
      success: MembersControllerGetGuildMembersSummary200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_getGuildMembersSummary")
    .annotate(OpenApi.Summary, "Get guild members summary")
    .annotate(
      OpenApi.Description,
      "Retrieve lightweight active member data for game-client member lookups",
    ),
  HttpApiEndpoint.post(
    "MembersControllerRefreshAllMembers",
    "/guilds/:guildId/members/refresh-all",
    {
      params: MembersControllerRefreshAllMembersPathParams,
      success: MembersControllerRefreshAllMembers201.pipe(
        HttpApiSchema.status(201),
      ),
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_refreshAllMembers")
    .annotate(OpenApi.Summary, "Refresh all members")
    .annotate(
      OpenApi.Description,
      "Create a job to refresh all guild members (admin only)",
    ),
  HttpApiEndpoint.get(
    "MembersControllerGetLatestRefreshJob",
    "/guilds/:guildId/members/refresh-jobs/latest",
    {
      params: MembersControllerGetLatestRefreshJobPathParams,
      success: MembersControllerGetLatestRefreshJob200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_getLatestRefreshJob")
    .annotate(OpenApi.Summary, "Get latest refresh job")
    .annotate(
      OpenApi.Description,
      "Retrieve the latest member refresh job for this guild",
    ),
  HttpApiEndpoint.get(
    "MembersControllerGetRefreshJobStatus",
    "/guilds/:guildId/members/refresh-jobs/:jobId",
    {
      params: MembersControllerGetRefreshJobStatusPathParams,
      success: MembersControllerGetRefreshJobStatus200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_getRefreshJobStatus")
    .annotate(OpenApi.Summary, "Get refresh job status")
    .annotate(
      OpenApi.Description,
      "Retrieve the status of a specific refresh job",
    ),
) {}
