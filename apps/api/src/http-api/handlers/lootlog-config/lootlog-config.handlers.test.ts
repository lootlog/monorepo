import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { AccessRequirement } from "@lootlog/domain/access-policy";
import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { decodeDomainJson } from "../../domain-json.schema.js";
import {
  LootlogConfigResponse,
  NpcLootlogConfigResponse,
} from "#src/contracts/lootlog-config/schemas";
import { LootlogConfigData } from "#src/lootlog-config/lootlog-config-data";
import {
  getLootlogConfig,
  LootlogConfigAccessDenied,
  LootlogConfigAuthorization,
  updateLootlogConfigNpc,
} from "./lootlog-config.handlers.js";

type LootlogConfigNpc = Effect.Success<
  ReturnType<LootlogConfigData["Service"]["updateNpc"]>
>;

const npc: LootlogConfigNpc = {
  id: 1,
  lootlogConfigId: "guild-a",
  npcType: "HERO",
  allowedRarities: ["LEGENDARY"],
  createdAt: new Date(0),
  updatedAt: new Date(1),
};

const config = {
  id: "guild-a",
  createdAt: new Date(0),
  updatedAt: new Date(1),
  npcs: [npc],
};

const makeData = (overrides: Partial<LootlogConfigData["Service"]> = {}) =>
  LootlogConfigData.of({
    get: () => Effect.succeed(config),
    updateNpc: () => Effect.succeed(npc),
    ...overrides,
  });

const provideServices = (
  data: LootlogConfigData["Service"],
  authorization: LootlogConfigAuthorization["Service"],
) =>
  Layer.mergeAll(
    Layer.succeed(ForwardAuthIdentity, {
      userId: "user",
      discordId: "discord",
    }),
    Layer.succeed(LootlogConfigData, data),
    Layer.succeed(LootlogConfigAuthorization, authorization),
  );

describe("lootlog config HttpApi handlers", () => {
  it("uses the canonical Organization and ADMIN capability for updates", async () => {
    const authorizationCalls: unknown[] = [];
    const dataCalls: Array<[string, number]> = [];

    const layer = provideServices(
      makeData({
        updateNpc: (guildId, npcId) => {
          dataCalls.push([guildId, npcId]);

          return Effect.succeed(npc);
        },
      }),
      LootlogConfigAuthorization.of({
        requireCapability: (options) => {
          authorizationCalls.push(options);

          return Effect.succeed({ guildId: "guild-a" });
        },
      }),
    );

    const response = await Effect.runPromise(
      updateLootlogConfigNpc("guild-alias", 1, {
        allowedRarities: ["LEGENDARY"],
      }).pipe(Effect.provide(layer)),
    );

    expect(authorizationCalls).toEqual([
      { guildId: "guild-alias", anyOf: AccessRequirement.ADMINISTER },
    ]);
    expect(dataCalls).toEqual([["guild-a", 1]]);
    expect(Schema.is(NpcLootlogConfigResponse)(response)).toBe(true);
  });

  it("fails closed before config reads for a hidden Organization", async () => {
    const denied = new LootlogConfigAccessDenied({
      status: 404,
      code: "GUILD_NOT_FOUND",
    });

    let dataCalled = false;

    const layer = provideServices(
      makeData({
        get: () => {
          dataCalled = true;

          return Effect.succeed(null);
        },
      }),
      LootlogConfigAuthorization.of({
        requireCapability: () => Effect.fail(denied),
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(getLootlogConfig("guild-b").pipe(Effect.provide(layer))),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });
});

describe("lootlog configuration response conversion", () => {
  const authorization = LootlogConfigAuthorization.of({
    requireCapability: () => Effect.succeed({ guildId: "guild-a" }),
  });

  it("projects NPC database rows without exposing timestamps", async () => {
    const layer = provideServices(
      makeData({ updateNpc: () => Effect.succeed(npc) }),
      authorization,
    );

    const response = await Effect.runPromise(
      updateLootlogConfigNpc("guild-a", 1, {
        allowedRarities: ["LEGENDARY"],
      }).pipe(Effect.provide(layer)),
    );

    expect(response).toEqual(
      await Effect.runPromise(decodeDomainJson(NpcLootlogConfigResponse, npc)),
    );
  });

  it("returns a configuration containing a HERO_TRACKER NPC", async () => {
    const layer = provideServices(
      makeData({
        get: () =>
          Effect.succeed({
            ...config,
            npcs: [{ ...npc, npcType: "HERO_TRACKER" }],
          }),
      }),
      authorization,
    );

    const response = await Effect.runPromise(
      getLootlogConfig("guild-a").pipe(Effect.provide(layer)),
    );

    expect(response?.npcs[0]?.npcType).toBe("HERO_TRACKER");
  });

  it("retains conversion of dates and nulls in open configuration fields", async () => {
    const withExtraColumn = {
      ...config,
      extra: { dates: [new Date(1), null] },
    };

    for (const source of [null, withExtraColumn]) {
      const layer = provideServices(
        makeData({ get: () => Effect.succeed(source) }),
        authorization,
      );

      const response = await Effect.runPromise(
        getLootlogConfig("guild-a").pipe(Effect.provide(layer)),
      );

      expect(response).toEqual(
        await Effect.runPromise(
          decodeDomainJson(LootlogConfigResponse, source),
        ),
      );
    }
  });

  it("rejects malformed NPC fields and non-JSON open fields", async () => {
    const layer = provideServices(
      makeData({ updateNpc: () => Effect.succeed({ ...npc, id: Number.NaN }) }),
      authorization,
    );

    const error = await Effect.runPromise(
      Effect.flip(
        updateLootlogConfigNpc("guild-a", 1, { allowedRarities: [] }).pipe(
          Effect.provide(layer),
        ),
      ),
    );

    expect(error._tag).toBe("LootlogConfigOperationError");

    for (const source of [
      { ...npc, npcType: "INVALID" },
      { ...npc, allowedRarities: [null] },
    ]) {
      const exit = await Effect.runPromiseExit(
        decodeDomainJson(NpcLootlogConfigResponse, source),
      );

      expect(exit._tag).toBe("Failure");
    }

    for (const extra of [undefined, 1n]) {
      const withExtraColumn = { ...config, extra };

      const layer = provideServices(
        makeData({ get: () => Effect.succeed(withExtraColumn) }),
        authorization,
      );

      const error = await Effect.runPromise(
        Effect.flip(getLootlogConfig("guild-a").pipe(Effect.provide(layer))),
      );

      expect(error._tag).toBe("LootlogConfigOperationError");
    }
  });
});
