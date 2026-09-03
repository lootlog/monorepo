/** Endpoints owned by the kills HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  KillsControllerCreateKill201,
  KillsControllerCreateKillRequestJson,
  KillsControllerGetGuildKillStats200,
  KillsControllerGetGuildKillStatsPathParams,
  KillsControllerGetGuildKillStatsQuery,
  KillsControllerGetGuildTopKillersByType200,
  KillsControllerGetGuildTopKillersByTypePathParams,
  KillsControllerGetGuildTopKillersByTypeQuery,
  KillsControllerGetGuildTopNpcs200,
  KillsControllerGetGuildTopNpcsPathParams,
  KillsControllerGetGuildTopNpcsQuery,
  KillsControllerGetMemberKills200,
  KillsControllerGetMemberKillsPathParams,
  KillsControllerGetMemberKillsQuery,
  KillsControllerGetNpcKillers200,
  KillsControllerGetNpcKillersPathParams,
  KillsControllerGetNpcKillersQuery,
  KillsControllerGetUserKillStats200,
  KillsControllerGetUserKillStatsQuery,
  KillsControllerGetUserNpcKills200,
  KillsControllerGetUserNpcKillsQuery,
} from "./schemas.js";

export class KillsGroup extends HttpApiGroup.make("kills").add(
  HttpApiEndpoint.post("KillsControllerCreateKill", "/kills", {
    payload: KillsControllerCreateKillRequestJson,
    success: KillsControllerCreateKill201.pipe(HttpApiSchema.status(201)),
    error: HttpApiSchema.Empty(400),
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
      params: KillsControllerGetGuildKillStatsPathParams,
      query: KillsControllerGetGuildKillStatsQuery,
      success: KillsControllerGetGuildKillStats200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getGuildKillStats")
    .annotate(OpenApi.Summary, "Get guild kill statistics")
    .annotate(
      OpenApi.Description,
      "Retrieves kill statistics for a guild including overview and member ranking.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetUserKillStats",
    "/users/@me/stats/kills",
    {
      query: KillsControllerGetUserKillStatsQuery,
      success: KillsControllerGetUserKillStats200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getUserKillStats")
    .annotate(OpenApi.Summary, "Get personal kill statistics")
    .annotate(
      OpenApi.Description,
      "Retrieves kill statistics for the authenticated user across all guilds, deduplicated.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetUserNpcKills",
    "/users/@me/kills/npcs",
    {
      query: KillsControllerGetUserNpcKillsQuery,
      success: KillsControllerGetUserNpcKills200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getUserNpcKills")
    .annotate(OpenApi.Summary, "Get paginated list of killed NPCs")
    .annotate(
      OpenApi.Description,
      "Retrieves a paginated, searchable list of NPCs killed by the authenticated user.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetGuildTopNpcs",
    "/guilds/:guildId/stats/kills/top-npcs",
    {
      params: KillsControllerGetGuildTopNpcsPathParams,
      query: KillsControllerGetGuildTopNpcsQuery,
      success: KillsControllerGetGuildTopNpcs200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getGuildTopNpcs")
    .annotate(OpenApi.Summary, "Get top killed NPCs in guild")
    .annotate(
      OpenApi.Description,
      "Retrieves the most frequently killed NPCs in a guild.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetGuildTopKillersByType",
    "/guilds/:guildId/stats/kills/top-killers",
    {
      params: KillsControllerGetGuildTopKillersByTypePathParams,
      query: KillsControllerGetGuildTopKillersByTypeQuery,
      success: KillsControllerGetGuildTopKillersByType200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getGuildTopKillersByType")
    .annotate(OpenApi.Summary, "Get top killers by NPC type in guild")
    .annotate(
      OpenApi.Description,
      "Retrieves top members by kill count for specific NPC types (TITAN, HERO).",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetNpcKillers",
    "/guilds/:guildId/stats/kills/npcs/:npcId/killers",
    {
      params: KillsControllerGetNpcKillersPathParams,
      query: KillsControllerGetNpcKillersQuery,
      success: KillsControllerGetNpcKillers200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getNpcKillers")
    .annotate(OpenApi.Summary, "Get killers ranking for a specific NPC")
    .annotate(
      OpenApi.Description,
      "Retrieves a ranking of members who killed a specific NPC, sorted by kill count.",
    ),
  HttpApiEndpoint.get(
    "KillsControllerGetMemberKills",
    "/guilds/:guildId/stats/kills/members/:memberId",
    {
      params: KillsControllerGetMemberKillsPathParams,
      query: KillsControllerGetMemberKillsQuery,
      success: KillsControllerGetMemberKills200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "KillsController_getMemberKills")
    .annotate(
      OpenApi.Summary,
      "Get kill statistics for a specific guild member",
    )
    .annotate(
      OpenApi.Description,
      "Retrieves kill statistics for a specific member including overview and list of killed NPCs.",
    ),
) {}
