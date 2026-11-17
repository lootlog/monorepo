import { AccessRequirement } from "@lootlog/domain/access-policy";
import { Effect } from "effect";
import { RefreshStatsCardResponse } from "#src/contracts/guild-stats-card/schemas";
import {
  PublicSystemAuthorization,
  PublicSystemData,
  decode,
  toPublicSystemHttpResponse,
} from "../../access/public-system.access.js";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";

export const refreshStatsCard = Effect.fn(
  "AuthenticatedGuildStatsCardControllerRefreshStatsCard",
)(function* (guildId: string) {
  const authorization = yield* PublicSystemAuthorization;

  const access = yield* authorization.requireCapability({
    guildId,
    anyOf: AccessRequirement.ADMINISTER,
  });

  const data = yield* PublicSystemData;

  return yield* decode(
    RefreshStatsCardResponse,
    yield* data.refreshStatsCard(access.guildId),
  );
});

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
