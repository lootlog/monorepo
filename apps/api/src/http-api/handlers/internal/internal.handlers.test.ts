import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import type { RedisService } from "#src/redis/redis.service";
import type { GuildsRepository } from "#src/guilds/guilds.repository";
import type { MembersRepository } from "#src/members/members.repository";
import { Permission } from "@lootlog/schema/permissions";
import {
  GuildsInternalControllerGetGuildByIdOrVanityUrl200,
  GuildsInternalControllerGetUserPermissions200,
} from "../../lootlog-api.generated.js";
import {
  getInternalGuild,
  getInternalUserPermissions,
  InternalGuildsData,
} from "./internal.handlers.js";

const guild = {
  id: "guild-a",
  name: "Guild A",
  icon: null,
  vanityUrl: "guild-a",
  ownerId: "discord-owner",
  publicStatsCardEnabled: false,
  reservationMaxDurationMinutes: 120,
  reservationMinDurationMinutes: 15,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 14,
  reservationActiveLimitPerSpot: 1,
};

describe("internal guild HttpApi handlers", () => {
  it("preserves the unauthenticated gateway permission lookup contract", async () => {
    const calls: Array<[string, string]> = [];
    const permissions = [
      {
        guild: { id: "guild-a", ownerId: "discord-owner" },
        roles: [],
      },
    ];
    const data = InternalGuildsData.of({
      getUserPermissions: (discordId, userId) => {
        calls.push([discordId, userId]);
        return Effect.succeed(permissions);
      },
      getGuild: () => Effect.succeed(guild),
    });

    const response = await Effect.runPromise(
      getInternalUserPermissions("discord-a", "user-a").pipe(
        Effect.provide(Layer.succeed(InternalGuildsData, data)),
      ),
    );
    expect(calls).toEqual([["discord-a", "user-a"]]);
    expect(
      Schema.is(GuildsInternalControllerGetUserPermissions200)(response),
    ).toBe(true);
  });

  it("keeps empty internal identities as an empty result without data access", async () => {
    let dataCalled = false;
    const data = InternalGuildsData.of({
      getUserPermissions: () => {
        dataCalled = true;
        return Effect.succeed([]);
      },
      getGuild: () => Effect.succeed(guild),
    });

    const response = await Effect.runPromise(
      getInternalUserPermissions("", "user-a").pipe(
        Effect.provide(Layer.succeed(InternalGuildsData, data)),
      ),
    );
    expect(response).toEqual([]);
    expect(dataCalled).toBe(false);
  });

  it("resolves a public internal guild alias through the generated schema", async () => {
    const data = InternalGuildsData.of({
      getUserPermissions: () => Effect.succeed([]),
      getGuild: () => Effect.succeed(guild),
    });
    const response = await Effect.runPromise(
      getInternalGuild("guild-a").pipe(
        Effect.provide(Layer.succeed(InternalGuildsData, data)),
      ),
    );
    expect(
      Schema.is(GuildsInternalControllerGetGuildByIdOrVanityUrl200)(response),
    ).toBe(true);
  });

  it("builds the established owner and member permission projection from repositories", async () => {
    const cached: unknown[] = [];
    const data = InternalGuildsData.makeRepositories({
      guilds: {
        findForPermissions: async () => [
          { id: "guild-owner", ownerId: "discord-a" },
          { id: "guild-member", ownerId: "discord-owner" },
        ],
      } as unknown as GuildsRepository,
      members: {
        findMembersByUserGuildIds: async () => [
          {
            guildId: "guild-member",
            active: true,
            roles: [
              {
                id: "role-a",
                lvlRangeFrom: 1,
                lvlRangeTo: 300,
                permissions: [Permission.LOOTLOG_ACCESS],
              },
            ],
          },
        ],
      } as unknown as MembersRepository,
      redis: {
        getJson: async () => null,
        setJson: async (_key: string, value: unknown) => {
          cached.push(value);
        },
      } as unknown as RedisService,
    });

    const response = await Effect.runPromise(
      data.getUserPermissions("discord-a", "user-a"),
    );
    expect(
      Schema.is(GuildsInternalControllerGetUserPermissions200)(response),
    ).toBe(true);
    expect(response).toHaveLength(2);
    expect(cached).toEqual([response]);
  });

  it("preserves cached guild defaults without touching the database", async () => {
    let databaseRead = false;
    const data = InternalGuildsData.makeRepositories({
      guilds: {
        findActive: async () => {
          databaseRead = true;
          return null;
        },
      } as unknown as GuildsRepository,
      members: {} as MembersRepository,
      redis: {
        get: async () =>
          JSON.stringify({
            id: "guild-a",
            name: "Guild A",
            ownerId: "discord-owner",
            publicStatsCardEnabled: false,
          }),
      } as unknown as RedisService,
    });

    const response = await Effect.runPromise(data.getGuild("guild-a"));
    expect(
      Schema.is(GuildsInternalControllerGetGuildByIdOrVanityUrl200)(response),
    ).toBe(true);
    expect(databaseRead).toBe(false);
  });
});
