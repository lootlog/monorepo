import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Predicate, Schema } from "effect";
import { decodeJsonUnknown } from "#src/shared/schema/json";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { DiscordGuildSyncStateResponse as DiscordGuildSyncStateCodec } from "#src/shared/schema/discord-guild-sync";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { and, eq, or } from "drizzle-orm";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import { guildTable, timerTable } from "#src/database/drizzle/schema";
import {
  applicationErrorStatusOrUndefined,
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import {
  getGuildCacheKey,
  GUILD_CACHE_TTL_SECONDS,
} from "#src/shared/constants/cache.constant";
import { generateSlug } from "#src/shared/utils/generate-slug";
import { hasOwnField } from "#src/shared/utils/has-own-field";
import { RESTRICTED_VANITY_URLS } from "#src/guilds/constants/restricted-vanity-urls";
import { ErrorKey } from "#src/guilds/enum/error-key.enum";
import {
  DiscordGuildSyncStateResponseDto as DiscordGuildSyncStateSchema,
  GuildResponseDto_Output,
  GuildsControllerGetGuildPermissions200,
  GuildsControllerGetManageableUserGuilds200,
  GuildsControllerGetUserGuilds200,
  GuildsControllerGetUserGuildsWithPermissions200,
  GuildsControllerGetWorldsByGuildId200,
  LootlogApi,
  StatusOkResponseDto_Output,
  UserGameAccountPreferencesResponseDto_Output,
  UserPreferencesResponseDto_Output,
  UsersControllerGetCurrentUserAccessibleGuilds200,
  UsersControllerGetCurrentUserGuilds200,
  type UpdateGuildConfigDto,
  type UpdateUserGameAccountPreferencesDto,
  type UpdateUserPreferencesDto,
} from "../../lootlog-api.js";

export type AuthenticatedIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type AuthorizedGuild = {
  readonly guildId: string;
  readonly permissions: ReadonlyArray<PermissionValue>;
};

export class UsersGuildsAccessDenied extends TaggedErrorClass<UsersGuildsAccessDenied>()(
  "UsersGuildsAccessDenied",
  {
    status: Schema.Literals([401, 403]),
    code: Schema.String,
  },
) {}

export class UsersGuildsNotFound extends TaggedErrorClass<UsersGuildsNotFound>()(
  "UsersGuildsNotFound",
  {
    status: Schema.Literal(404),
    code: Schema.String,
  },
) {}

export class UsersGuildsOperationError extends TaggedErrorClass<UsersGuildsOperationError>()(
  "UsersGuildsOperationError",
  { cause: Schema.Defect() },
) {}

type AuthorizationFailure = UsersGuildsAccessDenied | UsersGuildsNotFound;

export class UsersGuildsAuthorization extends Context.Service<
  UsersGuildsAuthorization,
  {
    readonly identity: Effect.Effect<
      AuthenticatedIdentity,
      UsersGuildsAccessDenied
    >;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly anyOf: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<AuthorizedGuild, AuthorizationFailure>;
  }
>()("@lootlog/api/http-api/users-guilds/authorization") {}

type DataEffect = Effect.Effect<unknown, UsersGuildsOperationError>;

export class UsersGuildsData extends Context.Service<
  UsersGuildsData,
  {
    readonly deleteAccount: (identity: AuthenticatedIdentity) => DataEffect;
    readonly getUserPreferences: (userId: string) => DataEffect;
    readonly updateUserPreferences: (
      userId: string,
      payload: UpdateUserPreferencesDto,
    ) => DataEffect;
    readonly getCurrentUserGuilds: (
      identity: AuthenticatedIdentity,
    ) => DataEffect;
    readonly getCurrentUserAccessibleGuilds: (
      identity: AuthenticatedIdentity,
    ) => DataEffect;
    readonly getUserGameAccountPreferences: (
      userId: string,
      accountId: string,
    ) => DataEffect;
    readonly updateUserGameAccountPreferences: (
      userId: string,
      accountId: string,
      payload: UpdateUserGameAccountPreferencesDto,
    ) => DataEffect;
    readonly getUserGuilds: (
      identity: AuthenticatedIdentity,
      source?: string,
    ) => DataEffect;
    readonly getUserGuildsWithPermissions: (
      identity: AuthenticatedIdentity,
    ) => DataEffect;
    readonly getManageableUserGuilds: (
      identity: AuthenticatedIdentity,
    ) => DataEffect;
    readonly getGuildDiscordSyncStatus: (guildId: string) => DataEffect;
    readonly refreshGuildDiscordSync: (guildId: string) => DataEffect;
  }
>()("@lootlog/api/http-api/users-guilds/data") {}

const invalidReservationRange = () =>
  new InvalidRequestError({
    message: ErrorKey.GUILDS_RESERVATION_DURATION_RANGE_INVALID,
  });

const validateGuildConfiguration = (payload: UpdateGuildConfigDto) => {
  if (
    payload.reservationMinDurationMinutes !== undefined &&
    payload.reservationMaxDurationMinutes !== undefined &&
    payload.reservationMinDurationMinutes >
      payload.reservationMaxDurationMinutes
  ) {
    return invalidReservationRange();
  }
  if (payload.vanityUrl && RESTRICTED_VANITY_URLS.includes(payload.vanityUrl)) {
    return new InvalidRequestError({
      message: ErrorKey.GUILDS_VANITY_URL_RESTRICTED,
    });
  }
};

const validateGuildConfigurationAgainstStored = (
  payload: UpdateGuildConfigDto,
  stored: typeof guildTable.$inferSelect | undefined,
) => {
  if (!stored) return;
  if (
    (payload.reservationMinDurationMinutes !== undefined &&
      payload.reservationMaxDurationMinutes === undefined &&
      payload.reservationMinDurationMinutes >
        stored.reservationMaxDurationMinutes) ||
    (payload.reservationMaxDurationMinutes !== undefined &&
      payload.reservationMinDurationMinutes === undefined &&
      stored.reservationMinDurationMinutes >
        payload.reservationMaxDurationMinutes)
  ) {
    return invalidReservationRange();
  }
};

const buildGuildConfigurationUpdate = (payload: UpdateGuildConfigDto) => ({
  ...(hasOwnField(payload, "vanityUrl")
    ? { vanityUrl: generateSlug(payload.vanityUrl ?? undefined) }
    : {}),
  ...(payload.publicStatsCardEnabled === undefined
    ? {}
    : { publicStatsCardEnabled: payload.publicStatsCardEnabled }),
  ...(payload.reservationMaxDurationMinutes === undefined
    ? {}
    : {
        reservationMaxDurationMinutes: payload.reservationMaxDurationMinutes,
      }),
  ...(payload.reservationMinDurationMinutes === undefined
    ? {}
    : {
        reservationMinDurationMinutes: payload.reservationMinDurationMinutes,
      }),
  ...(payload.reservationTimeGranularityMinutes === undefined
    ? {}
    : {
        reservationTimeGranularityMinutes:
          payload.reservationTimeGranularityMinutes,
      }),
  ...(payload.reservationMaxAdvanceDays === undefined
    ? {}
    : { reservationMaxAdvanceDays: payload.reservationMaxAdvanceDays }),
  ...(payload.reservationActiveLimitPerSpot === undefined
    ? {}
    : {
        reservationActiveLimitPerSpot: payload.reservationActiveLimitPerSpot,
      }),
  updatedAt: new Date(),
});

export class GuildConfigurationData extends Context.Service<
  GuildConfigurationData,
  {
    readonly getGuildById: (guildId: string) => DataEffect;
    readonly updateGuildConfig: (
      guildId: string,
      payload: UpdateGuildConfigDto,
    ) => DataEffect;
    readonly getWorldsByGuildId: (guildId: string) => DataEffect;
  }
>()("@lootlog/api/http-api/guild-configuration/data") {
  static layerDatabase(cache: GuildConfigurationCache) {
    return Layer.effect(
      GuildConfigurationData,
      Effect.map(ApiDatabase, (database) => {
        const operation = <A, E>(effect: Effect.Effect<A, E>) =>
          effect.pipe(
            Effect.mapError(
              (cause) => new UsersGuildsOperationError({ cause }),
            ),
          );
        return GuildConfigurationData.of({
          getGuildById: (idOrVanityUrl) =>
            operation(
              Effect.gen(function* () {
                const cacheKey = getGuildCacheKey(idOrVanityUrl);
                const cached = yield* cache.get(cacheKey);
                if (cached) {
                  try {
                    const decoded = decodeJsonUnknown(cached);
                    if (!Predicate.isObject(decoded) || Array.isArray(decoded))
                      throw new Error("Invalid guild cache");
                    const guild = decoded;
                    return { ...guild, ...resolveReservationSettings(guild) };
                  } catch {
                    yield* cache.del(cacheKey);
                  }
                }

                const rows = yield* database
                  .select()
                  .from(guildTable)
                  .where(
                    and(
                      eq(guildTable.active, true),
                      or(
                        eq(guildTable.id, idOrVanityUrl),
                        eq(guildTable.vanityUrl, idOrVanityUrl),
                      ),
                    ),
                  )
                  .limit(1);
                const guild = rows[0];
                if (!guild) {
                  return yield* Effect.fail(
                    new ResourceNotFoundError({
                      message: ErrorKey.GUILD_NOT_FOUND,
                    }),
                  );
                }

                const serialized = JSON.stringify(guild);
                yield* Effect.all([
                  cache.set(
                    getGuildCacheKey(guild.id),
                    serialized,
                    GUILD_CACHE_TTL_SECONDS,
                  ),
                  ...(guild.vanityUrl
                    ? [
                        cache.set(
                          getGuildCacheKey(guild.vanityUrl),
                          serialized,
                          GUILD_CACHE_TTL_SECONDS,
                        ),
                      ]
                    : []),
                ]);
                return guild;
              }),
            ),
          updateGuildConfig: (guildId, payload) =>
            operation(
              Effect.gen(function* () {
                const validationError = validateGuildConfiguration(payload);
                if (validationError) return yield* Effect.fail(validationError);

                const oldRows = yield* database
                  .select()
                  .from(guildTable)
                  .where(eq(guildTable.id, guildId))
                  .limit(1);
                const oldGuild = oldRows[0];
                const storedValidationError =
                  validateGuildConfigurationAgainstStored(payload, oldGuild);
                if (storedValidationError) {
                  return yield* Effect.fail(storedValidationError);
                }

                const updatedRows = yield* database
                  .update(guildTable)
                  .set(buildGuildConfigurationUpdate(payload))
                  .where(eq(guildTable.id, guildId))
                  .returning();
                const guild = updatedRows[0];
                if (!guild) {
                  return yield* Effect.fail(
                    new ResourceNotFoundError({
                      message: ErrorKey.GUILD_NOT_FOUND,
                    }),
                  );
                }
                yield* Effect.all([
                  cache.del(getGuildCacheKey(guildId)),
                  ...(oldGuild?.vanityUrl &&
                  oldGuild.vanityUrl !== guild.vanityUrl
                    ? [cache.del(getGuildCacheKey(oldGuild.vanityUrl))]
                    : []),
                ]);
                return guild;
              }).pipe(
                Effect.withSpan("guild-configuration.update.persistence", {
                  attributes: { adapter: "ApiDatabase", retryCount: 0 },
                }),
              ),
            ),
          getWorldsByGuildId: (guildId) =>
            operation(
              database
                .selectDistinct({ world: timerTable.world })
                .from(timerTable)
                .where(eq(timerTable.guildId, guildId))
                .pipe(Effect.map((rows) => rows.map(({ world }) => world))),
            ),
        });
      }),
    );
  }
}

export interface GuildConfigurationCache {
  readonly get: (key: string) => Effect.Effect<string | null, unknown>;
  readonly set: (
    key: string,
    value: string,
    ttl: number,
  ) => Effect.Effect<void, unknown>;
  readonly del: (key: string) => Effect.Effect<void, unknown>;
}

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError((cause) => new UsersGuildsOperationError({ cause })),
  );

