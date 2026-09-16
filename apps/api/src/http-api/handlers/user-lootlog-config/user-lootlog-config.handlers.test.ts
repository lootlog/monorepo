import { makeJsonCodec } from "#src/redis/redis.service";
import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { decodeDomainJson } from "../../domain-json.schema.js";
import {
  AccountLootlogConfigResponse,
  CharacterLootlogConfigResponse,
  PlayersCatchingOrganizationsResponse,
} from "#src/contracts/user-lootlog-config/schemas";
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

    expect(result).toEqual(
      await Effect.runPromise(
        decodeDomainJson(PlayersCatchingOrganizationsResponse, response),
      ),
    );
    expect(Schema.is(PlayersCatchingOrganizationsResponse)(result)).toBe(true);
  });
});

describe("user configuration response validation", () => {
  const character = {
    userId: "user-a",
    accountId: "account-a",
    characterId: "character-a",
    catchingGuildIds: ["guild-a"],
    createdAt: new Date(0),
    updatedAt: new Date(1),
  };

  it("keeps database and cached account and character projections equivalent", async () => {
    for (const source of [
      character,
      makeJsonCodec(CharacterLootlogConfigResponse).parse(
        JSON.stringify(character),
      ),
    ]) {
      const account = { "character-a": source };

      const layer = provideServices(
        makeData({
          getAccount: () => Effect.succeed(account),
          upsertCharacter: () => Effect.succeed(source),
        }),
      );

      expect(
        await Effect.runPromise(
          getUserLootlogAccountConfig("account-a").pipe(Effect.provide(layer)),
        ),
      ).toEqual(
        await Effect.runPromise(
          decodeDomainJson(AccountLootlogConfigResponse, account),
        ),
      );
      expect(
        await Effect.runPromise(
          upsertUserLootlogCharacterConfig("account-a", {
            characterId: "character-a",
            catchingGuildIds: ["guild-a"],
          }).pipe(Effect.provide(layer)),
        ),
      ).toEqual(
        await Effect.runPromise(
          decodeDomainJson(CharacterLootlogConfigResponse, source),
        ),
      );
    }
  });

  it("rejects malformed configuration and catching Organization values", async () => {
    for (const catchingGuildIds of [null, undefined, [123]]) {
      const source = { ...character, catchingGuildIds };

      const layer = provideServices(
        makeData({
          getAccount: () => Effect.succeed({ "character-a": source }),
          upsertCharacter: () => Effect.succeed(source),
        }),
      );

      for (const effect of [
        getUserLootlogAccountConfig("account-a").pipe(Effect.asVoid),
        upsertUserLootlogCharacterConfig("account-a", {
          characterId: "character-a",
          catchingGuildIds: [],
        }).pipe(Effect.asVoid),
      ]) {
        const error = await Effect.runPromise(
          Effect.flip(effect.pipe(Effect.provide(layer))),
        );

        expect(error._tag).toBe("UserLootlogConfigOperationError");
      }
    }

    const malformed = {
      players: [{ ...character, guilds: [{ id: "guild-a", name: null }] }],
    };

    const layer = provideServices(
      makeData({ getPlayersCatchingGuilds: () => Effect.succeed(malformed) }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        getPlayersCatchingGuilds({ players: [] }).pipe(Effect.provide(layer)),
      ),
    );

    expect(error._tag).toBe("UserLootlogConfigOperationError");
  });
});
