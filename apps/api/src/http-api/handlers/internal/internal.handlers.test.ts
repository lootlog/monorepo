import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
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
});
