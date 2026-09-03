import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import type { RedisGatewayStore } from "#src/platform/redis-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import { MapPingService } from "./map-ping-service.js";

const makeSocket = (): GatewaySocket =>
  ({
    data: {
      discordId: "discord-1",
      userId: "user-1",
      connectionId: "connection-1",
      platform: "game",
      joined: true,
      guilds: [
        {
          guild: { id: "organization-1", ownerId: "another-user" },
          roles: [
            {
              id: "role-1",
              lvlRangeFrom: 0,
              lvlRangeTo: 500,
              permissions: [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
            },
          ],
        },
      ],
      subscriptions: new Map(),
      airTagScopes: [],
      confidence: "verified",
      presence: {
        userId: "user-1",
        sessionId: "presence-1",
        organizationIds: ["organization-1"],
        platform: "game",
        status: "online",
        confidence: "verified",
        isAfk: false,
        lastSeen: 1,
        character: {
          world: "classic",
          name: "Hero",
          lvl: 100,
          icon: "icon",
          characterId: "123",
          accountId: "456",
          prof: "w",
        },
        location: { mapId: 7, map: "Map", x: 1, y: 2 },
      },
      backpressureStrikes: 0,
    } satisfies SessionData,
  }) as unknown as GatewaySocket;

describe("MapPingService legacy parity", () => {
  test("returns the exact ACK and publishes one deduplicated event excluding the sender", async () => {
    const publications: unknown[] = [];
    const service = new MapPingService(
      {
        command: { eval: async () => [1, 1234, 0] },
      } as unknown as RedisGatewayStore,
      {
        publishToScopes: async (...arguments_: unknown[]) => {
          publications.push(arguments_);
        },
      } as unknown as RealtimeHub,
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
      } as unknown as RedisGatewayStore,
      {} as RealtimeHub,
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
