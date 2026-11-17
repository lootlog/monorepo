import { Effect } from "effect";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import {
  PublicSystemData,
  toPublicSystemHttpResponse,
} from "../../access/public-system.access.js";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";

export const getPublicStatsCard = Effect.fn(
  "PublicGuildStatsCardControllerGetStatsCard",
)(function* (guildId: string) {
  const data = yield* PublicSystemData;
  const image = yield* data.getStatsCard(guildId);

  return HttpServerResponse.uint8Array(image, {
    status: 200,
    contentType: "image/png",
    headers: { "Cache-Control": data.statsCardCacheControl },
  });
});

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
