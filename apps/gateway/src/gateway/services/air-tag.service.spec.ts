import { Permission } from "@lootlog/types";
import { GatewayEvent } from "src/gateway/enums/gateway-event.enum";
import { Platform } from "src/gateway/enums/platform.enum";
import { AirTagService } from "./air-tag.service";

const createGuild = (id: string, canView = true) => ({
  guild: { id, ownerId: "owner" },
  roles: [
    {
      id: `role-${id}`,
      lvlRangeFrom: 1,
      lvlRangeTo: 500,
      permissions: canView ? [Permission.LOOTLOG_ONLINE_PLAYERS_READ] : [],
    },
  ],
});

const createSocket = () => {
  const rooms = new Set(["socket-1"]);
  const emit = vi.fn();
  return {
    id: "socket-1",
    rooms,
    data: {
      userId: "user-1",
      discordId: "discord-1",
      platform: Platform.GAME,
      guilds: [createGuild("guild-1")],
      playerPresence: {
        world: "aether",
        mapId: 42,
      },
    },
    join: vi.fn(async (roomNames: string[]) => {
      roomNames.forEach((roomName) => rooms.add(roomName));
    }),
    leave: vi.fn(async (roomName: string) => {
      rooms.delete(roomName);
    }),
    to: vi.fn(() => ({ emit })),
    emit,
  };
};

const createSnapshotResult = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    epochId: "epoch-1",
    epochStartedAt: 1_700_000_000_000,
    revision: 3,
    targets: [],
    ...overrides,
  });

const createMergeResult = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    epochId: "epoch-1",
    epochStartedAt: 1_700_000_000_000,
    acceptedTargets: 1,
    updates: [
      {
        revision: 4,
        target: {
          targetId: "target-1",
          nickname: "Enemy",
          relation: 6,
          x: 12,
          y: 8,
          observedAt: 1_700_000_001_000,
          clanEnemyObservedAt: 1_700_000_001_000,
        },
      },
    ],
    ...overrides,
  });

