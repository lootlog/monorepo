import { Gateway } from "./gateway";
import { GatewayEvent } from "./enums/gateway-event.enum";
import { Platform } from "./enums/platform.enum";

describe("Gateway", () => {
  const mockConnectionService = {
    getConnectionMetadata: vi.fn(),
    validateConnection: vi.fn(),
    initializeSocketData: vi.fn(),
  };

  const mockPresenceService = {
    emitDisconnectPresence: vi.fn(),
    broadcastPlayerDisconnect: vi.fn(),
    fetchServerPresence: vi.fn(),
    updatePlayerPresence: vi.fn(),
    fetchGuildPresence: vi.fn(),
    checkPresenceForMap: vi.fn(),
  };

  const mockSubscriptionService = {
    handleJoin: vi.fn(),
    handleDisconnect: vi.fn(),
  };

  const mockServer = {};

  let gateway: Gateway;

  beforeEach(() => {
    gateway = new Gateway(
      mockConnectionService as never,
      mockPresenceService as never,
      mockSubscriptionService as never,
    );
    gateway.server = mockServer as never;
  });

  it("disconnects invalid websocket connections", async () => {
    const client = {
      request: { headers: {} },
      disconnect: vi.fn(),
      on: vi.fn(),
    };

    mockConnectionService.getConnectionMetadata.mockReturnValue({
      discordId: null,
      userId: null,
      platform: Platform.UNKNOWN,
    });
    mockConnectionService.validateConnection.mockReturnValue({
      valid: false,
    });

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.on).not.toHaveBeenCalled();
  });

  it("initializes socket data and handles disconnecting callbacks", async () => {
    let disconnectingHandler!: () => Promise<void>;

    const client = {
      id: "socket-1",
      request: { headers: {} },
      disconnect: vi.fn(),
      on: vi.fn((event: string, handler: () => Promise<void>) => {
        if (event === GatewayEvent.DISCONNECTING) {
          disconnectingHandler = handler;
        }
      }),
      data: undefined,
    };
    const socketData = {
      discordId: "discord-1",
      userId: "user-1",
      sessionId: "socket-1",
      platform: Platform.GAME,
      guilds: [
        {
          guild: { id: "guild-1", ownerId: "owner-1" },
          roles: [],
        },
      ],
    };

    mockConnectionService.getConnectionMetadata.mockReturnValue({
      discordId: "discord-1",
      userId: "user-1",
      platform: Platform.GAME,
    });
    mockConnectionService.validateConnection.mockReturnValue({ valid: true });
    mockConnectionService.initializeSocketData.mockReturnValue(socketData);
    mockSubscriptionService.handleDisconnect.mockResolvedValue(undefined);
    mockPresenceService.broadcastPlayerDisconnect.mockResolvedValue(undefined);

    await gateway.handleConnection(client as never);
    await disconnectingHandler();

    expect(client.data).toEqual(socketData);
    expect(mockPresenceService.emitDisconnectPresence).toHaveBeenCalledWith(
      mockServer,
      client,
    );
    expect(mockSubscriptionService.handleDisconnect).toHaveBeenCalledWith(
      client,
      socketData.guilds,
    );
    expect(mockPresenceService.broadcastPlayerDisconnect).toHaveBeenCalledWith(
      mockServer,
      client,
    );
  });

  it("emits join result returned by subscription service", async () => {
    const client = {
      emit: vi.fn(),
    };
    const joinResult = {
      status: "success",
      guildsCount: 1,
      guildIds: ["guild-1"],
      featureRooms: ["guild-1:presence"],
    };

    mockSubscriptionService.handleJoin.mockResolvedValue(joinResult);

    await gateway.handleJoin(
      "discord-1",
      "user-1",
      client as never,
      {
        data: {
          world: "alpha",
          name: "Hero",
          characterId: "10",
          accountId: "20",
          icon: "icon",
          lvl: "100",
          prof: "w",
          location: { x: 1, y: 2, map: "Map" },
        },
      } as never,
    );

    expect(mockSubscriptionService.handleJoin).toHaveBeenCalledWith(
      mockServer,
      client,
      "discord-1",
      "user-1",
      expect.any(Object),
    );
    expect(client.emit).toHaveBeenCalledWith(GatewayEvent.JOIN, joinResult);
  });

  it("delegates server presence fetch through the presence service", async () => {
    const client = {
      data: {
        platform: Platform.GAME,
      },
      rooms: new Set(["guild-1:presence"]),
    };
    const expectedPresence = {
      "discord-1": [{ player: { name: "Hero" } }],
    };

    mockPresenceService.fetchServerPresence.mockResolvedValue(expectedPresence);

    await expect(
      gateway.handlePresenceFetch(
        client as never,
        {
          guildId: "guild-1",
          world: "alpha",
        } as never,
      ),
    ).resolves.toEqual(expectedPresence);
  });
});