const identity = Effect.flatMap(
  UsersGuildsAuthorization,
  (authorization) => authorization.identity,
);

const data = <A>(
  operation: (
    service: UsersGuildsData["Service"],
  ) => Effect.Effect<A, UsersGuildsOperationError>,
) => Effect.flatMap(UsersGuildsData, operation);

const guildConfigurationData = <A>(
  operation: (
    service: GuildConfigurationData["Service"],
  ) => Effect.Effect<A, UsersGuildsOperationError>,
) => Effect.flatMap(GuildConfigurationData, operation);

const authorizeGuild = (
  guildId: string,
  anyOf: ReadonlyArray<PermissionValue>,
) =>
  Effect.flatMap(UsersGuildsAuthorization, (authorization) =>
    authorization.requireGuild({ guildId, anyOf }),
  );

const defectCause = (error: unknown) =>
  error instanceof UsersGuildsOperationError ? error.cause : error;

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

const isStatus = (error: unknown, status: number) => {
  const cause = defectCause(error);
  if (
    cause instanceof UsersGuildsAccessDenied ||
    cause instanceof UsersGuildsNotFound
  ) {
    return cause.status === status;
  }
  return applicationErrorStatusOrUndefined(cause) === status;
};

const declaredEmptyError = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  statuses: ReadonlyArray<number>,
) =>
  Effect.catch(effect, (error) =>
    statuses.some((status) => isStatus(error, status))
      ? Effect.fail(undefined)
      : Effect.die(defectCause(error)),
  );

