import { makeJsonCodec, type RedisService } from "#src/redis/redis.service";
import { requestApiKeyAccess } from "#src/runtime/auth/forward-auth-identity";
import { emptyStatusResponse } from "#src/shared/http/handler-response";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Clock, Context, Effect, Layer, Schema } from "effect";

import { HttpApiBuilder } from "effect/unstable/httpapi";
import { and, arrayOverlaps, desc, eq, or, sql } from "drizzle-orm";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/schema";
import { getUserLootlogConfigCacheScope } from "#src/shared/cache";
import { LootlogApi } from "../../lootlog-api.js";
import {
  CharacterLootlogConfigResponse,
  PlayersCatchingOrganizationsResponse,
  AccountLootlogConfigResponse,
  type UpdateCharacterLootlogConfigRequest,
  type PlayersCatchingOrganizationsRequest,
} from "#src/contracts/user-lootlog-config/schemas";

export class UserLootlogConfigAccessDenied extends TaggedErrorClass<UserLootlogConfigAccessDenied>()(
  "UserLootlogConfigAccessDenied",
  { status: Schema.Literal(401), code: Schema.String },
) {}

export class UserLootlogConfigOperationError extends TaggedErrorClass<UserLootlogConfigOperationError>()(
  "UserLootlogConfigOperationError",
  { cause: Schema.Defect() },
) {}

export class UserLootlogConfigIdentity extends Context.Service<
  UserLootlogConfigIdentity,
  { readonly discordId: Effect.Effect<string, UserLootlogConfigAccessDenied> }
>()("@lootlog/api/http-api/user-lootlog-config/identity") {}

type Operation = Effect.Effect<unknown, UserLootlogConfigOperationError>;

const CACHE_TTL_SECONDS = 60;

export interface UserLootlogConfigCache {
  readonly getOrSetJsonEffect: RedisService["getOrSetJsonEffect"];
  readonly invalidateScopes: (
    ...scopes: string[]
  ) => Effect.Effect<void, unknown>;
}

export class UserLootlogConfigData extends Context.Service<
  UserLootlogConfigData,
  {
    readonly getAccount: (discordId: string, accountId: string) => Operation;
    readonly upsertCharacter: (
      discordId: string,
      accountId: string,
      payload: UpdateCharacterLootlogConfigRequest,
    ) => Operation;
    readonly getPlayersCatchingGuilds: (
      discordId: string,
      payload: PlayersCatchingOrganizationsRequest,
    ) => Operation;
  }
