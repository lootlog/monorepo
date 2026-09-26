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
});
