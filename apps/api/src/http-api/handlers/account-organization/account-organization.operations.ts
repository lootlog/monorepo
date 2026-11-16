import { GuildConfigurationData } from "#src/guilds/guild-configuration-data";
import {
  type AuthenticatedIdentity,
  AccountOrganizationOperationError,
  AccountOrganizationData,
} from "#src/guilds/account-organization-data";
import { AccessRequirement } from "@lootlog/domain/access-policy";

import {
  statusCodeResponse,
  reauthenticationRequiredResponse,
} from "#src/shared/http/handler-response";

import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Cause, Context, Effect, Predicate, Schema } from "effect";
import { applicationErrorResponse } from "../../application-error-response.js";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import { SqlError } from "effect/sql/SqlError";

import { DiscordGuildSyncStateResponse as DiscordGuildSyncStateCodec } from "#src/shared/schema/discord-guild-sync";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";

import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { CUSTOM_THEME_PREFERENCE_PREFIX } from "@lootlog/schema/custom-theme";

import { ResourceConflictError } from "#src/shared/http/http-errors";

import { ErrorKey } from "#src/guilds/error-key";
import {
  DiscordGuildSyncStateResponse as DiscordGuildSyncStateSchema,
  OrganizationCapabilitiesResponse,
  ManageableOrganizationsResponse,
  OrganizationWorldsResponse,
  type UpdateOrganizationConfigRequest,
} from "#src/contracts/guilds/schemas";

import { OrganizationSummary } from "#src/contracts/shared";
import {
  AccountDeletionAccepted,
  UserPreferencesResponse,
  CurrentOrganizationsResponse,
  type UpdateUserPreferencesRequest,
} from "#src/contracts/users/schemas";
import type { ReauthenticationRequired } from "#src/http-api/contracts/shared";

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

type AuthorizationFailure =
  | AccountOrganizationAccessDenied
  | AccountOrganizationNotFound
  | ReauthenticationRequired;

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
  | AccountOrganizationOperationError
  | ReauthenticationRequired;

export const toAccountOrganizationHttpResponse = <A, R>(
  effect: Effect.Effect<A, AccountOrganizationFailure, R>,
) =>
  Effect.catchTags(effect, {
    AccountOrganizationAccessDenied: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    AccountOrganizationNotFound: statusCodeResponse,
    AccountOrganizationOperationError: (error) => {
      const cause = error.cause;
      let databaseCause: unknown;

      if (cause instanceof EffectDrizzleQueryError) {
        databaseCause = Cause.isCause(cause.cause)
          ? Cause.squash(cause.cause)
          : cause.cause;
      }

      if (
        databaseCause instanceof SqlError &&
        Predicate.isTagged(databaseCause.reason, "UniqueViolation") &&
        databaseCause.reason.constraint === "Guild_vanityUrl_key"
      ) {
        return applicationErrorResponse(
          new ResourceConflictError({
            code: ErrorKey.GUILDS_VANITY_URL_TAKEN,
          }),
        );
      }

      return applicationErrorResponse(cause);
    },
  });

const deleteCurrentAccount = Effect.fn("deleteCurrentAccount")(function* () {
  const current = yield* identity;
  yield* data((service) => service.deleteAccount(current));

  return yield* decode(AccountDeletionAccepted, { status: "ACCEPTED" });
});

export const getCurrentUserPreferences = Effect.fn("getCurrentUserPreferences")(
  function* () {
    const current = yield* identity;

    const value = yield* data((service) =>
      service.getUserPreferences(current.userId),
    );

    return yield* decode(UserPreferencesResponse, value);
  },
);

