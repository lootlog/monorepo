import {
  readGuildConfigurationCache,
  writeGuildConfigurationCache,
} from "#src/guilds/guild-configuration-cache";
import {
  makeUserGuildPermissionsPersistence,
  makeUserGuildPermissionsProjection,
  type UserGuildPermissionsCache,
  type UserGuildPermissionsPersistence,
} from "#src/members/user-guild-permissions";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";

import { HttpApiBuilder } from "effect/http-api";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import { ApiDatabase } from "#src/database/drizzle/database";
import { findActiveGuild } from "#src/guilds/active-guild-lookup";
import type { guildTable } from "#src/database/drizzle/schema";

import { OrganizationSummary } from "#src/contracts/shared";
import { InternalUserPermissionsResponse } from "#src/contracts/internal/schemas";
import { LootlogApi } from "../../lootlog-api.js";

export class InternalGuildsOperationError extends TaggedErrorClass<InternalGuildsOperationError>()(
  "InternalGuildsOperationError",
  { cause: Schema.Defect() },
) {}

export interface InternalGuildsCache extends UserGuildPermissionsCache {
  readonly get: (key: string) => Effect.Effect<string | null, unknown>;
  readonly set: (
    key: string,
    value: string,
    ttl: number,
  ) => Effect.Effect<void, unknown>;
  readonly del: (key: string) => Effect.Effect<void, unknown>;
}

type GuildRecord = typeof guildTable.$inferSelect;

export interface InternalGuildsPersistence extends UserGuildPermissionsPersistence {
  readonly findActiveGuild: (
    idOrVanityUrl: string,
  ) => Effect.Effect<GuildRecord | null, unknown>;
}

export const makeInternalGuildsData = (
  persistence: InternalGuildsPersistence,
  cache: InternalGuildsCache,
) => {
  const operation = <A, E>(effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) => new InternalGuildsOperationError({ cause })),
    );

  const getGuild = (idOrVanityUrl: string) =>
    Effect.gen(function* () {
      const cached = yield* readGuildConfigurationCache(cache, idOrVanityUrl);

      if (cached) return cached;

      const guild = yield* persistence.findActiveGuild(idOrVanityUrl);

      if (!guild) return yield* Effect.fail(new Error("Guild not found"));

      yield* writeGuildConfigurationCache(cache, idOrVanityUrl, guild);

      return { ...guild, ...resolveReservationSettings(guild) };
    });

  const getUserPermissions = makeUserGuildPermissionsProjection(
    persistence,
    cache,
  );

  return InternalGuildsData.of({
    getUserPermissions: (discordId, userId, freshness) =>
      operation(getUserPermissions(discordId, userId, freshness)),
    getGuild: (idOrVanityUrl) => operation(getGuild(idOrVanityUrl)),
  });
};

export class InternalGuildsData extends Context.Service<
  InternalGuildsData,
  {
    readonly getUserPermissions: (
      discordId: string,
      userId: string,
      freshness?: "required",
    ) => Effect.Effect<unknown, InternalGuildsOperationError>;
    readonly getGuild: (
      idOrVanityUrl: string,
    ) => Effect.Effect<unknown, InternalGuildsOperationError>;
  }
>()("@lootlog/api/http-api/internal-guilds/data") {
  static layerDatabase(cache: InternalGuildsCache) {
    return Layer.effect(
      InternalGuildsData,
      Effect.map(ApiDatabase, (database) => {
        const persistence: InternalGuildsPersistence = {
          findActiveGuild: (idOrVanityUrl) =>
            findActiveGuild(database, idOrVanityUrl),
          ...makeUserGuildPermissionsPersistence(database),
        };

        return makeInternalGuildsData(persistence, cache);
      }),
    );
  }
}

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
      ),
);
