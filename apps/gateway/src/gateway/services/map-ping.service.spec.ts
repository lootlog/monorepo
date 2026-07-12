import { Permission } from "@lootlog/types";
import { Platform } from "src/gateway/enums/platform.enum";
import { GatewayEvent } from "src/gateway/enums/gateway-event.enum";
import { MapPingService } from "./map-ping.service";

describe("MapPingService", () => {
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

  it("broadcasts an accepted ping once to an eligible socket on the same map", async () => {
    const recipient = {
      id: "recipient-socket",
      data: {
        discordId: "recipient-discord",
        platform: Platform.GAME,
        guilds: [createGuild("guild-1"), createGuild("guild-2")],
        playerPresence: { world: "aether", mapId: 42 },
      },
      emit: vi.fn(),
    };
    const server = {
      in: vi.fn().mockReturnThis(),
      fetchSockets: vi.fn().mockResolvedValue([recipient, recipient]),
    };
    const redis = {
      eval: vi.fn().mockResolvedValue([1, 1_700_000_000_000, 0]),
    };
    const sender = {
      id: "sender-socket",
      data: {
        userId: "user-1",
        discordId: "sender-discord",
        platform: Platform.GAME,
        guilds: [createGuild("guild-1"), createGuild("guild-2")],
        playerPresence: {
          world: "aether",
          mapId: 42,
          name: "Sender",
          characterId: "123",
        },
      },
    };
    const service = new MapPingService(redis as never);

    const result = await service.send(server as never, sender as never, {
      expectedMapId: 42,
      x: 12,
      y: 8,
    });

    expect(result).toEqual({
      status: "accepted",
      pingId: expect.any(String),
    });
    expect(server.in).toHaveBeenCalledWith([
      "guild-1:online-players",
      "guild-2:online-players",
    ]);
    expect(recipient.emit).toHaveBeenCalledTimes(1);
    expect(recipient.emit).toHaveBeenCalledWith(
      GatewayEvent.MAP_PING_RECEIVE,
      expect.objectContaining({
        world: "aether",
        mapId: 42,
        x: 12,
        y: 8,
        sender: { characterId: "123", name: "Sender" },
      }),
    );
  });

  it("excludes the source but emits to another eligible game session", async () => {
    const createRecipient = (
      id: string,
      overrides: Record<string, unknown> = {},
    ) => ({
      id,
      data: {
        discordId: "sender-discord",
        platform: Platform.GAME,
        guilds: [createGuild("guild-1")],
        playerPresence: { world: "aether", mapId: 42 },
        ...overrides,
      },
      emit: vi.fn(),
    });
    const source = createRecipient("source-socket");
    const otherSession = createRecipient("other-session");
    const otherWorld = createRecipient("other-world", {
      playerPresence: { world: "gefion", mapId: 42 },
    });
    const withoutAccess = createRecipient("without-access", {
      discordId: "recipient-discord",
      guilds: [createGuild("guild-1", false)],
    });
    source.data = {
      ...source.data,
      userId: "user-1",
      playerPresence: {
        world: "aether",
        mapId: 42,
        name: "Sender",
        characterId: "123",
      },
    } as never;
    const server = {
      in: vi.fn().mockReturnThis(),
      fetchSockets: vi
        .fn()
        .mockResolvedValue([source, otherSession, otherWorld, withoutAccess]),
    };
    const redis = {
      eval: vi.fn().mockResolvedValue([1, 1_700_000_000_000, 0]),
    };
    const service = new MapPingService(redis as never);

    await expect(
      service.send(server as never, source as never, {
        expectedMapId: 42,
        x: 12,
        y: 8,
      }),
    ).resolves.toEqual({ status: "accepted", pingId: expect.any(String) });

    expect(source.emit).not.toHaveBeenCalled();
    expect(otherSession.emit).toHaveBeenCalledTimes(1);
    expect(otherWorld.emit).not.toHaveBeenCalled();
    expect(withoutAccess.emit).not.toHaveBeenCalled();
  });

  it("rejects a ping when the requested map does not match presence", async () => {
    const server = {
      in: vi.fn().mockReturnThis(),
      fetchSockets: vi.fn(),
    };
    const redis = { eval: vi.fn() };
    const sender = {
      id: "sender-socket",
      data: {
        userId: "user-1",
        discordId: "sender-discord",
        platform: Platform.GAME,
        guilds: [createGuild("guild-1")],
        playerPresence: {
          world: "aether",
          mapId: 42,
          name: "Sender",
          characterId: "123",
        },
      },
    };
    const service = new MapPingService(redis as never);

    await expect(
      service.send(server as never, sender as never, {
        expectedMapId: 99,
        x: 12,
        y: 8,
      }),
    ).resolves.toEqual({ status: "rejected", code: "invalid-context" });

    expect(redis.eval).not.toHaveBeenCalled();
    expect(server.fetchSockets).not.toHaveBeenCalled();
  });

  it("does not emit when online-player access is split across different guilds", async () => {
    const recipient = {
      id: "recipient-socket",
      data: {
        discordId: "recipient-discord",
        platform: Platform.GAME,
        guilds: [createGuild("guild-1", false), createGuild("guild-2")],
        playerPresence: { world: "aether", mapId: 42 },
      },
      emit: vi.fn(),
    };
    const server = {
      in: vi.fn().mockReturnThis(),
      fetchSockets: vi.fn().mockResolvedValue([recipient]),
    };
    const redis = {
      eval: vi.fn().mockResolvedValue([1, 1_700_000_000_000, 0]),
    };
    const sender = {
      id: "sender-socket",
      data: {
        userId: "user-1",
        discordId: "sender-discord",
        platform: Platform.GAME,
        guilds: [createGuild("guild-1"), createGuild("guild-2", false)],
        playerPresence: {
          world: "aether",
          mapId: 42,
          name: "Sender",
          characterId: "123",
        },
      },
    };
    const service = new MapPingService(redis as never);

    await expect(
      service.send(server as never, sender as never, {
        expectedMapId: 42,
        x: 12,
        y: 8,
      }),
    ).resolves.toEqual({
      status: "accepted",
      pingId: expect.any(String),
    });
    expect(recipient.emit).not.toHaveBeenCalled();
  });

  it("returns the Redis retry delay when the rate limit is exhausted", async () => {
    const server = { in: vi.fn() };
    const redis = {
      eval: vi.fn().mockResolvedValue([0, 1_700_000_000_000, 4_200]),
    };
    const sender = {
      id: "sender-socket",
      data: {
        userId: "user-1",
        discordId: "sender-discord",
        platform: Platform.GAME,
        guilds: [createGuild("guild-1")],
        playerPresence: {
          world: "aether",
          mapId: 42,
          name: "Sender",
          characterId: "123",
        },
      },
    };
    const service = new MapPingService(redis as never);

    await expect(
      service.send(server as never, sender as never, {
        expectedMapId: 42,
        x: 12,
        y: 8,
      }),
    ).resolves.toEqual({
      status: "rejected",
      code: "rate-limited",
      retryAfterMs: 4_200,
    });
    expect(server.in).not.toHaveBeenCalled();
  });

  it("rejects invalid coordinates before consuming the rate limit", async () => {
    const redis = { eval: vi.fn() };
    const service = new MapPingService(redis as never);

    await expect(
      service.send({} as never, { data: {} } as never, {
        expectedMapId: 42,
        x: -1,
        y: 8,
      }),
    ).resolves.toEqual({ status: "rejected", code: "invalid-payload" });
    expect(redis.eval).not.toHaveBeenCalled();
  });
});
