import {
  InternalMemberNotFound,
  InternalGuildsOperationError,
  InternalGuildsData,
} from "#src/guilds/internal-guilds-data";

import { Effect, Schema } from "effect";

import { HttpApiBuilder } from "effect/http-api";
import { statusCodeResponse } from "#src/shared/http/handler-response";

import { OrganizationSummary } from "#src/contracts/shared";
import {
  InternalMemberIdentityResponse,
  InternalUserPermissionsResponse,
} from "#src/contracts/internal/schemas";
import { LootlogApi } from "../../lootlog-api.js";

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError((cause) => new InternalGuildsOperationError({ cause })),
  );

export const getInternalUserPermissions = (
  discordId: string,
  userId: string,
  freshness?: "required",
) =>
  Effect.gen(function* () {
    if (discordId.length === 0 || userId.length === 0) return [];
    const data = yield* InternalGuildsData;

    return yield* Effect.flatMap(
      data.getUserPermissions(discordId, userId, freshness),
      (value) => decode(InternalUserPermissionsResponse, value),
    );
  }).pipe(
    Effect.withSpan("GuildsInternalControllerGetUserPermissions", {
      attributes: { operationId: "GuildsInternalControllerGetUserPermissions" },
    }),
  );

export const getInternalGuild = (idOrVanityUrl: string) =>
  Effect.gen(function* () {
    const data = yield* InternalGuildsData;

    return yield* Effect.flatMap(data.getGuild(idOrVanityUrl), (value) =>
      decode(OrganizationSummary, value),
    );
  }).pipe(
    Effect.withSpan("GuildsInternalControllerGetGuildByIdOrVanityUrl", {
      attributes: {
        operationId: "GuildsInternalControllerGetGuildByIdOrVanityUrl",
      },
    }),
  );

/**
 * The Discord bot acts for the User behind an interaction. Only an active
 * member whose Lootlog User is known resolves; every other case is the same
 * 404, so the bot cannot tell a missing guild from a missing member.
 */
const getInternalMemberIdentity = (guildId: string, discordId: string) =>
  Effect.gen(function* () {
    const data = yield* InternalGuildsData;
    const identity = yield* data.getMemberIdentity(guildId, discordId);

    if (identity === null) {
      return yield* new InternalMemberNotFound({
        status: 404,
        code: "MEMBER_NOT_FOUND",
      });
    }

    return yield* decode(InternalMemberIdentityResponse, identity);
  }).pipe(
    Effect.withSpan("GuildsInternalControllerGetMemberIdentity", {
      attributes: { operationId: "GuildsInternalControllerGetMemberIdentity" },
    }),
  );

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
        orDieHttpFailure(getInternalGuild(params.idOrVanityUrl)),
      )
      .handle("GuildsInternalControllerGetMemberIdentity", ({ params }) =>
        orDieHttpFailure(
          getInternalMemberIdentity(params.guildId, params.discordId).pipe(
            Effect.catchTag("InternalMemberNotFound", statusCodeResponse),
          ),
        ),
      ),
);
