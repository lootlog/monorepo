import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  GuildResponseDto_Output,
  UserPreferencesResponseDto_Output,
} from "../../lootlog-api.generated.js";
import {
  GuildConfigurationData,
  getCurrentUserPreferences,
  updateGuildConfiguration,
  UsersGuildsAccessDenied,
  UsersGuildsAuthorization,
  UsersGuildsData,
  UsersGuildsNotFound,
} from "./users-guilds.handlers.js";

const identity = { userId: "user-a", discordId: "discord-a" };

const userPreferences = {
  userId: identity.userId,
  guildsOrder: ["guild-a"],
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

const guild = {
  id: "guild-a",
  name: "Guild A",
  icon: null,
  vanityUrl: null,
  ownerId: "discord-owner",
  publicStatsCardEnabled: false,
  reservationMaxDurationMinutes: 120,
  reservationMinDurationMinutes: 15,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 14,
  reservationActiveLimitPerSpot: 1,
};

const makeData = (overrides: Partial<UsersGuildsData["Service"]> = {}) =>
  UsersGuildsData.of({
    deleteAccount: () => Effect.succeed(undefined),
    getUserPreferences: () => Effect.succeed(userPreferences),
    updateUserPreferences: () => Effect.succeed(userPreferences),
    getCurrentUserGuilds: () => Effect.succeed([]),
    getCurrentUserAccessibleGuilds: () => Effect.succeed([]),
    getUserGameAccountPreferences: () => Effect.succeed({}),
    updateUserGameAccountPreferences: () => Effect.succeed({}),
    getUserGuilds: () => Effect.succeed([]),
    getUserGuildsWithPermissions: () => Effect.succeed([]),
    getManageableUserGuilds: () => Effect.succeed([]),
    getGuildDiscordSyncStatus: () => Effect.succeed({}),
    refreshGuildDiscordSync: () => Effect.succeed({}),
    ...overrides,
  });

const makeGuildConfigurationData = (
  overrides: Partial<GuildConfigurationData["Service"]> = {},
) =>
  GuildConfigurationData.of({
    getGuildById: () => Effect.succeed(guild),
    updateGuildConfig: () => Effect.succeed(guild),
    getWorldsByGuildId: () => Effect.succeed([]),
    ...overrides,
  });

const makeAuthorization = (
  overrides: Partial<UsersGuildsAuthorization["Service"]> = {},
) =>
  UsersGuildsAuthorization.of({
    identity: Effect.succeed(identity),
    requireGuild: ({ guildId }) =>
      Effect.succeed({
        guildId,
        permissions: [Permission.LOOTLOG_ACCESS],
      }),
    ...overrides,
  });

const provideServices = (
  authorization: UsersGuildsAuthorization["Service"],
  data: UsersGuildsData["Service"],
  guildConfiguration: GuildConfigurationData["Service"] = makeGuildConfigurationData(),
) =>
  Layer.mergeAll(
    Layer.succeed(UsersGuildsAuthorization, authorization),
    Layer.succeed(UsersGuildsData, data),
    Layer.succeed(GuildConfigurationData, guildConfiguration),
  );

describe("Users and Guilds HttpApi handlers", () => {
  it("returns current user preferences through the generated response schema", async () => {
    const userIds: string[] = [];
    const layer = provideServices(
      makeAuthorization(),
      makeData({
        getUserPreferences: (userId) => {
          userIds.push(userId);
          return Effect.succeed(userPreferences);
        },
      }),
    );

    const response = await Effect.runPromise(
      getCurrentUserPreferences().pipe(Effect.provide(layer)),
    );

    expect(userIds).toEqual([identity.userId]);
    expect(response).toEqual(userPreferences);
    expect(Schema.is(UserPreferencesResponseDto_Output)(response)).toBe(true);
  });

  it("fails closed on missing authentication before user data access", async () => {
    const denied = new UsersGuildsAccessDenied({
      status: 401,
      code: "AUTH_REQUIRED",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeAuthorization({ identity: Effect.fail(denied) }),
      makeData({
        getUserPreferences: () => {
          dataCalled = true;
          return Effect.succeed(userPreferences);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(getCurrentUserPreferences().pipe(Effect.provide(layer))),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });

  it("updates only the canonical authorized Organization with OWNER or ADMIN", async () => {
    const authorizationCalls: Array<{
      guildId: string;
      anyOf: ReadonlyArray<string>;
    }> = [];
    const updateCalls: string[] = [];
    const layer = provideServices(
      makeAuthorization({
        requireGuild: (options) => {
          authorizationCalls.push(options);
          return Effect.succeed({
            guildId: "guild-a",
            permissions: [Permission.ADMIN],
          });
        },
      }),
      makeData(),
      makeGuildConfigurationData({
        updateGuildConfig: (guildId) => {
          updateCalls.push(guildId);
          return Effect.succeed(guild);
        },
      }),
    );

    const response = await Effect.runPromise(
      updateGuildConfiguration("guild-alias", {
        publicStatsCardEnabled: false,
      }).pipe(Effect.provide(layer)),
    );

    expect(authorizationCalls).toEqual([
      {
        guildId: "guild-alias",
        anyOf: [Permission.OWNER, Permission.ADMIN],
      },
    ]);
    expect(updateCalls).toEqual(["guild-a"]);
    expect(Schema.is(GuildResponseDto_Output)(response)).toBe(true);
  });

  it("fails closed on forbidden guild access before mutation", async () => {
    const denied = new UsersGuildsAccessDenied({
      status: 403,
      code: "GUILD_MANAGE_REQUIRED",
    });
    let updateCalled = false;
    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(denied) }),
      makeData(),
      makeGuildConfigurationData({
        updateGuildConfig: () => {
          updateCalled = true;
          return Effect.succeed(guild);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        updateGuildConfiguration("guild-a", {}).pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(denied);
    expect(updateCalled).toBe(false);
  });

  it("does not cross the Organization boundary when the guild is not found", async () => {
    const notFound = new UsersGuildsNotFound({
      status: 404,
      code: "GUILD_NOT_FOUND",
    });
    let updateCalled = false;
    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(notFound) }),
      makeData(),
      makeGuildConfigurationData({
        updateGuildConfig: () => {
          updateCalled = true;
          return Effect.succeed(guild);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        updateGuildConfiguration("guild-b", {}).pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(notFound);
    expect(updateCalled).toBe(false);
  });
});