>()("@lootlog/api/http-api/user-lootlog-config/data") {
  static layerDatabase(cache: UserLootlogConfigCache) {
    return Layer.effect(
      UserLootlogConfigData,
      Effect.map(ApiDatabase, (database) => {
        const operation = <A, E>(effect: Effect.Effect<A, E>) =>
          effect.pipe(
            Effect.mapError(
              (cause) => new UserLootlogConfigOperationError({ cause }),
            ),
          );

        const findGuilds = (discordId: string, permission: Permission) =>
          selectAccessibleGuilds(database, discordId, [permission]).pipe(
            Effect.map((rows) =>
              rows.map(({ guild }) => ({ id: guild.id, name: guild.name })),
            ),
          );

        return UserLootlogConfigData.of({
          getAccount: (discordId, accountId) =>
            operation(
              Effect.gen(function* () {
                const cacheKey = `user-lootlog-config:${discordId}:account:${accountId}`;
                const keyAccess = yield* requestApiKeyAccess;

                const load = Effect.gen(function* () {
                  const [configs, guilds] = yield* Effect.all(
                    [
                      database
                        .select()
                        .from(userCharactersLootlogSettingsTable)
                        .where(
                          and(
                            eq(
                              userCharactersLootlogSettingsTable.userId,
                              discordId,
                            ),
                            eq(
                              userCharactersLootlogSettingsTable.accountId,
                              accountId,
                            ),
                          ),
                        )
                        .orderBy(
                          desc(userCharactersLootlogSettingsTable.createdAt),
                        ),
                      findGuilds(discordId, Permission.LOOTLOG_LOOTS_WRITE),
                    ],
                    { concurrency: "unbounded" },
                  );

                  const writableGuildIds = new Set(guilds.map(({ id }) => id));

                  const result = Object.fromEntries(
                    configs.map((config) => [
                      config.characterId,
                      {
                        ...config,
                        catchingGuildIds: config.catchingGuildIds.filter((id) =>
                          writableGuildIds.has(id),
                        ),
                      },
                    ]),
                  );

                  return result;
                });

                return yield* keyAccess
                  ? load
                  : cache.getOrSetJsonEffect({
                      key: cacheKey,
                      scopes: [getUserLootlogConfigCacheScope(discordId)],
                      ttlSeconds: CACHE_TTL_SECONDS,
                      codec: makeJsonCodec(AccountLootlogConfigResponse),
                      factory: load,
                    });
              }),
            ),
          upsertCharacter: (discordId, accountId, payload) =>
            operation(
              Effect.gen(function* () {
                const guilds = yield* findGuilds(
                  discordId,
                  Permission.LOOTLOG_LOOTS_WRITE,
                );

                const writableGuildIds = new Set(guilds.map(({ id }) => id));

                const catchingGuildIds = [
                  ...new Set(payload.catchingGuildIds),
                ].filter((id) => writableGuildIds.has(id));

                const keyAccess = yield* requestApiKeyAccess;

                const allowedIds = sql`ARRAY[${sql.join(
                  [...writableGuildIds].map((id) => sql`${id}`),
                  sql`, `,
                )}]::text[]`;

                const selectedIds = sql`ARRAY[${sql.join(
                  catchingGuildIds.map((id) => sql`${id}`),
                  sql`, `,
                )}]::text[]`;

                const updatedCatchingGuildIds = keyAccess
                  ? sql<
                      string[]
                    >`ARRAY(SELECT id FROM unnest(${userCharactersLootlogSettingsTable.catchingGuildIds}) AS id WHERE NOT (id = ANY(${allowedIds}))) || ${selectedIds}`
                  : catchingGuildIds;

                const now = new Date(yield* Clock.currentTimeMillis);

                const rows = yield* database
                  .insert(userCharactersLootlogSettingsTable)
                  .values({
                    userId: discordId,
                    accountId,
                    characterId: payload.characterId,
                    catchingGuildIds,
                    createdAt: now,
                    updatedAt: now,
                  })
                  .onConflictDoUpdate({
                    target: [
                      userCharactersLootlogSettingsTable.userId,
                      userCharactersLootlogSettingsTable.accountId,
                      userCharactersLootlogSettingsTable.characterId,
                    ],
                    set: {
                      catchingGuildIds: updatedCatchingGuildIds,
                      updatedAt: now,
                    },
                  })
                  .returning();

                const config = rows[0];

                if (!config) {
                  return yield* Effect.fail(
                    new Error(
                      "Lootlog character configuration was not returned",
                    ),
                  );
                }

                yield* cache
                  .invalidateScopes(getUserLootlogConfigCacheScope(discordId))
                  .pipe(Effect.ignore);

                return keyAccess
                  ? {
                      ...config,
                      catchingGuildIds: config.catchingGuildIds.filter((id) =>
                        writableGuildIds.has(id),
                      ),
                    }
                  : config;
              }).pipe(
                Effect.withSpan("user-lootlog-config.upsert.persistence", {
                  attributes: { adapter: "ApiDatabase", retryCount: 0 },
                }),
              ),
            ),
          getPlayersCatchingGuilds: (discordId, payload) =>
            operation(
              Effect.gen(function* () {
                const players = [
                  ...new Map(
                    payload.players.map((player) => [
                      `${player.userId}:${player.accountId}:${player.characterId}`,
                      player,
                    ]),
                  ).values(),
                ];

                const guilds = yield* findGuilds(
                  discordId,
                  Permission.LOOTLOG_ACCESS,
                );

                const guildById = new Map(
                  guilds.map((guild) => [guild.id, guild]),
                );

                if (players.length === 0 || guilds.length === 0) {
                  return {
                    players: players.map((player) => ({
                      ...player,
                      guilds: [],
                    })),
                  };
                }

                const predicates = players.map((player) =>
                  and(
                    eq(
                      userCharactersLootlogSettingsTable.userId,
                      player.userId,
                    ),
                    eq(
                      userCharactersLootlogSettingsTable.accountId,
                      player.accountId,
                    ),
                    eq(
                      userCharactersLootlogSettingsTable.characterId,
                      player.characterId,
                    ),
                  ),
                );

                const configs = yield* database
                  .select()
                  .from(userCharactersLootlogSettingsTable)
                  .where(
                    and(
                      or(...predicates),
                      arrayOverlaps(
                        userCharactersLootlogSettingsTable.catchingGuildIds,
                        guilds.map(({ id }) => id),
                      ),
                    ),
                  )
                  .orderBy(desc(userCharactersLootlogSettingsTable.createdAt));

                const visibleByPlayer = new Map<string, Set<string>>();

                for (const config of configs) {
                  const key = `${config.userId}:${config.accountId}:${config.characterId}`;
                  const visible = visibleByPlayer.get(key) ?? new Set<string>();

                  for (const guildId of config.catchingGuildIds) {
                    if (guildById.has(guildId)) visible.add(guildId);
                  }

                  visibleByPlayer.set(key, visible);
                }

                return {
                  players: players.map((player) => ({
                    ...player,
                    guilds: [
                      ...(visibleByPlayer.get(
                        `${player.userId}:${player.accountId}:${player.characterId}`,
                      ) ?? []),
                    ].map((id) => ({
                      id,
                      name: guildById.get(id)?.name ?? id,
                    })),
                  })),
                };
              }),
            ),
        });
      }),
    );
  }
}

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError((cause) => new UserLootlogConfigOperationError({ cause })),
  );