describe("AirTagService", () => {
  it("joins only eligible guild map rooms and returns their snapshots", async () => {
    const redis = {
      eval: vi.fn().mockResolvedValue(createSnapshotResult()),
      get: vi.fn(),
    };
    const socket = createSocket();
    socket.data.guilds = [
      createGuild("guild-1"),
      createGuild("guild-forbidden", false),
    ];
    const service = new AirTagService(redis as never);

    await expect(
      service.updateSubscription({} as never, socket as never, {
        requestId: "request-1",
        enabled: true,
        expectedMapId: 42,
      }),
    ).resolves.toEqual({
      status: "accepted",
      requestId: "request-1",
      scopes: [
        {
          guildId: "guild-1",
          world: "aether",
          mapId: 42,
          epochId: "epoch-1",
          epochStartedAt: 1_700_000_000_000,
          revision: 3,
          targets: [],
        },
      ],
    });
    expect(socket.join).toHaveBeenCalledWith(["air-tags:guild-1:aether:42"]);
    expect(socket.data.airTagScopes).toEqual([
      {
        guildId: "guild-1",
        world: "aether",
        mapId: 42,
        roomName: "air-tags:guild-1:aether:42",
      },
    ]);
  });

  it("leaves every owned AirTags room when disabled", async () => {
    const redis = { eval: vi.fn(), get: vi.fn() };
    const socket = createSocket();
    socket.data.airTagScopes = [
      {
        guildId: "guild-1",
        world: "aether",
        mapId: 42,
        roomName: "air-tags:guild-1:aether:42",
      },
    ];
    socket.rooms.add("air-tags:guild-1:aether:42");
    const service = new AirTagService(redis as never);

    await expect(
      service.updateSubscription({} as never, socket as never, {
        requestId: "request-2",
        enabled: false,
      }),
    ).resolves.toEqual({
      status: "accepted",
      requestId: "request-2",
      scopes: [],
    });
    expect(socket.leave).toHaveBeenCalledWith("air-tags:guild-1:aether:42");
    expect(socket.data.airTagScopes).toEqual([]);
  });

  it("does not join a scope while its operational kill switch is active", async () => {
    const redis = {
      eval: vi.fn(),
      get: vi.fn().mockResolvedValue("1"),
    };
    const socket = createSocket();
    const service = new AirTagService(redis as never);

    await expect(
      service.updateSubscription({} as never, socket as never, {
        requestId: "request-disabled",
        enabled: true,
        expectedMapId: 42,
      }),
    ).resolves.toEqual({
      status: "rejected",
      requestId: "request-disabled",
      code: "temporarily-unavailable",
    });
    expect(socket.join).not.toHaveBeenCalled();
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it("serializes map subscriptions so a stale request cannot own the final room", async () => {
    let resolveFirstSnapshot: (value: string) => void = () => {};
    const firstSnapshot = new Promise<string>((resolve) => {
      resolveFirstSnapshot = resolve;
    });
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      eval: vi.fn((_script: string, keys: string[]) =>
        keys[0]?.includes(":42}")
          ? firstSnapshot
          : Promise.resolve(createSnapshotResult()),
      ),
    };
    const socket = createSocket();
    const service = new AirTagService(redis as never);

    const staleRequest = service.updateSubscription(
      {} as never,
      socket as never,
      {
        requestId: "request-stale",
        enabled: true,
        expectedMapId: 42,
      },
    );
    await vi.waitFor(() => {
      expect(socket.join).toHaveBeenCalledWith(["air-tags:guild-1:aether:42"]);
    });

    socket.data.playerPresence.mapId = 43;
    const currentRequest = service.updateSubscription(
      {} as never,
      socket as never,
      {
        requestId: "request-current",
        enabled: true,
        expectedMapId: 43,
      },
    );
    resolveFirstSnapshot(createSnapshotResult());

    await Promise.all([staleRequest, currentRequest]);

    expect(socket.leave).toHaveBeenCalledWith("air-tags:guild-1:aether:42");
    expect(socket.rooms.has("air-tags:guild-1:aether:42")).toBe(false);
    expect(socket.rooms.has("air-tags:guild-1:aether:43")).toBe(true);
    expect(socket.data.airTagScopes).toEqual([
      expect.objectContaining({ mapId: 43 }),
    ]);
  });

  it("broadcasts each guild-specific merge only to its exact room", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      eval: vi.fn((_script: string, keys: string[]) => {
        if (keys[0] === "air-tag:rate:user-1") {
          return [1, 0];
        }
        if (keys[0].includes("guild-2")) {
          return createMergeResult({ epochId: "guild-2-epoch" });
        }
        return createMergeResult();
      }),
    };
    const socket = createSocket();
    socket.data.guilds = [createGuild("guild-1"), createGuild("guild-2")];
    socket.data.airTagScopes = [
      {
        guildId: "guild-1",
        world: "aether",
        mapId: 42,
        roomName: "air-tags:guild-1:aether:42",
      },
      {
        guildId: "guild-2",
        world: "aether",
        mapId: 42,
        roomName: "air-tags:guild-2:aether:42",
      },
    ];
    socket.rooms.add("air-tags:guild-1:aether:42");
    socket.rooms.add("air-tags:guild-2:aether:42");
    const service = new AirTagService(redis as never);

    await expect(
      service.publishObservations({} as never, socket as never, {
        expectedMapId: 42,
        observations: [
          {
            targetId: "target-1",
            nickname: "Enemy",
            relation: 6,
            x: 12,
            y: 8,
          },
        ],
      }),
    ).resolves.toEqual({
      status: "accepted",
      acceptedScopes: 2,
      acceptedTargets: 2,
    });

    expect(socket.to).toHaveBeenCalledWith("air-tags:guild-1:aether:42");
    expect(socket.to).toHaveBeenCalledWith("air-tags:guild-2:aether:42");
    expect(socket.emit).toHaveBeenCalledTimes(2);
    expect(socket.emit).toHaveBeenCalledWith(
      GatewayEvent.AIR_TAG_UPDATE,
      expect.objectContaining({
        guildId: "guild-1",
        epochId: "epoch-1",
        revision: 4,
      }),
    );
    expect(socket.emit).toHaveBeenCalledWith(
      GatewayEvent.AIR_TAG_UPDATE,
      expect.objectContaining({
        guildId: "guild-2",
        epochId: "guild-2-epoch",
        revision: 4,
      }),
    );
  });

  it("rejects observations after access is revoked even with stale scope data", async () => {
    const redis = { eval: vi.fn(), get: vi.fn() };
    const socket = createSocket();
    socket.data.guilds = [createGuild("guild-1", false)];
    socket.data.airTagScopes = [
      {
        guildId: "guild-1",
        world: "aether",
        mapId: 42,
        roomName: "air-tags:guild-1:aether:42",
      },
    ];
    socket.rooms.add("air-tags:guild-1:aether:42");
    const service = new AirTagService(redis as never);

    await expect(
      service.publishObservations({} as never, socket as never, {
        expectedMapId: 42,
        observations: [
          {
            targetId: "target-1",
            nickname: "Enemy",
            relation: 6,
            x: 12,
            y: 8,
          },
        ],
      }),
    ).resolves.toEqual({ status: "rejected", code: "forbidden" });
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it("rejects a mismatched map before touching Redis", async () => {
    const redis = { eval: vi.fn(), get: vi.fn() };
    const socket = createSocket();
    const service = new AirTagService(redis as never);

    await expect(
      service.publishObservations({} as never, socket as never, {
        expectedMapId: 99,
        observations: [
          {
            targetId: "target-1",
            nickname: "Enemy",
            relation: 6,
            x: 12,
            y: 8,
          },
        ],
      }),
    ).resolves.toEqual({ status: "rejected", code: "invalid-context" });
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it("uses one room-atomic Lua call with epoch, cap, TTL, and freshness controls", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      eval: vi.fn((script: string, keys: string[]) => {
        if (keys[0] === "air-tag:rate:user-1") return [1, 0];
        expect(keys).toEqual([
          "{air-tag:guild-1:aether:42}:targets",
          "{air-tag:guild-1:aether:42}:expirations",
          "{air-tag:guild-1:aether:42}:metadata",
        ]);
        expect(script).toContain("targetCount >= maxTargets");
        expect(script).toContain("epochStartedAt");
        expect(script).toContain(
          "now - target.lastBroadcastAt >= broadcastInterval",
        );
        expect(script).toContain("candidateRelation");
        return createMergeResult({ updates: [] });
      }),
    };
    const socket = createSocket();
    socket.data.airTagScopes = [
      {
        guildId: "guild-1",
        world: "aether",
        mapId: 42,
        roomName: "air-tags:guild-1:aether:42",
      },
    ];
    socket.rooms.add("air-tags:guild-1:aether:42");
    const service = new AirTagService(redis as never);

    await service.publishObservations({} as never, socket as never, {
      expectedMapId: 42,
      observations: [
        {
          targetId: "target-1",
          nickname: "Neutral",
          relation: 1,
          x: 1,
          y: 1,
        },
      ],
    });

    expect(redis.eval).toHaveBeenCalledTimes(2);
  });
});
