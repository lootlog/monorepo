import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { decodeDomainJson } from "../../domain-json.schema.js";
import {
  LootlogConfigResponse,
  NpcLootlogConfigResponse,
} from "#src/contracts/lootlog-config/schemas";
import {
  getLootlogConfig,
  LootlogConfigAccessDenied,
  LootlogConfigAuthorization,
  LootlogConfigData,
  updateLootlogConfigNpc,
} from "./lootlog-config.handlers.js";

const npc = {
  id: 1,
  npcType: "HERO" as const,
  allowedRarities: ["LEGENDARY" as const],
};

const makeData = (overrides: Partial<LootlogConfigData["Service"]> = {}) =>
  LootlogConfigData.of({
    get: () => Effect.succeed({ id: "guild-a", npcs: [npc] }),
    updateNpc: () => Effect.succeed(npc),
    ...overrides,
  });

const provideServices = (
  data: LootlogConfigData["Service"],
  authorization: LootlogConfigAuthorization["Service"],
) =>
  Layer.merge(
    Layer.succeed(LootlogConfigData, data),
    Layer.succeed(LootlogConfigAuthorization, authorization),
  );

describe("lootlog config HttpApi handlers", () => {
  it("uses the canonical Organization and ADMIN capability for updates", async () => {
    const authorizationCalls: unknown[] = [];
    const dataCalls: Array<[string, string]> = [];

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
      updateLootlogConfigNpc("guild-alias", "1", {
        allowedRarities: ["LEGENDARY"],
      }).pipe(Effect.provide(layer)),
    );

    expect(authorizationCalls).toEqual([
      { guildId: "guild-alias", capability: Permission.ADMIN },
    ]);
    expect(dataCalls).toEqual([["guild-a", "1"]]);
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
    const source = {
      ...npc,
      lootlogConfigId: "guild-a",
      createdAt: new Date(0),
      updatedAt: new Date(1),
    };

    const layer = provideServices(
      makeData({ updateNpc: () => Effect.succeed(source) }),
      authorization,
    );

    const response = await Effect.runPromise(
      updateLootlogConfigNpc("guild-a", "1", {
        allowedRarities: ["LEGENDARY"],
      }).pipe(Effect.provide(layer)),
    );

    expect(response).toEqual(
      await Effect.runPromise(
        decodeDomainJson(NpcLootlogConfigResponse, source),
      ),
    );
  });

  it("retains conversion of dates and nulls in open configuration fields", async () => {
    for (const source of [
      null,
      {
        id: "guild-a",
        npcs: [npc],
        createdAt: new Date(0),
        extra: { dates: [new Date(1), null] },
      },
    ]) {
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
    for (const source of [
      { ...npc, id: Number.NaN },
      { ...npc, npcType: "INVALID" },
      { ...npc, allowedRarities: [null] },
    ]) {
      const layer = provideServices(
        makeData({ updateNpc: () => Effect.succeed(source) }),
        authorization,
      );

      const error = await Effect.runPromise(
        Effect.flip(
          updateLootlogConfigNpc("guild-a", "1", { allowedRarities: [] }).pipe(
            Effect.provide(layer),
          ),
        ),
      );

      expect(error._tag).toBe("LootlogConfigOperationError");
    }

    for (const extra of [undefined, 1n]) {
      const layer = provideServices(
        makeData({
          get: () => Effect.succeed({ id: "guild-a", npcs: [npc], extra }),
        }),
        authorization,
      );

      const error = await Effect.runPromise(
        Effect.flip(getLootlogConfig("guild-a").pipe(Effect.provide(layer))),
      );

      expect(error._tag).toBe("LootlogConfigOperationError");
    }
  });
});