export const deleteCurrentAccount = Effect.fn("deleteCurrentAccount")(
  function* () {
    const current = yield* identity;
    yield* data((service) => service.deleteAccount(current));
    return yield* decode(StatusOkResponseDto_Output, { status: "OK" });
  },
);

export const getCurrentUserPreferences = Effect.fn("getCurrentUserPreferences")(
  function* () {
    const current = yield* identity;
    const value = yield* data((service) =>
      service.getUserPreferences(current.userId),
    );
    return yield* decode(UserPreferencesResponseDto_Output, value);
  },
);

export const updateCurrentUserPreferences = Effect.fn(
  "updateCurrentUserPreferences",
)(function* (payload: UpdateUserPreferencesDto) {
  const current = yield* identity;
  const value = yield* data((service) =>
    service.updateUserPreferences(current.userId, payload),
  );
  return yield* decode(UserPreferencesResponseDto_Output, value);
});

export const getCurrentUserGuilds = Effect.fn("getCurrentUserGuilds")(
  function* (accessibleOnly = false) {
    const current = yield* identity;
    const value = yield* data((service) =>
      accessibleOnly
        ? service.getCurrentUserAccessibleGuilds(current)
        : service.getCurrentUserGuilds(current),
    );
    return yield* decode(
      accessibleOnly
        ? UsersControllerGetCurrentUserAccessibleGuilds200
        : UsersControllerGetCurrentUserGuilds200,
      value,
    );
  },
);

