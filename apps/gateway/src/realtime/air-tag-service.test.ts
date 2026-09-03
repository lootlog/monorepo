import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import type { RedisGatewayStore } from "#src/platform/redis-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import { AirTagService } from "./air-tag-service.js";

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
          guild: { id: "organization-1", ownerId: "owner" },
          roles: [
            {
              id: "role",
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
      backpressureStrikes: 0,
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
        location: { mapId: 7, map: "Map" },
      },
    } satisfies SessionData,
  }) as unknown as GatewaySocket;

describe("AirTagService legacy parity", () => {
  test("returns snapshots on subscribe and exact counts/events for observations", async () => {
    const evaluations = [
      JSON.stringify({
        epochId: "epoch",
        epochStartedAt: 100,
        revision: 0,
        targets: [],
      }),
      [1, 0],
      JSON.stringify({
        epochId: "epoch",
        epochStartedAt: 100,
        acceptedTargets: 1,
        updates: [
          {
            revision: 1,
            target: {
              targetId: "target",
              nickname: "Enemy",
              relation: 3,
              x: 1,
              y: 2,
              observedAt: 200,
              enemyObservedAt: 200,
            },
          },
        ],
      }),
    ];
    const publications: unknown[] = [];
    const hub = {
      subscribe: (
        socket: GatewaySocket,
        scope: SessionData["subscriptions"] extends Map<string, infer T>
          ? T
          : never,
      ) => socket.data.subscriptions.set("air", scope),
      unsubscribe: (socket: GatewaySocket) =>
        socket.data.subscriptions.delete("air"),
      publishToScopes: async (...arguments_: unknown[]) => {
        publications.push(arguments_);
      },
    } as unknown as RealtimeHub;
    const service = new AirTagService(
      {
        command: {
          get: async () => null,
          eval: async () => evaluations.shift(),
        },
      } as unknown as RedisGatewayStore,
      hub,
    );
    const socket = makeSocket();
    const subscription = await service.updateSubscription(socket, {
      requestId: "request-1",
      enabled: true,
      expectedMapId: 7,
    });
    expect(subscription).toEqual({
      status: "accepted",
      requestId: "request-1",
      scopes: [
        {
          guildId: "organization-1",
          world: "classic",
          mapId: 7,
          epochId: "epoch",
          epochStartedAt: 100,
          revision: 0,
          targets: [],
        },
      ],
    });
    const response = await service.publishObservations(socket, {
      expectedMapId: 7,
      observations: [
        { targetId: "target", nickname: "Enemy", relation: 3, x: 1, y: 2 },
      ],
    });
    expect(response).toEqual({
      status: "accepted",
      acceptedScopes: 1,
      acceptedTargets: 1,
    });
    expect(publications).toHaveLength(1);
    expect(publications[0]).toMatchObject([
      [
        {
          topic: "map.air-tags",
          organizationId: "organization-1",
          world: "classic",
          mapId: 7,
        },
      ],
      {
        type: "air-tag.updated",
        sequence: 1,
        data: { guildId: "organization-1", epochId: "epoch", revision: 1 },
      },
      { excludeConnectionId: "connection-1" },
    ]);
  });

  test("rejects an empty observation batch before touching Redis", async () => {
    let evaluations = 0;
    const service = new AirTagService(
      {
        command: {
          eval: async () => {
            evaluations += 1;
          },
        },
      } as unknown as RedisGatewayStore,
      {} as RealtimeHub,
    );
    expect(
      await service.publishObservations(makeSocket(), {
        expectedMapId: 7,
        observations: [],
      }),
    ).toEqual({ status: "rejected", code: "invalid-payload" });
    expect(evaluations).toBe(0);
  });
});
