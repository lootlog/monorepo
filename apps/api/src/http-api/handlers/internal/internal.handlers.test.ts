import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { decodeDomainJson } from "../../domain-json.schema.js";
import { Permission } from "@lootlog/schema/permissions";
import { OrganizationSummary } from "#src/contracts/shared";
import { InternalUserPermissionsResponse } from "#src/contracts/internal/schemas";
import {
  getInternalGuild,
  getInternalUserPermissions,
  InternalGuildsData,
  makeInternalGuildsData,
  type InternalGuildsCache,
  type InternalGuildsPersistence,
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
    expect(response).toEqual(
      await Effect.runPromise(
        decodeDomainJson(InternalUserPermissionsResponse, permissions),
      ),
    );
    expect(Schema.is(InternalUserPermissionsResponse)(response)).toBe(true);
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

    expect(Schema.is(OrganizationSummary)(response)).toBe(true);
  });

  it("builds the established owner and member permission projection from repositories", async () => {
    const cached: unknown[] = [];

    const persistence: InternalGuildsPersistence = {
      findActiveGuild: () => Effect.succeed(null),
      findGuildsForPermissions: () =>
        Effect.succeed([
          createGuildFixture({ id: "guild-owner", ownerId: "discord-a" }),
          createGuildFixture({ id: "guild-member", ownerId: "discord-owner" }),
        ]),
      findMembersWithRoles: () =>
        Effect.succeed([
          {
            ...createMemberFixture({ guildId: "guild-member" }),
            active: true,
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
                permissions: [Permission.LOOTLOG_ACCESS],
              },
            ],
          },
        ]),
    };

    const cache = {
      get: () => Effect.succeed(null),
      getJson: () => Effect.succeed(null),
      set: () => Effect.void,
      setJson: (_key, value) =>
        Effect.sync(() => {
          cached.push(value);
        }),
      del: () => Effect.void,
    } satisfies InternalGuildsCache;

    const data = makeInternalGuildsData(persistence, cache);

    const response = await Effect.runPromise(
      data.getUserPermissions("discord-a", "user-a"),
    );

    expect(Schema.is(InternalUserPermissionsResponse)(response)).toBe(true);
    expect(response).toHaveLength(2);
    expect(cached).toEqual([response]);
  });

  it("preserves cached guild defaults without touching the database", async () => {
    let databaseRead = false;

    const persistence: InternalGuildsPersistence = {
      findActiveGuild: () =>
        Effect.sync(() => {
          databaseRead = true;

          return null;
        }),
      findGuildsForPermissions: () => Effect.succeed([]),
      findMembersWithRoles: () => Effect.succeed([]),
    };

    const cache = {
      get: () =>
        Effect.succeed(
          JSON.stringify({
            id: "guild-a",
            name: "Guild A",
            ownerId: "discord-owner",
            publicStatsCardEnabled: false,
          }),
        ),
      getJson: () => Effect.succeed(null),
      set: () => Effect.void,
      setJson: () => Effect.void,
      del: () => Effect.void,
    } satisfies InternalGuildsCache;

    const data = makeInternalGuildsData(persistence, cache);

    const response = await Effect.runPromise(
      getInternalGuild("guild-a").pipe(
        Effect.provideService(InternalGuildsData, data),
      ),
    );

    expect(Schema.is(OrganizationSummary)(response)).toBe(true);
    expect(databaseRead).toBe(false);
  });
});

describe("internal response validation", () => {
  it("preserves database dates, cached JSON and absent optional summary fields", async () => {
    const { icon: _icon, vanityUrl: _vanityUrl, ...withoutOptional } = guild;

    for (const source of [
      guild,
      withoutOptional,
      { ...guild, createdAt: new Date(0), updatedAt: new Date(1) },
      { ...guild, createdAt: new Date(0).toISOString() },
    ]) {
      const data = InternalGuildsData.of({
        getGuild: () => Effect.succeed(source),
        getUserPermissions: () => Effect.succeed([]),
      });

      const response = await Effect.runPromise(
        getInternalGuild("guild-a").pipe(
          Effect.provideService(InternalGuildsData, data),
        ),
      );

      expect(response).toEqual(
        await Effect.runPromise(decodeDomainJson(OrganizationSummary, source)),
      );
    }
  });

  it("rejects invalid summary and permission fields without weakening operation failures", async () => {
    for (const source of [
      { ...guild, icon: undefined },
      { ...guild, reservationMaxDurationMinutes: Number.NaN },
      { ...guild, ownerId: null },
    ]) {
      const data = InternalGuildsData.of({
        getGuild: () => Effect.succeed(source),
        getUserPermissions: () => Effect.succeed([]),
      });

      const error = await Effect.runPromise(
        Effect.flip(
          getInternalGuild("guild-a").pipe(
            Effect.provideService(InternalGuildsData, data),
          ),
        ),
      );

      expect(error._tag).toBe("InternalGuildsOperationError");
      await expect(
        Effect.runPromise(decodeDomainJson(OrganizationSummary, source)),
      ).rejects.toBeDefined();
    }

    const permissions = [
      {
        guild: { id: "guild-a", ownerId: "owner" },
        roles: [
          {
            id: "role",
            lvlRangeFrom: 0,
            lvlRangeTo: 100,
            permissions: ["INVALID"],
          },
        ],
      },
    ];

    const data = InternalGuildsData.of({
      getGuild: () => Effect.succeed(guild),
      getUserPermissions: () => Effect.succeed(permissions),
    });

    const error = await Effect.runPromise(
      Effect.flip(
        getInternalUserPermissions("discord-a", "user-a").pipe(
          Effect.provideService(InternalGuildsData, data),
        ),
      ),
    );

    expect(error._tag).toBe("InternalGuildsOperationError");
  });
});
