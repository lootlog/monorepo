import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { encodeDomainJson } from "../../domain-json.schema.js";
import { and, arrayOverlaps, desc, eq, isNotNull, or } from "drizzle-orm";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import { getUserLootlogConfigCachePattern } from "#src/shared/constants/cache.constant";
import { toUserLootlogConfigResponse } from "#src/user-lootlog-config/user-lootlog-config.schema";
import { LootlogApi } from "../../lootlog-api.js";
import {
  UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200,
  UserLootlogConfigControllerGetPlayersCatchingGuilds200,
  UserLootlogConfigControllerGetUserLootlogConfigByAccountId200,
  type CreateOrUpdateLootlogCharacterConfigDto,
  type UserLootlogPlayersCatchingGuildsRequestDto,
} from "../../contracts/user-lootlog-config/schemas.js";

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
  readonly getJson: <S extends Schema.ConstraintDecoder<unknown>>(
    key: string,
    schema: S,
  ) => Effect.Effect<S["Type"] | null, unknown>;
  readonly setJson: (
    key: string,
    value: unknown,
    ttl: number,
  ) => Effect.Effect<void, unknown>;
  readonly deleteByPattern: (pattern: string) => Effect.Effect<void, unknown>;
}

export class UserLootlogConfigData extends Context.Service<
  UserLootlogConfigData,
  {
    readonly getAccount: (discordId: string, accountId: string) => Operation;
    readonly upsertCharacter: (
      discordId: string,
      accountId: string,
      payload: CreateOrUpdateLootlogCharacterConfigDto,
    ) => Operation;
    readonly getPlayersCatchingGuilds: (
      discordId: string,
      payload: UserLootlogPlayersCatchingGuildsRequestDto,
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
        const cacheRead = <S extends Schema.ConstraintDecoder<unknown>>(
          key: string,
          schema: S,
        ) =>
          cache
            .getJson(key, schema)
            .pipe(Effect.catch(() => Effect.succeed(null)));
        const cacheWrite = (key: string, value: unknown) =>
          cache.setJson(key, value, CACHE_TTL_SECONDS).pipe(Effect.ignore);
        const findGuilds = (discordId: string, permission: Permission) =>
          database
            .selectDistinct({ id: guildTable.id, name: guildTable.name })
            .from(guildTable)
            .leftJoin(
              memberTable,
              and(
                eq(memberTable.guildId, guildTable.id),
                eq(memberTable.userId, discordId),
                eq(memberTable.active, true),
                isNotNull(memberTable.globalUserId),
              ),
            )
            .leftJoin(
              memberToRoleTable,
              eq(memberToRoleTable.A, memberTable.id),
            )
            .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
            .where(
              and(
                eq(guildTable.active, true),
                or(
                  eq(guildTable.ownerId, discordId),
                  arrayOverlaps(roleTable.permissions, [permission]),
                ),
              ),
            );

        return UserLootlogConfigData.of({
          getAccount: (discordId, accountId) =>
            operation(
              Effect.gen(function* () {
                const cacheKey = `user-lootlog-config:${discordId}:account:${accountId}`;
                const cached = yield* cacheRead(
                  cacheKey,
                  UserLootlogConfigControllerGetUserLootlogConfigByAccountId200,
                );
                if (cached !== null) return cached;

                const [configs, guilds] = yield* Effect.all([
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
                ]);
                const writableGuildIds = new Set(guilds.map(({ id }) => id));
                const result = Object.fromEntries(
                  configs.map((config) => [
                    config.characterId,
                    toUserLootlogConfigResponse({
                      ...config,
                      catchingGuildIds: config.catchingGuildIds.filter((id) =>
                        writableGuildIds.has(id),
                      ),
                    }),
                  ]),
                );
                yield* cacheWrite(cacheKey, result);
                return result;
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
                    set: { catchingGuildIds, updatedAt: now },
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
                  .deleteByPattern(getUserLootlogConfigCachePattern(discordId))
                  .pipe(Effect.ignore);
                return toUserLootlogConfigResponse(config);
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
  encodeDomainJson(value).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema)),
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
      decode(
        UserLootlogConfigControllerGetUserLootlogConfigByAccountId200,
        value,
      ),
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
  payload: CreateOrUpdateLootlogCharacterConfigDto,
) =>
  withIdentity((discordId, data) =>
    Effect.flatMap(
      data.upsertCharacter(discordId, accountId, payload),
      (value) =>
        decode(
          UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200,
          value,
        ),
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
  payload: UserLootlogPlayersCatchingGuildsRequestDto,
) =>
  withIdentity((discordId, data) =>
    Effect.flatMap(data.getPlayersCatchingGuilds(discordId, payload), (value) =>
      decode(UserLootlogConfigControllerGetPlayersCatchingGuilds200, value),
    ),
  ).pipe(
    Effect.withSpan("UserLootlogConfigControllerGetPlayersCatchingGuilds", {
      attributes: {
        operationId: "UserLootlogConfigControllerGetPlayersCatchingGuilds",
      },
    }),
  );

const defectCause = (error: unknown) =>
  error instanceof UserLootlogConfigOperationError ? error.cause : error;
const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

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
