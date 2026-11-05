import { Effect } from "effect";
import { describe, expect, test } from "bun:test";
import {
  acceptingRateLimit,
  makeGamePingSocket as makeSocket,
} from "../../test/realtime-fixtures.js";
import { MapPingService } from "./map-ping-service.js";

describe("MapPingService", () => {
  test("fails closed when map context changed before consuming the rate limit", async () => {
    const rateLimitKeys: string[] = [];

    const service = new MapPingService(
      acceptingRateLimit(1234, rateLimitKeys),
      {
        publishToScopes: () => Promise.reject(new Error("Unexpected publish")),
      },
    );

    expect(
      await Effect.runPromise(
        service.send(makeSocket(), {
          expectedMapId: 8,
          type: "enemy",
          x: 1,
          y: 1,
        }),
      ),
    ).toEqual({ status: "rejected", code: "invalid-context" });
    expect(rateLimitKeys).toEqual([]);
  });

  test("carries a targeted NPC into the event and rejects an invalid NPC id", async () => {
    const events: unknown[] = [];

    const service = new MapPingService(acceptingRateLimit(), {
      publishToScopes: async (_scopes, event) => {
        events.push(event.data);
      },
    });

    const ping = { expectedMapId: 7, type: "enemy", x: 10, y: 11 } as const;

    await Effect.runPromise(service.send(makeSocket(), { ...ping, npcId: 42 }));
    await Effect.runPromise(service.send(makeSocket(), ping));

    expect(
      await Effect.runPromise(
        service.send(makeSocket(), { ...ping, npcId: 0 }),
      ),
    ).toEqual({
      status: "rejected",
      code: "invalid-payload",
    });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      npcId: 42,
      sender: { characterId: "123", name: "Hero" },
      createdAt: 1234,
    });
    // Older clients strip the key, but an explicit undefined would fail encoding.
    expect(events[1]).not.toHaveProperty("npcId");
  });

  test("carries a targeted player and rejects a ping naming two targets", async () => {
    const events: unknown[] = [];

    const service = new MapPingService(acceptingRateLimit(), {
      publishToScopes: async (_scopes, event) => {
        events.push(event.data);
      },
    });

    const ping = { expectedMapId: 7, type: "enemy", x: 10, y: 11 } as const;

    await Effect.runPromise(
      service.send(makeSocket(), { ...ping, playerId: 5_001 }),
    );

    expect(
      await Effect.runPromise(
        service.send(makeSocket(), { ...ping, npcId: 42, playerId: 5_001 }),
      ),
    ).toEqual({ status: "rejected", code: "invalid-payload" });
    expect(events).toEqual([expect.objectContaining({ playerId: 5_001 })]);
    expect(events[0]).not.toHaveProperty("npcId");
  });
});
