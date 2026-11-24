import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import {
  MemberResponse,
  MemberPath,
  MemberReferencesResponse,
  MemberOrganizationPath,
  MembersQuery,
  MembersResponse,
  MemberSummariesResponse,
  NullableMemberRefreshJobResponse,
  NullableMemberResponse,
  CurrentMemberOrganizationPath,
  MemberLootlogConfigSummaryResponse,
  MemberRefreshJobResponse,
  MemberRefreshJobPath,
} from "./schemas.js";

export class MembersGroup extends HttpApiGroup.make("members").add(
  HttpApiEndpoint.get(
    "MembersControllerGetMe",
    "/guilds/:guildId/members/@me",
    {
      params: CurrentMemberOrganizationPath,
      success: NullableMemberResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_getMe")
    .annotate(OpenApi.Summary, "Get current member"),
  HttpApiEndpoint.post(
    "MembersControllerRefreshMe",
    "/guilds/:guildId/members/@me/refresh",
    {
      params: CurrentMemberOrganizationPath,
      success: NullableMemberResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_refreshMe")
    .annotate(OpenApi.Summary, "Refresh current member from Discord"),
  HttpApiEndpoint.post(
    "MembersControllerRefreshMember",
    "/guilds/:guildId/members/:discordId/refresh",
    {
      params: MemberPath,
      success: NullableMemberResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_refreshMember")
    .annotate(OpenApi.Summary, "Refresh a member from Discord")
    .annotate(OpenApi.Description, "Admin only."),
  HttpApiEndpoint.patch(
    "MembersControllerDeactivateMember",
    "/guilds/:guildId/members/:discordId/deactivate",
    {
      params: MemberPath,
      success: MemberResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_deactivateMember")
    .annotate(OpenApi.Summary, "Deactivate member")
    .annotate(OpenApi.Description, "Admin only."),
  HttpApiEndpoint.get(
    "MembersControllerGetMemberLootlogConfigSummary",
    "/guilds/:guildId/members/:discordId/lootlog-config-summary",
    {
      params: MemberPath,
      success: MemberLootlogConfigSummaryResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
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
      "Retrieve a member's character configuration summary for this Lootlog (admin only). Lists only characters set up to submit loot to this Lootlog; characters set up only for other Lootlogs are never included.",
    ),
  HttpApiEndpoint.get(
    "MembersControllerGetGuildMembers",
    "/guilds/:guildId/members",
    {
      params: MemberOrganizationPath,
      query: MembersQuery,
      success: MembersResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_getGuildMembers")
    .annotate(OpenApi.Summary, "Get guild members"),
  HttpApiEndpoint.get(
    "MembersControllerGetGuildMemberReferences",
    "/guilds/:guildId/members/references",
    {
      params: MemberOrganizationPath,
      query: MembersQuery,
      success: MemberReferencesResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
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
      params: MemberOrganizationPath,
      success: MemberSummariesResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
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
      params: MemberOrganizationPath,
      success: MemberRefreshJobResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_refreshAllMembers")
    .annotate(OpenApi.Summary, "Refresh all members")
    .annotate(OpenApi.Description, "Starts a refresh job; admin only."),
  HttpApiEndpoint.get(
    "MembersControllerGetLatestRefreshJob",
    "/guilds/:guildId/members/refresh-jobs/latest",
    {
      params: MemberOrganizationPath,
      success: NullableMemberRefreshJobResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_getLatestRefreshJob")
    .annotate(OpenApi.Summary, "Get latest refresh job"),
  HttpApiEndpoint.get(
    "MembersControllerGetRefreshJobStatus",
    "/guilds/:guildId/members/refresh-jobs/:jobId",
    {
      params: MemberRefreshJobPath,
      success: MemberRefreshJobResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MembersController_getRefreshJobStatus")
    .annotate(OpenApi.Summary, "Get refresh job status"),
) {}
