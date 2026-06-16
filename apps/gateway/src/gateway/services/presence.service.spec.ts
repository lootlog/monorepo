import { buildRoomName } from "src/gateway/utils/room-utils";
import type { Socket } from "src/gateway/types/socket-user.type";
import { PresenceService } from "./presence.service";
import { GatewayEvent } from "../enums/gateway-event.enum";
import { Platform } from "src/gateway/enums/platform.enum";
import { UserPresenceStatus } from "../enums/user-presence-status.enum";
import { Permission } from "@lootlog/types";

const createPresenceSocket = (
  discordId: string,
  world: string,
  sessionId: string,
  lvl = "100",
): Socket =>
  ({
    data: {
      discordId,
      playerPresence: {
        world,
        name: "Test Player",
        characterId: "char-1",
        accountId: "acc-1",
        icon: "icon",
        lvl,
        prof: "w",
        mapId: 1,
        mapName: "Map",
        isAfk: false,
        updatedAt: Date.now(),
        sessionId,
      },
    },
  }) as Socket;

const createViewerClient = (
  guildId: string,
  permissions: Permission[] = [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
): Socket =>
  ({
    rooms: new Set([
      buildRoomName(guildId, "presence"),
      buildRoomName(guildId, "online-players"),
    ]),
    data: {
      discordId: "viewer",
      platform: Platform.GAME,
      guilds: [
        {
          guild: {
            id: guildId,
            ownerId: "owner-1",
          },
          roles: [
            {
              id: "role-1",
              lvlRangeFrom: 1,
              lvlRangeTo: 500,
              permissions,
            },
          ],
        },
      ],
    },
  }) as Socket;

const createOnlinePlayersViewerSocket = (
  guildId: string,
  permissions: Permission[] = [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
) => ({
  id: "viewer-socket",
  data: createViewerClient(guildId, permissions).data,
  emit: vi.fn(),
});

describe("PresenceService", () => {
  let service: PresenceService;

  const mockPublish = vi.fn();
  const mockFetchSockets = vi.fn();
  const mockEmit = vi.fn();
  const mockServer = {
    in: vi.fn(() => ({
      fetchSockets: mockFetchSockets,
    })),
    to: vi.fn(() => ({
      emit: mockEmit,
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchSockets.mockResolvedValue([]);
    service = new PresenceService({
      publish: mockPublish,
    } as never);
  });

  describe("fetchGuildPresence", () => {
    it("returns all guild presence when world is not provided", async () => {
      const guildId = "guild-1";
      const client = createViewerClient(guildId);

      mockFetchSockets.mockResolvedValue([
        createPresenceSocket("discord-1", "alpha", "session-1"),
        createPresenceSocket("discord-2", "beta", "session-2"),
      ]);

      const result = await service.fetchGuildPresence(
        mockServer as never,
        client,
        guildId,
      );

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.players["discord-1"]).toHaveLength(1);
      expect(result.players["discord-2"]).toHaveLength(1);
      expect(result.players["discord-1"][0].world).toBe("alpha");
      expect(result.players["discord-2"][0].world).toBe("beta");
    });

    it("filters guild presence by world when world is provided", async () => {
      const guildId = "guild-1";
      const client = createViewerClient(guildId);

      mockFetchSockets.mockResolvedValue([
        createPresenceSocket("discord-1", "alpha", "session-1"),
        createPresenceSocket("discord-1", "beta", "session-2"),
        createPresenceSocket("discord-2", "alpha", "session-3"),
      ]);

      const result = await service.fetchGuildPresence(
        mockServer as never,
        client,
        guildId,
        "alpha",
      );

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(Object.keys(result.players)).toHaveLength(2);
      expect(result.players["discord-1"]).toHaveLength(1);
      expect(result.players["discord-1"][0].world).toBe("alpha");
      expect(result.players["discord-2"]).toHaveLength(1);
      expect(result.players["discord-2"][0].world).toBe("alpha");
    });

    it("does not filter guild presence by viewer role level range", async () => {
      const guildId = "guild-1";
      const client = createViewerClient(guildId);
      client.data.guilds![0].roles[0].lvlRangeFrom = 250;
      client.data.guilds![0].roles[0].lvlRangeTo = 300;

      mockFetchSockets.mockResolvedValue([
        createPresenceSocket("discord-1", "alpha", "session-1", "64"),
      ]);

      const result = await service.fetchGuildPresence(
        mockServer as never,
        client,
        guildId,
        "alpha",
      );

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.players["discord-1"][0].lvl).toBe("64");
    });

    it("returns forbidden when client is not in guild online players room", async () => {
      const guildId = "guild-1";
      const client = {
        rooms: new Set([buildRoomName(guildId, "presence")]),
        data: createViewerClient(guildId).data,
      } as Socket;

      const result = await service.fetchGuildPresence(
        mockServer as never,
        client,
        guildId,
        "alpha",
      );

      expect(result).toEqual({
        status: "forbidden",
        code: "ONLINE_PLAYERS_ACCESS_DENIED",
      });
      expect(mockServer.in).not.toHaveBeenCalled();
    });
  });

  describe("fetchServerPresence", () => {
    it("returns forbidden when client is not in guild online players room", async () => {
      const guildId = "guild-1";
      const result = await service.fetchServerPresence(
        mockServer as never,
        {
          rooms: new Set([buildRoomName(guildId, "presence")]),
          data: createViewerClient(guildId).data,
        } as Socket,
        guildId,
        "alpha",
      );

      expect(result).toEqual({
        status: "forbidden",
        code: "ONLINE_PLAYERS_ACCESS_DENIED",
      });
      expect(mockServer.in).not.toHaveBeenCalled();
    });

    it("filters server presence by world and hides web app sockets from game clients", async () => {
      const guildId = "guild-1";
      const gameSocket = {
        data: {
          discordId: "discord-game",
          platform: Platform.GAME,
          player: {
            world: "alpha",
            lvl: "200",
            clan: {
              id: 15191,
              name: "Karhu",
              rank: 100,
            },
          },
          sessionId: "session-game",
          userId: "user-game",
          guilds: [],
        },
      };
      const webSocket = {
        data: {
          discordId: "discord-web",
          platform: Platform.WEB_APP,
          player: {
            world: "alpha",
            lvl: "150",
          },
          sessionId: "session-web",
          userId: "user-web",
          guilds: [],
        },
      };
      const otherWorldSocket = {
        data: {
          discordId: "discord-other",
          platform: Platform.GAME,
          player: {
            world: "beta",
            lvl: "250",
          },
          sessionId: "session-other",
          userId: "user-other",
          guilds: [],
        },
      };

      mockFetchSockets.mockResolvedValue([
        gameSocket,
        webSocket,
        otherWorldSocket,
      ]);

      const result = await service.fetchServerPresence(
        mockServer as never,
        {
          ...createViewerClient(guildId),
        } as Socket,
        guildId,
        "alpha",
      );

      expect(result).toEqual({
        status: "success",
        players: {
          "discord-game": [
            {
              discordId: "discord-game",
              platform: Platform.GAME,
              player: {
                world: "alpha",
                lvl: "200",
                clan: {
                  id: 15191,
                  name: "Karhu",
                  rank: 100,
                },
              },
            },
          ],
        },
      });
    });

    it("sorts server presence with the requesting player first and other players by level", async () => {
      const guildId = "guild-1";
      const viewerSocket = {
        data: {
          discordId: "discord-viewer",
          platform: Platform.GAME,
          player: {
            world: "alpha",
            characterId: "10",
            lvl: "50",
          },
          sessionId: "session-viewer",
          userId: "user-viewer",
          guilds: [],
        },
      };
      const highLevelSocket = {
        data: {
          discordId: "discord-high",
          platform: Platform.GAME,
          player: {
            world: "alpha",
            characterId: "20",
            lvl: "300",
          },
          sessionId: "session-high",
          userId: "user-high",
          guilds: [],
        },
      };
      const midLevelSocket = {
        data: {
          discordId: "discord-mid",
          platform: Platform.GAME,
          player: {
            world: "alpha",
            characterId: "30",
            lvl: "150",
          },
          sessionId: "session-mid",
          userId: "user-mid",
          guilds: [],
        },
      };

      mockFetchSockets.mockResolvedValue([
        midLevelSocket,
        highLevelSocket,
        viewerSocket,
      ]);

      const result = await service.fetchServerPresence(
        mockServer as never,
        {
          ...createViewerClient(guildId),
          data: {
            ...createViewerClient(guildId).data,
            player: {
              characterId: "10",
            },
          },
        } as Socket,
        guildId,
        "alpha",
      );

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(Object.keys(result.players)).toEqual([
        "discord-viewer",
        "discord-high",
        "discord-mid",
      ]);
      expect(result.players["discord-viewer"][0].player).toEqual({
        world: "alpha",
        characterId: "10",
        lvl: "50",
      });
      expect(result.players["discord-high"][0].player.lvl).toBe("300");
      expect(result.players["discord-mid"][0].player.lvl).toBe("150");
    });
  });

  describe("live presence events", () => {
    it("emits update-server-presence when player location changes", async () => {
      const viewerSocket = createOnlinePlayersViewerSocket("guild-1");
      mockFetchSockets.mockResolvedValue([viewerSocket]);
      const client = {
        id: "session-1",
        data: {
          guilds: [{ guild: { id: "guild-1" } }],
          player: {
            world: "alpha",
            name: "Hero",
            characterId: "10",
            accountId: "20",
            icon: "icon",
            lvl: "100",
            prof: "w",
            clan: {
              id: 15191,
              name: "Karhu",
              rank: 100,
            },
            location: {
              x: 1,
              y: 2,
              map: "Karka-han",
            },
          },
          playerPresence: {
            world: "alpha",
            name: "Hero",
            characterId: "10",
            accountId: "20",
            icon: "icon",
            lvl: "100",
            prof: "w",
            clan: {
              id: 15191,
              name: "Karhu",
              rank: 100,
            },
            mapId: 1,
            mapName: "Karka-han",
            isAfk: false,
            updatedAt: Date.now(),
            sessionId: "session-1",
          },
        },
      } as unknown as Socket;

      service.updatePlayerPresence(
        client,
        "discord-1",
        {
          mapId: 2,
          mapName: "Ithan",
        } as never,
        mockServer as never,
      );

      await Promise.resolve();

      expect(viewerSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.UPDATE_SERVER_PRESENCE,
        expect.objectContaining({
          guildId: "guild-1",
          discordId: "discord-1",
          player: expect.objectContaining({
            mapId: 2,
            mapName: "Ithan",
            clan: {
              id: 15191,
              name: "Karhu",
              rank: 100,
            },
          }),
        }),
      );
    });

    it("emits update-server-presence for initial game presence", async () => {
      const viewerSocket = createOnlinePlayersViewerSocket("guild-1");
      mockFetchSockets.mockResolvedValue([viewerSocket]);
      const client = {
        id: "session-1",
        data: {
          platform: Platform.GAME,
          player: {
            world: "alpha",
            name: "Hero",
            characterId: "10",
            accountId: "20",
            icon: "icon",
            lvl: "100",
            prof: "w",
            clan: {
              id: 15191,
              name: "Karhu",
              rank: 100,
            },
            location: {
              x: 1,
              y: 2,
              map: "Karka-han",
            },
          },
        },
      } as unknown as Socket;

      service.emitInitialPresence(mockServer as never, client, "discord-1", [
        "guild-1",
      ]);

      await Promise.resolve();

      expect(viewerSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.UPDATE_SERVER_PRESENCE,
        expect.objectContaining({
          guildId: "guild-1",
          discordId: "discord-1",
          player: expect.objectContaining({
            mapName: "Karka-han",
            clan: {
              id: 15191,
              name: "Karhu",
              rank: 100,
            },
          }),
        }),
      );
    });

    it("emits an offline update-server-presence payload on disconnect", async () => {
      const viewerSocket = createOnlinePlayersViewerSocket("guild-1");
      mockFetchSockets.mockResolvedValue([viewerSocket]);
      const client = {
        id: "session-1",
        rooms: new Set(["session-1", buildRoomName("guild-1", "presence")]),
        data: {
          discordId: "discord-1",
          sessionId: "session-1",
          player: {
            world: "alpha",
            name: "Hero",
            characterId: "10",
            accountId: "20",
            icon: "icon",
            lvl: "100",
            prof: "w",
            location: {
              x: 1,
              y: 2,
              map: "Karka-han",
            },
          },
          playerPresence: {
            world: "alpha",
            name: "Hero",
            characterId: "10",
            accountId: "20",
            icon: "icon",
            lvl: "100",
            prof: "w",
            mapId: 1,
            mapName: "Ithan",
            isAfk: false,
            updatedAt: Date.now(),
            sessionId: "session-1",
          },
        },
      } as unknown as Socket;

      service.emitDisconnectPresence(mockServer as never, client);

      await Promise.resolve();

      expect(viewerSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.UPDATE_SERVER_PRESENCE,
        expect.objectContaining({
          guildId: "guild-1",
          discordId: "discord-1",
          status: UserPresenceStatus.OFFLINE,
          player: expect.objectContaining({
            mapName: "Ithan",
          }),
        }),
      );
    });

    it("does not emit live presence to sockets without online players permission", async () => {
      const viewerSocket = createOnlinePlayersViewerSocket("guild-1", []);
      mockFetchSockets.mockResolvedValue([viewerSocket]);
      const client = {
        id: "session-1",
        data: {
          guilds: [{ guild: { id: "guild-1" } }],
          player: {
            world: "alpha",
            name: "Hero",
            characterId: "10",
            accountId: "20",
            icon: "icon",
            lvl: "100",
            prof: "w",
            location: {
              x: 1,
              y: 2,
              map: "Karka-han",
            },
          },
        },
      } as unknown as Socket;

      service.updatePlayerPresence(
        client,
        "discord-1",
        {
          mapId: 2,
          mapName: "Ithan",
        } as never,
        mockServer as never,
      );

      await Promise.resolve();

      expect(viewerSocket.emit).not.toHaveBeenCalled();
    });
  });
});
