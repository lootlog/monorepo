import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { UserLootlogConfigControllerGetPlayersCatchingGuilds200 } from "../../contracts/user-lootlog-config/schemas.js";
import {
  getPlayersCatchingGuilds,
  getUserLootlogAccountConfig,
  UserLootlogConfigAccessDenied,
  UserLootlogConfigData,
  UserLootlogConfigIdentity,
  upsertUserLootlogCharacterConfig,
} from "./user-lootlog-config.handlers.js";

const makeData = (overrides: Partial<UserLootlogConfigData["Service"]> = {}) =>
  UserLootlogConfigData.of({
    getAccount: () => Effect.succeed({}),
    upsertCharacter: () =>
      Effect.succeed({
        userId: "user-a",
        accountId: "account-a",
        characterId: "character-a",
        catchingGuildIds: [],
      }),
    getPlayersCatchingGuilds: () => Effect.succeed({ players: [] }),
    ...overrides,
  });
const provideServices = (
  data: UserLootlogConfigData["Service"],
  identity = UserLootlogConfigIdentity.of({
    discordId: Effect.succeed("discord-a"),
  }),
) =>
  Layer.merge(
    Layer.succeed(UserLootlogConfigData, data),
    Layer.succeed(UserLootlogConfigIdentity, identity),
  );

describe("user lootlog config HttpApi handlers", () => {
  it("passes only the authenticated Discord identity to account reads", async () => {
    const calls: Array<[string, string]> = [];
    const layer = provideServices(
      makeData({
        getAccount: (discordId, accountId) => {
          calls.push([discordId, accountId]);
          return Effect.succeed({});
        },
      }),
    );

    await Effect.runPromise(
      getUserLootlogAccountConfig("account-a").pipe(Effect.provide(layer)),
    );
    expect(calls).toEqual([["discord-a", "account-a"]]);
  });

  it("fails closed before a character mutation when auth is missing", async () => {
    const denied = new UserLootlogConfigAccessDenied({
      status: 401,
      code: "AUTH_REQUIRED",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeData({
        upsertCharacter: () => {
          dataCalled = true;
          return Effect.succeed({});
        },
      }),
      UserLootlogConfigIdentity.of({ discordId: Effect.fail(denied) }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        upsertUserLootlogCharacterConfig("account-a", {
          characterId: "character-a",
          catchingGuildIds: [],
        }).pipe(Effect.provide(layer)),
      ),
    );
    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });

  it("preserves the visible catching-guild projection schema", async () => {
    const response = {
      players: [
        {
          userId: "user-a",
          accountId: "account-a",
          characterId: "character-a",
          guilds: [{ id: "guild-a", name: "Guild A" }],
        },
      ],
    };
    const layer = provideServices(
      makeData({
        getPlayersCatchingGuilds: () => Effect.succeed(response),
      }),
    );

    const result = await Effect.runPromise(
      getPlayersCatchingGuilds({ players: [] }).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(response);
    expect(
      Schema.is(UserLootlogConfigControllerGetPlayersCatchingGuilds200)(result),
    ).toBe(true);
  });
});