export const getCurrentUserGamePreferences = Effect.fn(
  "getCurrentUserGamePreferences",
)(function* (accountId: string) {
  const current = yield* identity;
  const value = yield* data((service) =>
    service.getUserGameAccountPreferences(current.userId, accountId),
  );
  return yield* decode(UserGameAccountPreferencesResponseDto_Output, value);
});

export const updateCurrentUserGamePreferences = Effect.fn(
  "updateCurrentUserGamePreferences",
)(function* (accountId: string, payload: UpdateUserGameAccountPreferencesDto) {
  const current = yield* identity;
  const value = yield* data((service) =>
    service.updateUserGameAccountPreferences(
      current.userId,
      accountId,
      payload,
    ),
  );
  return yield* decode(UserGameAccountPreferencesResponseDto_Output, value);
});

const legacyCurrentGuildList = Effect.fn("legacyCurrentGuildList")(function* (
  source?: string,
) {
  const current = yield* identity;
  const value = yield* data((service) =>
    service.getUserGuilds(current, source),
  );
  return yield* decode(GuildsControllerGetUserGuilds200, value);
});

const currentGuildPermissionsList = Effect.fn("currentGuildPermissionsList")(
  function* () {
    const current = yield* identity;
    const value = yield* data((service) =>
      service.getUserGuildsWithPermissions(current),
    );
    return yield* decode(
      GuildsControllerGetUserGuildsWithPermissions200,
      value,
    );
  },
);

const manageableCurrentGuildList = Effect.fn("manageableCurrentGuildList")(
  function* () {
    const current = yield* identity;
    const value = yield* data((service) =>
      service.getManageableUserGuilds(current),
    );
    return yield* decode(GuildsControllerGetManageableUserGuilds200, value);
  },
);

const guildRead = Effect.fn("guildRead")(function* (guildId: string) {
  const authorized = yield* authorizeGuild(guildId, [
    Permission.LOOTLOG_ACCESS,
  ]);
  const value = yield* guildConfigurationData((service) =>
    service.getGuildById(authorized.guildId),
  );
  return yield* decode(GuildResponseDto_Output, value);
});

export const updateGuildConfiguration = Effect.fn(
  "GuildsControllerUpdateGuildConfig",
)(function* (guildId: string, payload: UpdateGuildConfigDto) {
  const authorized = yield* authorizeGuild(guildId, [
    Permission.OWNER,
    Permission.ADMIN,
  ]);
  const value = yield* guildConfigurationData((service) =>
    service.updateGuildConfig(authorized.guildId, payload),
  );
  return yield* decode(GuildResponseDto_Output, value);
});

const guildWorlds = Effect.fn("GuildsControllerGetWorldsByGuildId")(function* (
  guildId: string,
) {
  const authorized = yield* authorizeGuild(guildId, [
    Permission.LOOTLOG_ACCESS,
  ]);
  const value = yield* guildConfigurationData((service) =>
    service.getWorldsByGuildId(authorized.guildId),
  );
  return yield* decode(GuildsControllerGetWorldsByGuildId200, value);
});

