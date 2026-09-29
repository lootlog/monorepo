import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import { AirTagService } from "./air-tag-service.js";

const makeSocket = (): GatewaySocket => ({
  send: () => 0,
  close: () => {},
  getBufferedAmount: () => 0,
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
});

const unusedSetCommands = {
  sadd: () => Promise.reject(new Error("Unexpected Redis write")),
  smembers: () => Promise.reject(new Error("Unexpected Redis read")),
  expire: () => Promise.reject(new Error("Unexpected Redis write")),
};

describe("AirTagService legacy parity", () => {
  test("returns snapshots on subscribe and exact counts/events for observations", async () => {
    const evaluations = [
      JSON.stringify({
        epochId: "epoch",
        epochStartedAt: 100,
        revision: 0,
        serverTime: 150,
        targets: [],
      }),
      [1, 0],
      [1, 0],
      JSON.stringify({
        epochId: "epoch",
        epochStartedAt: 100,
        revision: 1,
        acceptedTargets: 1,
        targets: [
          {
            targetId: "target",
            nickname: "Enemy",
            relation: 3,
            x: 1,
            y: 2,
            observedAt: 200,
            enemyObservedAt: 200,
          },
        ],
        removed: [],
        remoteRecipients: true,
      }),
      [1, 0],
      [1, 0],
      JSON.stringify({
        epochId: "epoch",
        epochStartedAt: 100,
        revision: 5,
        acceptedTargets: 2,
        targets: ["second", "third"].map((targetId) => ({
          targetId,
          nickname: "Neutral",
          relation: 1,
          x: 1,
          y: 2,
          observedAt: 300,
        })),
        removed: ["target"],
        remoteRecipients: true,
      }),
    ];

    const publications: unknown[][] = [];

    const hub = {
      clusterFederationVersion: 2,
      instanceId: crypto.randomUUID(),
      getLocalScopes: () => [],
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
    };

    const service = new AirTagService(
      {
        command: {
          ...unusedSetCommands,
          get: async () => null,
          eval: async () => {
            const reply = evaluations.shift();

            if (reply === undefined) throw new Error("Unexpected Redis script");

            return reply;
          },
        },
      },
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
          serverTime: 150,
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
        type: "air-tag.scope-updated",
        sequence: 1,
        data: {
          guildId: "organization-1",
          epochId: "epoch",
          revision: 1,
          targets: [{ targetId: "target" }],
          removedTargetIds: [],
        },
      },
      { excludeConnectionId: "connection-1" },
    ]);

    // An older replica drops a frame type it does not know: its clients still get the targets.
    hub.clusterFederationVersion = 1;
    publications.length = 0;
    await service.publishObservations(socket, {
      expectedMapId: 7,
      observations: [
        { targetId: "second", nickname: "Neutral", relation: 1, x: 1, y: 2 },
        { targetId: "third", nickname: "Neutral", relation: 1, x: 1, y: 2 },
      ],
      departures: [{ targetId: "target", reason: "left-map" }],
    });
    expect(publications.map((publication) => publication[1])).toMatchObject([
      {
        type: "air-tag.scope-updated",
        data: { revision: 3, targets: [], removedTargetIds: ["target"] },
      },
      {
        type: "air-tag.updated",
        data: { revision: 4, target: { targetId: "second" } },
      },
      {
        type: "air-tag.updated",
        data: { revision: 5, target: { targetId: "third" } },
      },
    ]);
  });

  test("rejects an empty observation batch before touching Redis", async () => {
    let evaluations = 0;

    const service = new AirTagService(
      {
        command: {
          ...unusedSetCommands,
          eval: async () => {
            evaluations += 1;

            return null;
          },
          get: () => Promise.reject(new Error("Unexpected Redis read")),
        },
      },
      {
        clusterFederationVersion: 2,
        instanceId: crypto.randomUUID(),
        getLocalScopes: () => [],
        subscribe: () => {
          throw new Error("Unexpected subscribe");
        },
        unsubscribe: () => {
          throw new Error("Unexpected unsubscribe");
        },
        publishToScopes: () => Promise.reject(new Error("Unexpected publish")),
      },
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

describe("AirTagService map threats", () => {
  test("publishes a map threat again when the first publication fails", async () => {
    const threatEvent = {
      revision: 300,
      enemies: [{ targetId: "enemy", nickname: "Rival", ageMs: 0 }],
    };

    const evaluations: Array<string | number[]> = [
      [1, 0],
      [1, 0],
      JSON.stringify({
        epochId: "epoch",
        epochStartedAt: 100,
        revision: 0,
        acceptedTargets: 1,
        targets: [],
        removed: [],
        threat: threatEvent,
        remoteRecipients: true,
      }),
      JSON.stringify({ mapName: "Map", ...threatEvent, revision: 1_300 }),
    ];

    const threatPublications: unknown[] = [];
    let failures = 1;

    const service = new AirTagService(
      {
        command: {
          get: async () => null,
          sadd: async () => 1,
          expire: async () => 1,
          smembers: async () => [],
          eval: async () => {
            const reply = evaluations.shift();

            if (reply === undefined) throw new Error("Unexpected Redis script");

            return reply;
          },
        },
      },
      {
        clusterFederationVersion: 2,
        instanceId: crypto.randomUUID(),
        getLocalScopes: () => [],
        subscribe: () => {},
        unsubscribe: () => {},
        publishToScopes: async (_scopes, event) => {
          if (event.type !== "air-tag.map-threat-updated") return;

          if (failures > 0) {
            failures -= 1;
            throw new Error("Federation unavailable");
          }

          threatPublications.push(event.data);
        },
      },
    );

    const socket = makeSocket();
    socket.data.airTagScopes = [
      {
        guildId: "organization-1",
        world: "classic",
        mapId: 7,
        subscription: {
          topic: "map.air-tags",
          organizationId: "organization-1",
          world: "classic",
          mapId: 7,
        },
      },
    ];

    await expect(
      service.publishObservations(socket, {
        expectedMapId: 7,
        observations: [
          {
            targetId: "enemy",
            nickname: "Rival",
            clan: { id: 5, name: "Rivals" },
            relation: 6,
            x: 1,
            y: 2,
          },
        ],
      }),
    ).resolves.toMatchObject({ status: "accepted" });
    expect(threatPublications).toHaveLength(0);

    await Bun.sleep(1_100);

    expect(threatPublications).toEqual([
      expect.objectContaining({ mapId: 7, mapName: "Map", revision: 1_300 }),
    ]);
  });
});
