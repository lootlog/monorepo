import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  AuthenticatedGuildStatsCardControllerRefreshStatsCard200,
  MapsControllerGetMaps200,
} from "../../lootlog-api.js";
import {
  getMaps,
  getPublicStatsCard,
  healthCheck,
  PublicSystemAccessDenied,
  PublicSystemAuthorization,
  PublicSystemData,
  refreshStatsCard,
} from "./public-system.handlers.js";

const png = Uint8Array.from([137, 80, 78, 71]);

const makeData = (overrides: Partial<PublicSystemData["Service"]> = {}) =>
  PublicSystemData.of({
    healthCheck: Effect.void,
    getMaps: Effect.succeed([{ id: 1, name: "Ithan" }]),
    refreshStatsCard: () =>
      Effect.succeed({ nextRefreshAt: "2026-09-02T12:00:00.000Z" }),
    getStatsCard: () => Effect.succeed(png),
    statsCardCacheControl: "public, max-age=300, must-revalidate",
    ...overrides,
  });

const makeAuthorization = (
  overrides: Partial<PublicSystemAuthorization["Service"]> = {},
) =>
  PublicSystemAuthorization.of({
    requireCapability: ({ guildId }) => Effect.succeed({ guildId }),
    ...overrides,
  });

const provideServices = (
  data: PublicSystemData["Service"],
  authorization = makeAuthorization(),
) =>
  Layer.merge(
    Layer.succeed(PublicSystemData, data),
    Layer.succeed(PublicSystemAuthorization, authorization),
  );

describe("public system HttpApi handlers", () => {
  it("keeps health and maps public and validates the maps response", async () => {
    const data = makeData();

    const [health, maps] = await Effect.runPromise(
      Effect.all([healthCheck(), getMaps()]).pipe(
        Effect.provide(Layer.succeed(PublicSystemData, data)),
      ),
    );

    expect(health).toBeUndefined();
    expect(maps).toEqual([{ id: 1, name: "Ithan" }]);
    expect(Schema.is(MapsControllerGetMaps200)(maps)).toBe(true);
  });

  it("requires OWNER or ADMIN before refreshing an Organization card", async () => {
    const authorizationCalls: Array<{
      guildId: string;
      anyOf: ReadonlyArray<string>;
    }> = [];
    const refreshedGuilds: string[] = [];
    const layer = provideServices(
      makeData({
        refreshStatsCard: (guildId) => {
          refreshedGuilds.push(guildId);
          return Effect.succeed({
            nextRefreshAt: "2026-09-02T12:00:00.000Z",
          });
        },
      }),
      makeAuthorization({
        requireCapability: (options) => {
          authorizationCalls.push(options);
          return Effect.succeed({ guildId: options.guildId });
        },
      }),
    );

    const response = await Effect.runPromise(
      refreshStatsCard("guild-a").pipe(Effect.provide(layer)),
    );

    expect(authorizationCalls).toEqual([
      {
        guildId: "guild-a",
        anyOf: [Permission.OWNER, Permission.ADMIN],
      },
    ]);
    expect(refreshedGuilds).toEqual(["guild-a"]);
    expect(
      Schema.is(AuthenticatedGuildStatsCardControllerRefreshStatsCard200)(
        response,
      ),
    ).toBe(true);
  });

  it("fails closed before a forbidden stats-card refresh reaches data", async () => {
    const denied = new PublicSystemAccessDenied({
      status: 403,
      code: "GUILD_MANAGE_REQUIRED",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeData({
        refreshStatsCard: () => {
          dataCalled = true;
          return Effect.succeed({ nextRefreshAt: "never" });
        },
      }),
      makeAuthorization({ requireCapability: () => Effect.fail(denied) }),
    );

    const error = await Effect.runPromise(
      Effect.flip(refreshStatsCard("guild-b").pipe(Effect.provide(layer))),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });

  it("returns the public PNG with the established cache headers", async () => {
    const response = await Effect.runPromise(
      getPublicStatsCard("guild-a").pipe(
        Effect.provide(Layer.succeed(PublicSystemData, makeData())),
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers["cache-control"]).toBe(
      "public, max-age=300, must-revalidate",
    );
    expect(response.body._tag).toBe("Uint8Array");
    if (response.body._tag === "Uint8Array") {
      expect(response.body.body).toEqual(png);
    }
  });
});
