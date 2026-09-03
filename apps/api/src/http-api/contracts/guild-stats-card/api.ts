/** Endpoints owned by the guild-stats-card HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  AuthenticatedGuildStatsCardControllerRefreshStatsCard200,
  AuthenticatedGuildStatsCardControllerRefreshStatsCardPathParams,
} from "./schemas.js";

export class GuildStatsCardGroup extends HttpApiGroup.make(
  "guild-stats-card",
).add(
  HttpApiEndpoint.post(
    "AuthenticatedGuildStatsCardControllerRefreshStatsCard",
    "/guilds/:guildId/stats-card/refresh",
    {
      params: AuthenticatedGuildStatsCardControllerRefreshStatsCardPathParams,
      success: AuthenticatedGuildStatsCardControllerRefreshStatsCard200,
      error: [HttpApiSchema.Empty(404), HttpApiSchema.Empty(429)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "AuthenticatedGuildStatsCardController_refreshStatsCard",
    )
    .annotate(OpenApi.Summary, "Refresh public guild stats card")
    .annotate(
      OpenApi.Description,
      "Regenerate the public guild stats card and update the cached PNG.",
    ),
) {}
