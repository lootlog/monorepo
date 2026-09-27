import { describe, expect, test } from "bun:test";
import { makeGamePingSocket as makeSocket } from "../../test/realtime-fixtures.js";
import { MapPingService } from "./map-ping-service.js";

describe("MapPingService legacy parity", () => {
  test("returns the exact ACK and publishes one deduplicated event excluding the sender", async () => {
    const publications: unknown[] = [];

    const service = new MapPingService(
      {
        command: { eval: async () => [1, 1234, 0] },
      },
      {
        publishToScopes: async (...arguments_: unknown[]) => {
          publications.push(arguments_);
        },
      },
    );

    const response = await service.send(makeSocket(), {
      expectedMapId: 7,
      type: "enemy",
      x: 10,
      y: 11,
    });

    expect(response).toMatchObject({
      status: "accepted",
      pingId: expect.any(String),
    });
    expect(publications).toHaveLength(1);
    expect(publications[0]).toMatchObject([
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
        type: "map-ping.received",
        data: {
          world: "classic",
          mapId: 7,
          sender: { characterId: "123", name: "Hero" },
          createdAt: 1234,
        },
      },
      {
        excludeConnectionId: "connection-1",
        recipientPlatform: "game",
        recipientWorld: "classic",
        recipientMapId: 7,
      },
    ]);
  });

  test("fails closed when map context changed before consuming the rate limit", async () => {
    let evaluations = 0;

    const service = new MapPingService(
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
        expectedMapId: 8,
        type: "enemy",
        x: 1,
        y: 1,
      }),
    ).toEqual({ status: "rejected", code: "invalid-context" });
    expect(evaluations).toBe(0);
  });

  test("carries a targeted NPC into the event and rejects an invalid NPC id", async () => {
    const events: unknown[] = [];

    const service = new MapPingService(
      { command: { eval: async () => [1, 1234, 0] } },
      {
        publishToScopes: async (_scopes, event) => {
          events.push(event.data);
        },
      },
    );

    const ping = { expectedMapId: 7, type: "enemy", x: 10, y: 11 } as const;

    await service.send(makeSocket(), { ...ping, npcId: 42 });
    await service.send(makeSocket(), ping);

    expect(await service.send(makeSocket(), { ...ping, npcId: 0 })).toEqual({
      status: "rejected",
      code: "invalid-payload",
    });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ npcId: 42 });
    // Older clients strip the key, but an explicit undefined would fail encoding.
    expect(events[1]).not.toHaveProperty("npcId");
  });

  test("carries a targeted player and rejects a ping naming two targets", async () => {
    const events: unknown[] = [];

    const service = new MapPingService(
      { command: { eval: async () => [1, 1234, 0] } },
      {
        publishToScopes: async (_scopes, event) => {
          events.push(event.data);
        },
      },
    );

    const ping = { expectedMapId: 7, type: "enemy", x: 10, y: 11 } as const;

    await service.send(makeSocket(), { ...ping, playerId: 5_001 });

    expect(
      await service.send(makeSocket(), { ...ping, npcId: 42, playerId: 5_001 }),
    ).toEqual({ status: "rejected", code: "invalid-payload" });
    expect(events).toEqual([expect.objectContaining({ playerId: 5_001 })]);
    expect(events[0]).not.toHaveProperty("npcId");
  });
});
