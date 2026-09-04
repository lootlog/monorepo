import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Predicate, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { decodeJsonUnknown } from "#src/shared/schema/json";
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
import { getGuildCacheKey, GUILD_CACHE_TTL_SECONDS } from "#src/shared/cache";
import { generateSlug } from "#src/shared/generate-slug";
import { RESTRICTED_VANITY_URLS } from "#src/guilds/restricted-vanity-urls";
import { ErrorKey } from "#src/guilds/error-key";
import {
  DiscordGuildSyncStateResponseDto as DiscordGuildSyncStateSchema,
  GuildsControllerGetGuildPermissions200,
  GuildsControllerGetManageableUserGuilds200,
  GuildsControllerGetUserGuilds200,
  GuildsControllerGetUserGuildsWithPermissions200,
  GuildsControllerGetWorldsByGuildId200,
  type UpdateGuildConfigDto,
} from "../../contracts/guilds/schemas.js";
import {
  GuildResponseDto_Output,
  StatusOkResponseDto_Output,
} from "../../contracts/shared.js";
import {
  UserGameAccountPreferencesResponseDto_Output,
  UserPreferencesResponseDto_Output,
  UsersControllerGetCurrentUserAccessibleGuilds200,
  UsersControllerGetCurrentUserGuilds200,
  type UpdateUserGameAccountPreferencesDto,
  type UpdateUserPreferencesDto,
} from "../../contracts/users/schemas.js";

export type AuthenticatedIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type AuthorizedGuild = {
  readonly guildId: string;
  readonly permissions: ReadonlyArray<PermissionValue>;
};

export class AccountOrganizationAccessDenied extends TaggedErrorClass<AccountOrganizationAccessDenied>()(
  "AccountOrganizationAccessDenied",
  {
    status: Schema.Literals([401, 403]),
    code: Schema.String,
  },
) {}

export class AccountOrganizationNotFound extends TaggedErrorClass<AccountOrganizationNotFound>()(
  "AccountOrganizationNotFound",
  {
    status: Schema.Literal(404),
    code: Schema.String,
  },
) {}

export class AccountOrganizationOperationError extends TaggedErrorClass<AccountOrganizationOperationError>()(
  "AccountOrganizationOperationError",
  { cause: Schema.Defect() },
) {}

type AuthorizationFailure =
  | AccountOrganizationAccessDenied
  | AccountOrganizationNotFound;

export class AccountOrganizationAuthorization extends Context.Service<
  AccountOrganizationAuthorization,
  {
    readonly identity: Effect.Effect<
      AuthenticatedIdentity,
      AccountOrganizationAccessDenied
    >;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly anyOf: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<AuthorizedGuild, AuthorizationFailure>;
  }
>()("@lootlog/api/http-api/account-organization/authorization") {}

type DataEffect = Effect.Effect<unknown, AccountOrganizationOperationError>;

export class AccountOrganizationData extends Context.Service<
  AccountOrganizationData,
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
>()("@lootlog/api/http-api/account-organization/data") {}

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
  ...(Object.hasOwn(payload, "vanityUrl")
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
              (cause) => new AccountOrganizationOperationError({ cause }),
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
    Effect.mapError(
      (cause) => new AccountOrganizationOperationError({ cause }),
    ),
  );

const identity = Effect.flatMap(
  AccountOrganizationAuthorization,
  (authorization) => authorization.identity,
);

const data = <A>(
  operation: (
    service: AccountOrganizationData["Service"],
  ) => Effect.Effect<A, AccountOrganizationOperationError>,
) => Effect.flatMap(AccountOrganizationData, operation);

const guildConfigurationData = <A>(
  operation: (
    service: GuildConfigurationData["Service"],
  ) => Effect.Effect<A, AccountOrganizationOperationError>,
) => Effect.flatMap(GuildConfigurationData, operation);

