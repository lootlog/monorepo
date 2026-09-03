/** Endpoints owned by the public-guild-stats-card HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { PublicGuildStatsCardControllerGetStatsCardPathParams } from "./schemas.js";

export class PublicGuildStatsCardGroup extends HttpApiGroup.make(
  "public-guild-stats-card",
).add(
  HttpApiEndpoint.get(
    "PublicGuildStatsCardControllerGetStatsCard",
    "/public/guilds/:guildId/stats-card.png",
    {
      params: PublicGuildStatsCardControllerGetStatsCardPathParams,
      success: HttpApiSchema.Empty(200),
      error: HttpApiSchema.Empty(404),
    },
  )
    .annotate(OpenApi.Identifier, "PublicGuildStatsCardController_getStatsCard")
    .annotate(OpenApi.Summary, "Get public guild loot stats card")
    .annotate(
      OpenApi.Description,
      "Generate a public PNG image with lightweight loot statistics for a guild.",
    ),
) {}
