import { DEFAULT_LOOT_DRAW_EXCLUDED_NPC_TYPES } from "@lootlog/domain/loot-draw";
import { Capability } from "@lootlog/schema/permissions";
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  InternalGuildsData,
  makeInternalGuildsData,
  type InternalGuildsCache,
  type InternalGuildsPersistence,
} from "#src/guilds/internal-guilds-data";
import {
  getGuildByIdOrVanityUrl,
  getUserGuildPermissions,
} from "./internal-guilds-rpc.js";

const emptyPersistence: InternalGuildsPersistence = {
  findActiveMemberIdentity: () => Effect.succeed(null),
  findActiveGuild: () => Effect.succeed(null),
  findGuildsForPermissions: () => Effect.succeed([]),
  findMembersWithRoles: () => Effect.succeed([]),
};

const emptyCache = {
  get: () => Effect.succeed(null),
  set: () => Effect.void,
  getOrSetJsonEffect: ({ factory }) => factory,
  del: () => Effect.void,
} satisfies InternalGuildsCache;

const withData = (
  persistence: InternalGuildsPersistence,
  cache: InternalGuildsCache,
) =>
  Effect.provideService(
    InternalGuildsData,
    makeInternalGuildsData(persistence, cache),
  );

describe("internal guild RPC procedures", () => {
  it("answers an empty identity with no memberships and no data access", async () => {
    let dataCalled = false;

    const memberships = await Effect.runPromise(
      getUserGuildPermissions({ discordId: "", userId: "user-a" }).pipe(
        withData(
          {
            ...emptyPersistence,
            findGuildsForPermissions: () =>
              Effect.sync(() => {
                dataCalled = true;

                return [];
              }),
          },
          emptyCache,
        ),
      ),
    );

    expect(memberships).toEqual([]);
    expect(dataCalled).toBe(false);
  });

  it("projects owned and joined Organizations with the member's role capabilities", async () => {
    const memberships = await Effect.runPromise(
      getUserGuildPermissions({
        discordId: "discord-a",
        userId: "user-a",
      }).pipe(
        withData(
          {
            ...emptyPersistence,
            findGuildsForPermissions: () =>
              Effect.succeed([
                createGuildFixture({ id: "guild-owner", ownerId: "discord-a" }),
                createGuildFixture({
                  id: "guild-member",
                  ownerId: "discord-owner",
                }),
              ]),
            findMembersWithRoles: () =>
              Effect.succeed([
                {
                  ...createMemberFixture({
                    guildId: "guild-member",
                    globalUserId: "user-a",
                  }),
                  roles: [
                    {
                      id: "role-a",
                      guildId: "guild-member",
                      name: "Role",
                      color: null,
                      position: null,
                      createdAt: new Date(0),
                      updatedAt: new Date(0),
                      lvlRangeFrom: 1,
                      lvlRangeTo: 300,
                      permissions: [Capability.LOOTLOG_ACCESS],
                    },
                  ],
                },
              ]),
          },
          emptyCache,
        ),
      ),
    );

    expect(memberships).toEqual([
      {
        guild: { id: "guild-owner", ownerId: "discord-a" },
        roles: [
          expect.objectContaining({
            id: "owner",
            permissions: expect.arrayContaining([Capability.OWNER]),
          }),
        ],
      },
      {
        guild: { id: "guild-member", ownerId: "discord-owner" },
        roles: [
          expect.objectContaining({
            id: "role-a",
            permissions: [Capability.LOOTLOG_ACCESS],
          }),
        ],
      },
    ]);
  });

  it("serves a cached guild without touching the database", async () => {
    let databaseRead = false;

    const guild = await Effect.runPromise(
      getGuildByIdOrVanityUrl({ idOrVanityUrl: "guild-a" }).pipe(
        withData(
          {
            ...emptyPersistence,
            findActiveGuild: () =>
              Effect.sync(() => {
                databaseRead = true;

                return null;
              }),
          },
          {
            ...emptyCache,
            get: () =>
              Effect.succeed(
                JSON.stringify({
                  id: "guild-a",
                  name: "Guild A",
                  ownerId: "discord-owner",
                  publicStatsCardEnabled: false,
                  lootDrawExcludedNpcTypes:
                    DEFAULT_LOOT_DRAW_EXCLUDED_NPC_TYPES,
                }),
              ),
          },
        ),
      ),
    );

    expect(guild).toEqual({
      id: "guild-a",
      name: "Guild A",
      ownerId: "discord-owner",
    });
    expect(databaseRead).toBe(false);
  });

  it("reports an unknown guild as not found", async () => {
    const failure = await Effect.runPromise(
      getGuildByIdOrVanityUrl({ idOrVanityUrl: "missing" }).pipe(
        withData(emptyPersistence, emptyCache),
        Effect.flip,
      ),
    );

    expect(failure._tag).toBe("RpcNotFoundError");
  });
});
