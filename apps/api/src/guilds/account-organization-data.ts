import type { makeAccessibleGuilds } from "./accessible-guilds.data-layer.js";
import type { makeCurrentUserGuilds } from "./current-user-guilds.data-layer.js";
import type { makeManageableGuilds } from "./manageable-guilds.data-layer.js";
import type { makeGuildDiscordSyncData } from "./guild-discord-sync.data-layer.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type { UpdateUserPreferencesRequest } from "#src/contracts/users/schemas";
import type { UserPreferences } from "@lootlog/schema/user-preferences";

export type AuthenticatedIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export class AccountOrganizationOperationError extends TaggedErrorClass<
  AccountOrganizationOperationError,
  { readonly brand: unique symbol }
>()("AccountOrganizationOperationError", { cause: Schema.Defect() }) {}

type DataEffect<A> = Effect.Effect<A, AccountOrganizationOperationError>;

type GuildDiscordSync = ReturnType<typeof makeGuildDiscordSyncData>;

export class AccountOrganizationData extends Context.Service<
  AccountOrganizationData,
  {
    readonly deleteAccount: (
      identity: AuthenticatedIdentity,
    ) => DataEffect<void>;
    readonly getUserPreferences: (
      userId: string,
    ) => DataEffect<UserPreferences>;
    readonly userOwnsTheme: (
      userId: string,
      themeId: string,
    ) => Effect.Effect<boolean, AccountOrganizationOperationError>;
    readonly updateUserPreferences: (
      userId: string,
      payload: UpdateUserPreferencesRequest,
    ) => DataEffect<UserPreferences>;
    readonly getCurrentUserGuilds: ReturnType<typeof makeCurrentUserGuilds>;
    readonly getCurrentUserAccessibleGuilds: ReturnType<
      typeof makeAccessibleGuilds
    >;
    readonly getManageableUserGuilds: ReturnType<typeof makeManageableGuilds>;
    readonly getGuildDiscordSyncStatus: GuildDiscordSync["getGuildDiscordSyncStatus"];
    readonly refreshGuildDiscordSync: GuildDiscordSync["refreshGuildDiscordSync"];
  }
>()("@lootlog/api/http-api/account-organization/data") {}