export const updateCurrentUserPreferences = Effect.fn(
  "updateCurrentUserPreferences",
)(function* (payload: UpdateUserPreferencesRequest) {
  const current = yield* identity;

  // A User may select only their own theme; another User's id reads as missing.
  if (payload.theme?.startsWith(CUSTOM_THEME_PREFERENCE_PREFIX)) {
    const themeId = payload.theme.slice(CUSTOM_THEME_PREFERENCE_PREFIX.length);

    const owned = yield* data((service) =>
      service.userOwnsTheme(current.userId, themeId),
    );

    if (!owned) {
      return yield* new AccountOrganizationNotFound({
        status: 404,
        code: "USER_THEME_NOT_FOUND",
      });
    }
  }

  const value = yield* data((service) =>
    service.updateUserPreferences(current.userId, payload),
  );

  return yield* decode(UserPreferencesResponse, value);
});

export const getCurrentUserGuilds = Effect.fn("getCurrentUserGuilds")(
  function* (refresh: boolean) {
    const current = yield* identity;

    const value = yield* data((service) =>
      service.getCurrentUserGuilds(current, refresh),
    );

    return yield* decode(CurrentOrganizationsResponse, value);
  },
);

export const getCurrentUserAccessibleGuilds = Effect.fn(
  "getCurrentUserAccessibleGuilds",
)(function* () {
  const current = yield* identity;

  const value = yield* data((service) =>
    service.getCurrentUserAccessibleGuilds(current),
  );

  return yield* decode(CurrentOrganizationsResponse, value);
});

export const manageableCurrentGuildList = Effect.fn(
  "manageableCurrentGuildList",
)(function* () {
  const current = yield* identity;

  const value = yield* data((service) =>
    service.getManageableUserGuilds(current),
  );

  return yield* decode(ManageableOrganizationsResponse, value);
});

export const guildRead = Effect.fn("guildRead")(function* (guildId: string) {
  const authorized = yield* authorizeGuild(guildId, [
    Permission.LOOTLOG_ACCESS,
  ]);

  const value = yield* guildConfigurationData((service) =>
    service.getGuildById(authorized.guildId),
  );

  return yield* decode(OrganizationSummary, value);
});

export const updateGuildConfiguration = Effect.fn(
  "GuildsControllerUpdateGuildConfig",
)(function* (guildId: string, payload: UpdateOrganizationConfigRequest) {
  const authorized = yield* authorizeGuild(
    guildId,
    AccessRequirement.ADMINISTER,
  );

  const value = yield* guildConfigurationData((service) =>
    service.updateGuildConfig(authorized.guildId, payload),
  );

  return yield* decode(OrganizationSummary, value);
});

export const guildWorlds = Effect.fn("GuildsControllerGetWorldsByGuildId")(
  function* (guildId: string) {
    const authorized = yield* authorizeGuild(guildId, [
      Permission.LOOTLOG_ACCESS,
    ]);

    const value = yield* guildConfigurationData((service) =>
      service.getWorldsByGuildId(authorized.guildId),
    );

    return yield* decode(OrganizationWorldsResponse, value);
  },
);

export const guildPermissions = Effect.fn("guildPermissions")(function* (
  guildId: string,
) {
  const authorized = yield* authorizeGuild(guildId, [
    Permission.LOOTLOG_ACCESS,
  ]);

  return yield* decode(
    OrganizationCapabilitiesResponse,
    authorized.permissions,
  );
});

export const guildDiscordSync = Effect.fn("guildDiscordSync")(function* (
  guildId: string,
  refresh: boolean,
) {
  const authorized = yield* authorizeGuild(
    guildId,
    AccessRequirement.ADMINISTER,
  );

  const value = yield* data((service) =>
    refresh
      ? service.refreshGuildDiscordSync(authorized.guildId)
      : service.getGuildDiscordSyncStatus(authorized.guildId),
  );

  const encoded = encodeUnknownResponse(DiscordGuildSyncStateCodec, value);

  return yield* decode(DiscordGuildSyncStateSchema, encoded);
});

export const deleteCurrentAccountHttpResponse = () =>
  toAccountOrganizationHttpResponse(deleteCurrentAccount());
