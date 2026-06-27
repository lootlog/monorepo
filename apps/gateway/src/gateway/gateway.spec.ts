import { Gateway } from "./gateway";
import { GatewayEvent } from "./enums/gateway-event.enum";
import { Platform } from "./enums/platform.enum";
import { UserPresenceStatus } from "./enums/user-presence-status.enum";

describe("Gateway", () => {
  const mockConnectionService = {
    getConnectionMetadata: vi.fn(),
    validateConnection: vi.fn(),
    initializeSocketData: vi.fn(),
  };

  const mockPresenceService = {
    emitDisconnectPresence: vi.fn(),
    broadcastPlayerDisconnect: vi.fn(),
    fetchOnlinePlayersPresence: vi.fn(),
    fetchMemberWebPresence: vi.fn(),
    updatePlayerPresence: vi.fn(),
    fetchEventPresence: vi.fn(),
    checkPresenceForMap: vi.fn(),
    emitMemberWebPresenceUpdate: vi.fn(),
  };

  const mockSubscriptionService = {
    handleJoin: vi.fn(),
    handleDisconnect: vi.fn(),
  };

  const mockGatewayAuthService = {
    verifyConnectionIdentity: vi.fn(),
  };

  const mockServer = {};

  let gateway: Gateway;

  beforeEach(() => {
    gateway = new Gateway(
      mockConnectionService as never,
      mockPresenceService as never,
      mockSubscriptionService as never,
      mockGatewayAuthService as never,
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
      platform: Platform.UNKNOWN,
    });
    mockGatewayAuthService.verifyConnectionIdentity.mockResolvedValue(null);
    mockConnectionService.validateConnection.mockReturnValue({
      valid: false,
    });

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.on).not.toHaveBeenCalled();
  });

  it("disconnects spoofed websocket connections without a verified session", async () => {
    const client = {
      request: {
        headers: {
          "x-auth-discord-id": "spoofed-discord",
          "x-auth-user-id": "spoofed-user",
          origin: "https://lootlog.com",
        },
      },
      handshake: {},
      disconnect: vi.fn(),
      on: vi.fn(),
    };

    mockGatewayAuthService.verifyConnectionIdentity.mockResolvedValue(null);
    mockConnectionService.getConnectionMetadata.mockReturnValue({
      platform: Platform.WEB_APP,
    });
    mockConnectionService.validateConnection.mockReturnValue({
      valid: false,
    });

    await gateway.handleConnection(client as never);

    expect(mockConnectionService.validateConnection).toHaveBeenCalledWith(
      null,
      Platform.WEB_APP,
    );
    expect(client.disconnect).toHaveBeenCalled();
    expect(mockConnectionService.initializeSocketData).not.toHaveBeenCalled();
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
      platform: Platform.GAME,
    });
    mockGatewayAuthService.verifyConnectionIdentity.mockResolvedValue({
      discordId: "discord-1",
      userId: "user-1",
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

  it("emits web presence offline when a web socket disconnects", async () => {
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
      platform: Platform.WEB_APP,
      guilds: [
        {
          guild: { id: "guild-1", ownerId: "owner-1" },
          roles: [],
        },
      ],
    };

    mockConnectionService.getConnectionMetadata.mockReturnValue({
      platform: Platform.WEB_APP,
    });
    mockGatewayAuthService.verifyConnectionIdentity.mockResolvedValue({
      discordId: "discord-1",
      userId: "user-1",
    });
    mockConnectionService.validateConnection.mockReturnValue({ valid: true });
    mockConnectionService.initializeSocketData.mockReturnValue(socketData);
    mockSubscriptionService.handleDisconnect.mockResolvedValue(undefined);
    mockPresenceService.broadcastPlayerDisconnect.mockResolvedValue(undefined);

    await gateway.handleConnection(client as never);
    await disconnectingHandler();

    expect(
      mockPresenceService.emitMemberWebPresenceUpdate,
    ).toHaveBeenCalledWith(mockServer, client, UserPresenceStatus.OFFLINE);
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
        margonemAccountProof: {
          userId: "20",
          characterId: "10",
          token:
            "lootlog:socket-1:20:02000000000000000affffffffffffffff0123456789abcdef0123456789abcdef",
          ts: 1_700_000_000,
          validatedString:
            "20+lootlog:socket-1:20:02000000000000000affffffffffffffff0123456789abcdef0123456789abcdef+1700000000",
          signatureBase64: "signature",
        },
      } as never,
    );

    expect(mockSubscriptionService.handleJoin).toHaveBeenCalledWith(
      mockServer,
      client,
      "discord-1",
      "user-1",
      expect.any(Object),
      expect.any(Object),
    );
    expect(client.emit).toHaveBeenCalledWith(GatewayEvent.JOIN, joinResult);
  });

  it("delegates online players presence fetch through the presence service", async () => {
    const client = {
      data: {
        platform: Platform.GAME,
      },
      rooms: new Set(["guild-1:presence"]),
    };
    const expectedPresence = {
      "discord-1": [{ player: { name: "Hero" } }],
    };

    mockPresenceService.fetchOnlinePlayersPresence.mockResolvedValue(
      expectedPresence,
    );

    await expect(
      gateway.handleOnlinePlayersPresenceFetch(
        client as never,
        {
          guildId: "guild-1",
          world: "alpha",
        } as never,
      ),
    ).resolves.toEqual(expectedPresence);
  });

  it("delegates member web presence fetch through the presence service", async () => {
    const client = {
      data: {
        platform: Platform.WEB_APP,
      },
      rooms: new Set(["guild-1:presence"]),
    };
    const expectedPresence = {
      status: "success",
      sessions: {
        "discord-1": [{ sessionId: "session-1" }],
      },
    };

    mockPresenceService.fetchMemberWebPresence.mockResolvedValue(
      expectedPresence,
    );

    await expect(
      gateway.handleMemberWebPresenceFetch(
        client as never,
        {
          guildId: "guild-1",
        } as never,
      ),
    ).resolves.toEqual(expectedPresence);
    expect(mockPresenceService.fetchMemberWebPresence).toHaveBeenCalledWith(
      mockServer,
      client,
      "guild-1",
    );
  });
});
