import { Effect } from "effect";
import { describe, expect, test } from "bun:test";
import {
  acceptingRateLimit,
  makeGamePingSocket as makeSocket,
} from "../../test/realtime-fixtures.js";
import { BattlePingService } from "./battle-ping-service.js";

describe("BattlePingService", () => {
  test("routes a ping only to the named teammates, never back to the sender", async () => {
    const publications: unknown[] = [];

    const service = new BattlePingService(acceptingRateLimit(), {
      publishToScopes: async (...arguments_: unknown[]) => {
        publications.push(arguments_);
      },
    });

    const response = await Effect.runPromise(
      service.send(makeSocket(), {
        expectedMapId: 7,
        type: "attack",
        warriorId: -42,
        recipientCharacterIds: ["123", "789"],
      }),
    );

    expect(response).toMatchObject({
      status: "accepted",
      pingId: expect.any(String),
    });
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
    const rateLimitKeys: string[] = [];

    const service = new BattlePingService(
      acceptingRateLimit(1234, rateLimitKeys),
      {
        publishToScopes: () => Promise.reject(new Error("Unexpected publish")),
      },
    );

    expect(
      await Effect.runPromise(
        service.send(makeSocket(), {
          expectedMapId: 7,
          type: "heal",
          warriorId: 123,
          recipientCharacterIds: ["123"],
        }),
      ),
    ).toEqual({ status: "rejected", code: "invalid-payload" });
    expect(rateLimitKeys).toEqual([]);
  });
});
