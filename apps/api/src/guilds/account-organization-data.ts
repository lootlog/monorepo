import type { makeAccessibleGuilds } from "./accessible-guilds.data-layer.js";
import type { makeCurrentUserGuilds } from "./current-user-guilds.data-layer.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type { UpdateUserPreferencesRequest } from "#src/contracts/users/schemas";

export type AuthenticatedIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export class AccountOrganizationOperationError extends TaggedErrorClass<AccountOrganizationOperationError>()(
  "AccountOrganizationOperationError",
  { cause: Schema.Defect() },
) {}

type DataEffect = Effect.Effect<unknown, AccountOrganizationOperationError>;

export class AccountOrganizationData extends Context.Service<
  AccountOrganizationData,
  {
    readonly deleteAccount: (identity: AuthenticatedIdentity) => DataEffect;
    readonly getUserPreferences: (userId: string) => DataEffect;
    readonly userOwnsTheme: (
      userId: string,
      themeId: string,
    ) => Effect.Effect<boolean, AccountOrganizationOperationError>;
    readonly updateUserPreferences: (
      userId: string,
      payload: UpdateUserPreferencesRequest,
    ) => DataEffect;
    readonly getCurrentUserGuilds: ReturnType<typeof makeCurrentUserGuilds>;
    readonly getCurrentUserAccessibleGuilds: ReturnType<
      typeof makeAccessibleGuilds
    >;
    readonly getManageableUserGuilds: (
      identity: AuthenticatedIdentity,
    ) => DataEffect;
    readonly getGuildDiscordSyncStatus: (guildId: string) => DataEffect;
    readonly refreshGuildDiscordSync: (guildId: string) => DataEffect;
  }
>()("@lootlog/api/http-api/account-organization/data") {}
