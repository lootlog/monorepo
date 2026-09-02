import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { LootlogConfigControllerUpdateNpc200 } from "../../lootlog-api.js";
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
    expect(Schema.is(LootlogConfigControllerUpdateNpc200)(response)).toBe(true);
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
