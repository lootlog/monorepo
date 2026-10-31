import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  AccountOrganizationAuthorization,
  AccountOrganizationData,
  AccountOrganizationOperationError,
} from "../account-organization/account-organization.operations.js";
import {
  SettingsData,
  SettingsIdentity,
} from "../settings/settings.operations.js";
import {
  UserLootlogConfigData,
  UserLootlogConfigIdentity,
  UserLootlogConfigOperationError,
} from "../user-lootlog-config/user-lootlog-config.handlers.js";
import { getGameClientBootstrap } from "./game-client-bootstrap.operations.js";

const identity = { userId: "user-a", discordId: "discord-a" };

const accessibleGuild = {
  id: "guild-a",
  name: "Guild A",
  icon: null,
  vanityUrl: null,
  ownerId: "discord-owner",
  publicStatsCardEnabled: false,
  hasLootlogAccess: true,
  isAccessDataStale: false,
};

const userPreferences = {
  userId: identity.userId,
  guildsOrder: [],
  hiddenGuildIds: [],
  theme: "default",
  chatAppearance: {
    npcLayout: "tile" as const,
    fontScalePercent: 100,
    messageGapPx: 4,
    showTimestamp: true,
    showGuildLabel: true,
    showNpcAvatar: true,
    showNpcLevel: true,
    showNpcLocationAndCoordinates: true,
  },
  mutes: { players: [], npcs: [] },
};

const failure = (cause: string) => Effect.fail(new Error(cause));

const notReadAtStartup = () => Effect.die(new Error("not read at startup"));

type StartupReads = {
  readonly accessibleGuilds?: Effect.Effect<unknown, Error>;
  readonly lootlogConfig?: Effect.Effect<unknown, Error>;
  readonly guildPreferenceQueries?: unknown[];
};

const run = ({
  accessibleGuilds = Effect.succeed([accessibleGuild]),
  lootlogConfig = Effect.succeed({}),
  guildPreferenceQueries = [],
}: StartupReads = {}) =>
  Effect.runPromise(
    getGameClientBootstrap({ gameAccountId: "202", characterId: "7" }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.succeed(
            AccountOrganizationAuthorization,
            AccountOrganizationAuthorization.of({
              identity: Effect.succeed(identity),
              requireGuild: ({ guildId }) =>
                Effect.succeed({
                  guildId,
                  permissions: [Permission.LOOTLOG_ACCESS],
                }),
            }),
          ),
          Layer.succeed(
            AccountOrganizationData,
            AccountOrganizationData.of({
              deleteAccount: notReadAtStartup,
              getUserPreferences: () => Effect.succeed(userPreferences),
              userOwnsTheme: notReadAtStartup,
              updateUserPreferences: notReadAtStartup,
              getCurrentUserGuilds: notReadAtStartup,
              getCurrentUserAccessibleGuilds: () =>
                Effect.mapError(
                  accessibleGuilds,
                  (cause) => new AccountOrganizationOperationError({ cause }),
                ),
              getUserGameAccountPreferences: notReadAtStartup,
              updateUserGameAccountPreferences: notReadAtStartup,
              getUserGuilds: notReadAtStartup,
              getUserGuildsWithPermissions: notReadAtStartup,
              getManageableUserGuilds: notReadAtStartup,
              getGuildDiscordSyncStatus: notReadAtStartup,
              refreshGuildDiscordSync: notReadAtStartup,
            }),
          ),
          Layer.succeed(
            SettingsIdentity,
            SettingsIdentity.of({ userId: Effect.succeed(identity.userId) }),
          ),
          Layer.succeed(
            SettingsData,
            SettingsData.of({
              getGlobalTimerSettings: notReadAtStartup,
              updateGlobalTimerSettings: notReadAtStartup,
              getGuildTimerSettings: notReadAtStartup,
              updateGuildTimerSettings: notReadAtStartup,
              migrateTimerSettings: notReadAtStartup,
              getPreferences: () => Effect.succeed({ domains: {} }),
              getGuildPreferences: (_userId, query) => {
                guildPreferenceQueries.push(query);

                return Effect.succeed({ guilds: {} });
              },
              patchPreferences: notReadAtStartup,
              getSoundSettings: notReadAtStartup,
              updateSoundSettings: notReadAtStartup,
            }),
          ),
          Layer.succeed(
            UserLootlogConfigIdentity,
            UserLootlogConfigIdentity.of({
              discordId: Effect.succeed(identity.discordId),
            }),
          ),
          Layer.succeed(
            UserLootlogConfigData,
            UserLootlogConfigData.of({
              getAccount: () =>
                Effect.mapError(
                  lootlogConfig,
                  (cause) => new UserLootlogConfigOperationError({ cause }),
                ),
              upsertCharacter: notReadAtStartup,
              getPlayersCatchingGuilds: notReadAtStartup,
            }),
          ),
        ),
      ),
    ),
  );

describe("getGameClientBootstrap", () => {
  it("reads the timer documents of exactly the accessible guilds", async () => {
    const guildPreferenceQueries: unknown[] = [];

    const response = await run({ guildPreferenceQueries });

    expect(guildPreferenceQueries).toEqual([
      { domains: "timers", guildIds: "guild-a" },
    ]);
    expect(response.accessibleGuilds).toEqual([accessibleGuild]);
    expect(response.guildTimerDocuments).toEqual({ guilds: {} });
  });

  it("reports a failed part as unavailable instead of empty or failing the rest", async () => {
    const response = await run({ lootlogConfig: failure("database down") });

    expect(response.lootlogConfig).toBeNull();
    expect(response.userPreferences).toEqual(userPreferences);
    expect(response.settingsDocuments).toEqual({ domains: {} });
    expect(response.accessibleGuilds).toEqual([accessibleGuild]);
  });

  it("leaves the guild documents unavailable when the guild list is", async () => {
    const guildPreferenceQueries: unknown[] = [];

    const response = await run({
      accessibleGuilds: failure("discord down"),
      guildPreferenceQueries,
    });

    expect(response.accessibleGuilds).toBeNull();
    expect(response.guildTimerDocuments).toBeNull();
    expect(guildPreferenceQueries).toEqual([]);
  });
});