const withIdentity = <A>(
  operation: (
    discordId: string,
    data: UserLootlogConfigData["Service"],
  ) => Effect.Effect<A, UserLootlogConfigOperationError>,
) =>
  Effect.gen(function* () {
    const identity = yield* UserLootlogConfigIdentity;
    const discordId = yield* identity.discordId;
    const data = yield* UserLootlogConfigData;

    return yield* operation(discordId, data);
  });

export const getUserLootlogAccountConfig = (accountId: string) =>
  withIdentity((discordId, data) =>
    Effect.flatMap(data.getAccount(discordId, accountId), (value) =>
      decode(AccountLootlogConfigResponse, value),
    ),
  ).pipe(
    Effect.withSpan(
      "UserLootlogConfigControllerGetUserLootlogConfigByAccountId",
      {
        attributes: {
          operationId:
            "UserLootlogConfigControllerGetUserLootlogConfigByAccountId",
        },
      },
    ),
  );

export const upsertUserLootlogCharacterConfig = (
  accountId: string,
  payload: UpdateCharacterLootlogConfigRequest,
) =>
  withIdentity((discordId, data) =>
    Effect.flatMap(
      data.upsertCharacter(discordId, accountId, payload),
      (value) => decode(CharacterLootlogConfigResponse, value),
    ),
  ).pipe(
    Effect.withSpan(
      "UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig",
      {
        attributes: {
          operationId:
            "UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig",
        },
      },
    ),
  );

export const getPlayersCatchingGuilds = (
  payload: PlayersCatchingOrganizationsRequest,
) =>
  withIdentity((discordId, data) =>
    Effect.flatMap(data.getPlayersCatchingGuilds(discordId, payload), (value) =>
      decode(PlayersCatchingOrganizationsResponse, value),
    ),
  ).pipe(
    Effect.withSpan("UserLootlogConfigControllerGetPlayersCatchingGuilds", {
      attributes: {
        operationId: "UserLootlogConfigControllerGetPlayersCatchingGuilds",
      },
    }),
  );

type UserLootlogConfigHttpFailure =
  | UserLootlogConfigAccessDenied
  | UserLootlogConfigOperationError;

const orDieHttpFailure = <A, R>(
  effect: Effect.Effect<A, UserLootlogConfigHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    UserLootlogConfigAccessDenied: emptyStatusResponse,
    UserLootlogConfigOperationError: (error) => Effect.die(error.cause),
  });

export const UserLootlogConfigHandlers = HttpApiBuilder.group(
  LootlogApi,
  "user-lootlog-config",
  (handlers) =>
    handlers
      .handle(
        "UserLootlogConfigControllerGetUserLootlogConfigByAccountId",
        ({ params }) =>
          orDieHttpFailure(getUserLootlogAccountConfig(params.accountId)),
      )
      .handle(
        "UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig",
        ({ params, payload }) =>
          orDieHttpFailure(
            upsertUserLootlogCharacterConfig(params.accountId, payload),
          ),
      )
      .handle(
        "UserLootlogConfigControllerGetPlayersCatchingGuilds",
        ({ payload }) => orDieHttpFailure(getPlayersCatchingGuilds(payload)),
      ),
);
