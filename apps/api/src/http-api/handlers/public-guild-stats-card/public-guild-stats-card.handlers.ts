import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  getPublicStatsCard,
  toPublicSystemHttpResponse,
} from "../public-system/public-system.operations.js";

export const PublicGuildStatsCardHandlers = HttpApiBuilder.group(
  LootlogApi,
  "public-guild-stats-card",
  (handlers) =>
    handlers.handleRaw(
      "PublicGuildStatsCardControllerGetStatsCard",
      ({ params }) =>
        toPublicSystemHttpResponse(getPublicStatsCard(params.guildId)),
    ),
);