const authorizeGuild = (
  guildId: string,
  anyOf: ReadonlyArray<PermissionValue>,
) =>
  Effect.flatMap(AccountOrganizationAuthorization, (authorization) =>
    authorization.requireGuild({ guildId, anyOf }),
  );

type AccountOrganizationFailure =
  | AccountOrganizationAccessDenied
  | AccountOrganizationNotFound
  | AccountOrganizationOperationError;

const taggedHttpStatus = (error: unknown): number | undefined => {
  if (Schema.is(AccountOrganizationAccessDenied)(error)) return error.status;
  if (Schema.is(AccountOrganizationNotFound)(error)) return error.status;
  return applicationErrorStatusOrUndefined(error);
};

export const toAccountOrganizationHttpResponse = <A, R>(
  effect: Effect.Effect<A, AccountOrganizationFailure, R>,
) =>
  Effect.catchTags(effect, {
    AccountOrganizationAccessDenied: (error) =>
      Effect.succeed(HttpServerResponse.empty({ status: error.status })),
    AccountOrganizationNotFound: (error) =>
      Effect.succeed(HttpServerResponse.empty({ status: error.status })),
    AccountOrganizationOperationError: (error) => {
      const status = taggedHttpStatus(error.cause);
      return status === undefined
        ? Effect.die(error.cause)
        : Effect.succeed(HttpServerResponse.empty({ status }));
    },
  });

export const toDeclaredAccountOrganizationError = <A, R>(
  effect: Effect.Effect<A, AccountOrganizationFailure, R>,
  statuses: ReadonlyArray<number>,
) =>
  Effect.catchTags(effect, {
    AccountOrganizationAccessDenied: (error) =>
      statuses.includes(error.status)
        ? Effect.fail(undefined)
        : Effect.die(error),
    AccountOrganizationNotFound: (error) =>
      statuses.includes(error.status)
        ? Effect.fail(undefined)
        : Effect.die(error),
    AccountOrganizationOperationError: (error) =>
      statuses.includes(taggedHttpStatus(error.cause) ?? 0)
        ? Effect.fail(undefined)
        : Effect.die(error.cause),
  });

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

export const legacyCurrentGuildList = Effect.fn("legacyCurrentGuildList")(
  function* (source?: string) {
    const current = yield* identity;
    const value = yield* data((service) =>
      service.getUserGuilds(current, source),
    );
    return yield* decode(GuildsControllerGetUserGuilds200, value);
  },
);

export const currentGuildPermissionsList = Effect.fn(
  "currentGuildPermissionsList",
)(function* () {
  const current = yield* identity;
  const value = yield* data((service) =>
    service.getUserGuildsWithPermissions(current),
  );
  return yield* decode(GuildsControllerGetUserGuildsWithPermissions200, value);
});

export const manageableCurrentGuildList = Effect.fn(
  "manageableCurrentGuildList",
)(function* () {
  const current = yield* identity;
  const value = yield* data((service) =>
    service.getManageableUserGuilds(current),
  );
  return yield* decode(GuildsControllerGetManageableUserGuilds200, value);
});

export const guildRead = Effect.fn("guildRead")(function* (guildId: string) {
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

export const guildWorlds = Effect.fn("GuildsControllerGetWorldsByGuildId")(
  function* (guildId: string) {
    const authorized = yield* authorizeGuild(guildId, [
      Permission.LOOTLOG_ACCESS,
    ]);
    const value = yield* guildConfigurationData((service) =>
      service.getWorldsByGuildId(authorized.guildId),
    );
    return yield* decode(GuildsControllerGetWorldsByGuildId200, value);
  },
);

export const guildPermissions = Effect.fn("guildPermissions")(function* (
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

export const guildDiscordSync = Effect.fn("guildDiscordSync")(function* (
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

export const deleteCurrentAccountHttpResponse = () =>
  toDeclaredAccountOrganizationError(deleteCurrentAccount(), [503]);