const guildPermissions = Effect.fn("guildPermissions")(function* (
  guildId: string,
) {
  const authorized = yield* authorizeGuild(guildId, [
    Permission.LOOTLOG_ACCESS,
  ]);
  return yield* decode(
    GuildsControllerGetGuildPermissions200,
    authorized.permissions,
  );
});

const guildDiscordSync = Effect.fn("guildDiscordSync")(function* (
  guildId: string,
  refresh: boolean,
) {
  const authorized = yield* authorizeGuild(guildId, [
    Permission.OWNER,
    Permission.ADMIN,
  ]);
  const value = yield* data((service) =>
    refresh
      ? service.refreshGuildDiscordSync(authorized.guildId)
      : service.getGuildDiscordSyncStatus(authorized.guildId),
  );
  const encoded = encodeUnknownResponse(DiscordGuildSyncStateCodec, value);
  return yield* decode(DiscordGuildSyncStateSchema, encoded);
});

export const UsersHandlers = HttpApiBuilder.group(
  LootlogApi,
  "users",
  (handlers) =>
    handlers
      .handle("UsersControllerDeleteAccount", () =>
        Effect.catch(deleteCurrentAccount(), (error) =>
          isStatus(error, 503)
            ? Effect.fail(undefined)
            : Effect.die(defectCause(error)),
        ),
      )
      .handle("UsersControllerGetUserPreferences", () =>
        orDieHttpFailure(getCurrentUserPreferences()),
      )
      .handle("UsersControllerUpdateUserPreferences", ({ payload }) =>
        orDieHttpFailure(updateCurrentUserPreferences(payload)),
      )
      .handle("UsersControllerGetCurrentUserGuilds", () =>
        orDieHttpFailure(getCurrentUserGuilds()),
      )
      .handle("UsersControllerGetCurrentUserAccessibleGuilds", () =>
        orDieHttpFailure(getCurrentUserGuilds(true)),
      )
      .handle("UsersControllerGetUserGameAccountPreferences", ({ params }) =>
        orDieHttpFailure(getCurrentUserGamePreferences(params.accountId)),
      )
      .handle(
        "UsersControllerUpdateUserGameAccountPreferences",
        ({ params, payload }) =>
          orDieHttpFailure(
            updateCurrentUserGamePreferences(params.accountId, payload),
          ),
      ),
);

export const GuildsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "guilds",
  (handlers) =>
    handlers
      .handle("GuildsControllerGetUserGuilds", ({ query }) =>
        orDieHttpFailure(legacyCurrentGuildList(query.source)),
      )
      .handle("GuildsControllerGetUserGuildsWithPermissions", () =>
        orDieHttpFailure(currentGuildPermissionsList()),
      )
      .handle("GuildsControllerGetManageableUserGuilds", () =>
        orDieHttpFailure(manageableCurrentGuildList()),
      )
      .handle("GuildsControllerGetGuildById", ({ params }) =>
        declaredEmptyError(
          guildRead(params.guildId).pipe(
            Effect.withSpan("GuildsControllerGetGuildById", {
              attributes: { operationId: "GuildsControllerGetGuildById" },
            }),
          ),
          [403],
        ),
      )
      .handle("GuildsControllerGetGuildConfig", ({ params }) =>
        orDieHttpFailure(
          guildRead(params.guildId).pipe(
            Effect.withSpan("GuildsControllerGetGuildConfig", {
              attributes: { operationId: "GuildsControllerGetGuildConfig" },
            }),
          ),
        ),
      )
      .handle("GuildsControllerUpdateGuildConfig", ({ params, payload }) =>
        orDieHttpFailure(updateGuildConfiguration(params.guildId, payload)),
      )
      .handle("GuildsControllerGetWorldsByGuildId", ({ params }) =>
        orDieHttpFailure(guildWorlds(params.guildId)),
      )
      .handle("GuildsControllerGetGuildPermissions", ({ params }) =>
        declaredEmptyError(guildPermissions(params.guildId), [403]),
      )
      .handle("GuildsControllerGetGuildDiscordSyncStatus", ({ params }) =>
        orDieHttpFailure(guildDiscordSync(params.guildId, false)),
      )
      .handle("GuildsControllerRefreshGuildDiscordSync", ({ params }) =>
        orDieHttpFailure(guildDiscordSync(params.guildId, true)),
      ),
);
