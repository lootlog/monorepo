import { describe, expect, test } from "bun:test";
import { makeGamePingSocket as makeSocket } from "../../test/realtime-fixtures.js";
import { BattlePingService } from "./battle-ping-service.js";

describe("BattlePingService", () => {
  test("routes a ping only to the named teammates, never back to the sender", async () => {
    const publications: unknown[] = [];
    const rateLimitKeys: unknown[] = [];

    const service = new BattlePingService(
      {
        command: {
          eval: async (_script, _keys, key) => {
            rateLimitKeys.push(key);

            return [1, 1234, 0];
          },
        },
      },
      {
        publishToScopes: async (...arguments_: unknown[]) => {
          publications.push(arguments_);
        },
      },
    );

    const response = await service.send(makeSocket(), {
      expectedMapId: 7,
      type: "attack",
      warriorId: -42,
      recipientCharacterIds: ["123", "789"],
    });

    expect(response).toMatchObject({
      status: "accepted",
      pingId: expect.any(String),
    });
    // Battle pings must not drain the map ping budget.
    expect(rateLimitKeys).toEqual(["battle-ping:rate:user-1"]);
    expect(publications).toEqual([
      [
        [
          {
            topic: "map.pings",
            organizationId: "organization-1",
            world: "classic",
            mapId: 7,
          },
        ],
        {
          v: 1,
          type: "battle-ping.received",
          data: {
            pingId: expect.any(String),
            world: "classic",
            mapId: 7,
            type: "attack",
            warriorId: -42,
            sender: { characterId: "123", name: "Hero" },
            createdAt: 1234,
          },
        },
        {
          excludeConnectionId: "connection-1",
          recipientPlatform: "game",
          recipientWorld: "classic",
          recipientMapId: 7,
          recipientCharacterIds: ["789"],
        },
      ],
    ]);
  });

  test("rejects a ping addressed only to the sender without consuming the rate limit", async () => {
    let evaluations = 0;

    const service = new BattlePingService(
      {
        command: {
          eval: async () => {
            evaluations += 1;

            return [1, 1, 0];
          },
        },
      },
      {
        publishToScopes: () => Promise.reject(new Error("Unexpected publish")),
      },
    );

    expect(
      await service.send(makeSocket(), {
        expectedMapId: 7,
        type: "heal",
        warriorId: 123,
        recipientCharacterIds: ["123"],
      }),
    ).toEqual({ status: "rejected", code: "invalid-payload" });
    expect(evaluations).toBe(0);
  });
});
