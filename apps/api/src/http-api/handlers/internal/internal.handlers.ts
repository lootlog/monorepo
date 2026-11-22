import {
  InternalGuildNotFound,
  InternalMemberNotFound,
  InternalGuildsOperationError,
  InternalGuildsData,
} from "#src/guilds/internal-guilds-data";

import { Effect, Schema } from "effect";

import { HttpApiBuilder } from "effect/http-api";
import { statusCodeResponse } from "#src/shared/http/handler-response";

import { OrganizationSummary } from "#src/contracts/shared";
import { InternalMemberIdentityResponse } from "@lootlog/schema/internal-guilds";
import { InternalUserPermissionsResponse } from "#src/contracts/internal/schemas";
import { LootlogApi } from "../../lootlog-api.js";

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError((cause) => new InternalGuildsOperationError({ cause })),
  );

export const getInternalUserPermissions = Effect.fn(
  "GuildsInternalControllerGetUserPermissions",
  {
    attributes: { operationId: "GuildsInternalControllerGetUserPermissions" },
  },
)(function* (discordId: string, userId: string, freshness?: "required") {
  if (discordId.length === 0 || userId.length === 0) return [];
  const data = yield* InternalGuildsData;

  return yield* Effect.flatMap(
    data.getUserPermissions(discordId, userId, freshness),
    (value) => decode(InternalUserPermissionsResponse, value),
  );
});

export const getInternalGuild = Effect.fn(
  "GuildsInternalControllerGetGuildByIdOrVanityUrl",
  {
    attributes: {
      operationId: "GuildsInternalControllerGetGuildByIdOrVanityUrl",
    },
  },
)(function* (idOrVanityUrl: string) {
  const data = yield* InternalGuildsData;

  const guild = yield* data.getGuild(idOrVanityUrl);

  if (guild === null) {
    return yield* new InternalGuildNotFound({
      status: 404,
      code: "GUILD_NOT_FOUND",
    });
  }

  return yield* decode(OrganizationSummary, guild);
});

const getInternalMemberIdentity = Effect.fn(
  "GuildsInternalControllerGetMemberIdentity",
  {
    attributes: { operationId: "GuildsInternalControllerGetMemberIdentity" },
  },
)(function* (guildId: string, discordId: string) {
  const data = yield* InternalGuildsData;
  const identity = yield* data.getMemberIdentity(guildId, discordId);

  if (identity === null) {
    return yield* new InternalMemberNotFound({
      status: 404,
      code: "MEMBER_NOT_FOUND",
    });
  }

  return yield* decode(InternalMemberIdentityResponse, identity);
});

const orDieHttpFailure = <A, R>(
  effect: Effect.Effect<A, InternalGuildsOperationError, R>,
) =>
  Effect.catchTag(effect, "InternalGuildsOperationError", (error) =>
    Effect.die(error.cause),
  );

export const InternalGuildsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "internal",
  (handlers) =>
    handlers
      .handle("GuildsInternalControllerGetUserPermissions", ({ query }) =>
        orDieHttpFailure(
          getInternalUserPermissions(
            query.discordId,
            query.userId,
            query.freshness,
          ),
        ),
      )
      .handle("GuildsInternalControllerGetGuildByIdOrVanityUrl", ({ params }) =>
        orDieHttpFailure(
          getInternalGuild(params.idOrVanityUrl).pipe(
            Effect.catchTag("InternalGuildNotFound", statusCodeResponse),
          ),
        ),
      )
      .handle("GuildsInternalControllerGetMemberIdentity", ({ params }) =>
        orDieHttpFailure(
          getInternalMemberIdentity(params.guildId, params.discordId).pipe(
            Effect.catchTag("InternalMemberNotFound", statusCodeResponse),
          ),
        ),
      ),
);
