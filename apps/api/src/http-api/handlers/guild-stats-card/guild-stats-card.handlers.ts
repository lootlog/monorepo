import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  refreshStatsCard,
  toPublicSystemHttpResponse,
} from "../public-system/public-system.operations.js";

export const GuildStatsCardHandlers = HttpApiBuilder.group(
  LootlogApi,
  "guild-stats-card",
  (handlers) =>
    handlers.handle(
      "AuthenticatedGuildStatsCardControllerRefreshStatsCard",
      ({ params }) =>
        toPublicSystemHttpResponse(refreshStatsCard(params.guildId)),
    ),
);
