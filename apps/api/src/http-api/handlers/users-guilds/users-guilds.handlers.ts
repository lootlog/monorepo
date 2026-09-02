import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import type { GuildsService } from "#src/guilds/guilds.service";
import type { UpdateGuildConfigDto as LegacyUpdateGuildConfigDto } from "#src/guilds/dto/update-guild-config.dto";
import type { UpdateUserGameAccountPreferencesDto as LegacyUpdateUserGameAccountPreferencesDto } from "#src/users/dto/update-user-account-preferences.dto";
import type { UpdateUserPreferencesDto as LegacyUpdateUserPreferencesDto } from "#src/users/dto/update-user-preferences.dto";
import type { UsersService } from "#src/users/users.service";
import {
  DiscordGuildSyncStateResponseDto,
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
} from "../../lootlog-api.generated.js";

export type AuthenticatedIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type AuthorizedGuild = {
  readonly guildId: string;
  readonly permissions: ReadonlyArray<PermissionValue>;
};

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class UsersGuildsAccessDenied extends Schema.TaggedError<UsersGuildsAccessDenied>()(
  "UsersGuildsAccessDenied",
  {
    status: Schema.Literals([401, 403]),
    code: Schema.String,
  },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class UsersGuildsNotFound extends Schema.TaggedError<UsersGuildsNotFound>()(
  "UsersGuildsNotFound",
  {
    status: Schema.Literal(404),
    code: Schema.String,
  },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class UsersGuildsOperationError extends Schema.TaggedError<UsersGuildsOperationError>()(
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

const mutableDto = <A>(value: unknown): A =>
  JSON.parse(JSON.stringify(value)) as A;

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
>()("@lootlog/api/http-api/users-guilds/data") {
  static layerServices(users: UsersService, guilds: GuildsService) {
    const attempt = (operation: () => PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new UsersGuildsOperationError({ cause }),
      });

    return Layer.succeed(
      UsersGuildsData,
      UsersGuildsData.of({
        deleteAccount: ({ userId, discordId }) =>
          attempt(() => users.deleteAccount({ authUserId: userId, discordId })),
        getUserPreferences: (userId) =>
          attempt(() => users.getUserPreferences(userId)),
        updateUserPreferences: (userId, payload) =>
          attempt(() =>
            users.updateUserPreferences(
              userId,
              mutableDto<LegacyUpdateUserPreferencesDto>(payload),
            ),
          ),
        getCurrentUserGuilds: ({ userId, discordId }) =>
          attempt(() => users.getCurrentUserGuilds(discordId, userId)),
        getCurrentUserAccessibleGuilds: ({ userId, discordId }) =>
          attempt(() =>
            users.getCurrentUserAccessibleGuilds(discordId, userId),
          ),
        getUserGameAccountPreferences: (userId, accountId) =>
          attempt(() => users.getUserGameAccountPreferences(userId, accountId)),
        updateUserGameAccountPreferences: (userId, accountId, payload) =>
          attempt(() =>
            users.updateUserGameAccountPreferences(
              userId,
              accountId,
              mutableDto<LegacyUpdateUserGameAccountPreferencesDto>(payload),
            ),
          ),
        getUserGuilds: ({ userId, discordId }, source) =>
          attempt(() => guilds.getUserGuilds(discordId, userId, source)),
        getUserGuildsWithPermissions: ({ userId, discordId }) =>
          attempt(() => guilds.getUserGuildsWithPermissions(discordId, userId)),
        getManageableUserGuilds: ({ userId, discordId }) =>
          attempt(() => guilds.getManageableUserGuilds(discordId, userId)),
        getGuildDiscordSyncStatus: (guildId) =>
          attempt(() => guilds.getGuildDiscordSyncStatus(guildId)),
        refreshGuildDiscordSync: (guildId) =>
          attempt(() => guilds.refreshGuildDiscordSync(guildId)),
      }),
    );
  }
}

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
  static makeService(
    service: Pick<
      GuildsService,
      "getGuildById" | "updateGuildConfig" | "getWorldsByGuildId"
    >,
  ): GuildConfigurationData["Service"] {
    const attempt = (operation: () => PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new UsersGuildsOperationError({ cause }),
      });

    return GuildConfigurationData.of({
      getGuildById: (guildId) => attempt(() => service.getGuildById(guildId)),
      updateGuildConfig: (guildId, payload) =>
        attempt(() =>
          service.updateGuildConfig(
            guildId,
            mutableDto<LegacyUpdateGuildConfigDto>(payload),
          ),
        ),
      getWorldsByGuildId: (guildId) =>
        attempt(() => service.getWorldsByGuildId(guildId)),
    });
  }
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
  return (
    typeof cause === "object" &&
    cause !== null &&
    "getStatus" in cause &&
    typeof cause.getStatus === "function" &&
    cause.getStatus() === status
  );
};

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

export const updateGuildConfiguration = Effect.fn("updateGuildConfiguration")(
  function* (guildId: string, payload: UpdateGuildConfigDto) {
    const authorized = yield* authorizeGuild(guildId, [
      Permission.OWNER,
      Permission.ADMIN,
    ]);
    const value = yield* guildConfigurationData((service) =>
      service.updateGuildConfig(authorized.guildId, payload),
    );
    return yield* decode(GuildResponseDto_Output, value);
  },
);

const guildWorlds = Effect.fn("guildWorlds")(function* (guildId: string) {
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
  return yield* decode(DiscordGuildSyncStateResponseDto, value);
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
        orDieHttpFailure(guildRead(params.guildId)),
      )
      .handle("GuildsControllerGetGuildConfig", ({ params }) =>
        orDieHttpFailure(guildRead(params.guildId)),
      )
      .handle("GuildsControllerUpdateGuildConfig", ({ params, payload }) =>
        orDieHttpFailure(updateGuildConfiguration(params.guildId, payload)),
      )
      .handle("GuildsControllerGetWorldsByGuildId", ({ params }) =>
        orDieHttpFailure(guildWorlds(params.guildId)),
      )
      .handle("GuildsControllerGetGuildPermissions", ({ params }) =>
        orDieHttpFailure(guildPermissions(params.guildId)),
      )
      .handle("GuildsControllerGetGuildDiscordSyncStatus", ({ params }) =>
        orDieHttpFailure(guildDiscordSync(params.guildId, false)),
      )
      .handle("GuildsControllerRefreshGuildDiscordSync", ({ params }) =>
        orDieHttpFailure(guildDiscordSync(params.guildId, true)),
      ),
);
