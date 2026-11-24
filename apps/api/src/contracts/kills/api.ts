import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  UserKillAnalyticsQuery,
  UserKillAnalyticsResponse,
  UserKillActivityQuery,
  UserKillActivityResponse,
  UserKillCharactersResponse,
} from "./analytics-schemas.js";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import {
  CreateKillResponse,
  CreateKillRequest,
  GuildKillStatsResponse,
  KillOrganizationPath,
  GuildKillStatsQuery,
  GuildTopKillersByTypeResponse,
  GuildTopKillersQuery,
  GuildTopNpcsResponse,
  GuildTopNpcsQuery,
  MemberKillsResponse,
  MemberKillsPath,
  MemberKillsQuery,
  NpcKillersResponse,
  NpcKillersPath,
  NpcKillersQuery,
  UserKillStatsResponse,
  UserKillStatsQuery,
  UserNpcKillsResponse,
  UserNpcKillsQuery,
} from "./schemas.js";

export class KillsGroup extends HttpApiGroup.make("kills").add(
  HttpApiEndpoint.post("KillsControllerCreateKill", "/kills", {
    payload: CreateKillRequest,
    success: CreateKillResponse.pipe(HttpApiSchema.status(201)),
    error: HttpErrorResponse.pipe(HttpApiSchema.status(400)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_createKill")
    .annotate(OpenApi.Summary, "Record a kill")
    .annotate(
      OpenApi.Description,
      "Records an NPC kill. Guilds are auto-detected from user lootlog config (loot/timer whitelists).",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetGuildKillStats",
    "/guilds/:guildId/stats/kills",
    {
      params: KillOrganizationPath,
      query: GuildKillStatsQuery,
      success: GuildKillStatsResponse,
      error: [403, 404].map((status) =>
        HttpErrorResponse.pipe(HttpApiSchema.status(status)),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getGuildKillStats")
    .annotate(OpenApi.Summary, "Get guild kill statistics")
    .annotate(
      OpenApi.Description,
      "Includes an overview and a member ranking.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetUserKillStats",
    "/users/@me/stats/kills",
    {
      query: UserKillStatsQuery,
      success: UserKillStatsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getUserKillStats")
    .annotate(OpenApi.Summary, "Get personal kill statistics")
    .annotate(
      OpenApi.Description,
      "Across all guilds, counting each kill once.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetUserKillAnalytics",
    "/users/@me/stats/kills/analytics",
    { query: UserKillAnalyticsQuery, success: UserKillAnalyticsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getUserKillAnalytics")
    .annotate(OpenApi.Summary, "Get personal kill analytics")
    .annotate(
      OpenApi.Description,
      "Calendar-day analytics in Europe/Warsaw. Current-day/hour data is partial; untimed lifetime history is never distributed backwards. The NPC ranking lists up to 500 NPCs killed in the period, most killed first. Comparisons exclude the current incomplete hour.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetUserKillActivity",
    "/users/@me/stats/kills/activity",
    { query: UserKillActivityQuery, success: UserKillActivityResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getUserKillActivity")
    .annotate(OpenApi.Summary, "Get 16 weeks of personal kill activity"),
  HttpApiEndpoint.get(
    "KillsControllerGetUserKillCharacters",
    "/users/@me/stats/kills/characters",
    { success: UserKillCharactersResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getUserKillCharacters")
    .annotate(OpenApi.Summary, "List characters with personal kills")
    .annotate(
      OpenApi.Description,
      "Characters of the authenticated user with kills recorded since per-character tracking began, most recently active first.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetUserNpcKills",
    "/users/@me/kills/npcs",
    {
      query: UserNpcKillsQuery,
      success: UserNpcKillsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getUserNpcKills")
    .annotate(OpenApi.Summary, "Get paginated list of killed NPCs")
    .annotate(
      OpenApi.Description,
      "NPCs the authenticated user killed; `search` filters them.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetGuildTopNpcs",
    "/guilds/:guildId/stats/kills/top-npcs",
    {
      params: KillOrganizationPath,
      query: GuildTopNpcsQuery,
      success: GuildTopNpcsResponse,
      error: [403, 404].map((status) =>
        HttpErrorResponse.pipe(HttpApiSchema.status(status)),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getGuildTopNpcs")
    .annotate(OpenApi.Summary, "Get top killed NPCs in guild"),
  HttpApiEndpoint.get(
    "KillsControllerGetGuildTopKillersByType",
    "/guilds/:guildId/stats/kills/top-killers",
    {
      params: KillOrganizationPath,
      query: GuildTopKillersQuery,
      success: GuildTopKillersByTypeResponse,
      error: [403, 404].map((status) =>
        HttpErrorResponse.pipe(HttpApiSchema.status(status)),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getGuildTopKillersByType")
    .annotate(OpenApi.Summary, "Get top killers by NPC type in guild")
    .annotate(
      OpenApi.Description,
      "Members ranked by kill count for each of the TITAN, HERO and EVENT_HERO types.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetNpcKillers",
    "/guilds/:guildId/stats/kills/npcs/:npcId/killers",
    {
      params: NpcKillersPath,
      query: NpcKillersQuery,
      success: NpcKillersResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getNpcKillers")
    .annotate(OpenApi.Summary, "Get the killers ranking of an NPC")
    .annotate(OpenApi.Description, "Members sorted by kill count."),
  HttpApiEndpoint.get(
    "KillsControllerGetMemberKills",
    "/guilds/:guildId/stats/kills/members/:memberId",
    {
      params: MemberKillsPath,
      query: MemberKillsQuery,
      success: MemberKillsResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getMemberKills")
    .annotate(OpenApi.Summary, "Get a guild member's kill statistics")
    .annotate(
      OpenApi.Description,
      "Includes an overview and the NPCs the member killed.",
    ),
) {}
