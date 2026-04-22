import { buildRoomName } from "src/gateway/utils/room-utils";
import type { Socket } from "src/gateway/types/socket-user.type";
import { PresenceService } from "./presence.service";
import { GatewayEvent } from "../enums/gateway-event.enum";
import { Platform } from "src/gateway/enums/platform.enum";
import { UserPresenceStatus } from "../enums/user-presence-status.enum";

const createPresenceSocket = (
  discordId: string,
  world: string,
  sessionId: string,
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
        lvl: "100",
        prof: "w",
        mapId: 1,
        mapName: "Map",
        isAfk: false,
        updatedAt: Date.now(),
        sessionId,
      },
    },
  }) as Socket;

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
    service = new PresenceService({
      publish: mockPublish,
    } as never);
  });

  describe("fetchGuildPresence", () => {
    it("returns all guild presence when world is not provided", async () => {
      const guildId = "guild-1";
      const presenceRoom = buildRoomName(guildId, "presence");
      const client = {
        rooms: new Set([presenceRoom]),
        data: { discordId: "viewer" },
      } as Socket;

      mockFetchSockets.mockResolvedValue([
        createPresenceSocket("discord-1", "alpha", "session-1"),
        createPresenceSocket("discord-2", "beta", "session-2"),
      ]);

      const result = await service.fetchGuildPresence(
        mockServer as never,
        client,
        guildId,
      );

      expect(result["discord-1"]).toHaveLength(1);
      expect(result["discord-2"]).toHaveLength(1);
      expect(result["discord-1"][0].world).toBe("alpha");
      expect(result["discord-2"][0].world).toBe("beta");
    });

    it("filters guild presence by world when world is provided", async () => {
      const guildId = "guild-1";
      const presenceRoom = buildRoomName(guildId, "presence");
      const client = {
        rooms: new Set([presenceRoom]),
        data: { discordId: "viewer" },
      } as Socket;

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

      expect(Object.keys(result)).toHaveLength(2);
      expect(result["discord-1"]).toHaveLength(1);
      expect(result["discord-1"][0].world).toBe("alpha");
      expect(result["discord-2"]).toHaveLength(1);
      expect(result["discord-2"][0].world).toBe("alpha");
    });

    it("returns empty object when client is not in guild presence room", async () => {
      const guildId = "guild-1";
      const client = {
        rooms: new Set(["guild-2:presence"]),
        data: { discordId: "viewer" },
      } as Socket;

      const result = await service.fetchGuildPresence(
        mockServer as never,
        client,
        guildId,
        "alpha",
      );

      expect(result).toEqual({});
      expect(mockServer.in).not.toHaveBeenCalled();
    });
  });

  describe("fetchServerPresence", () => {
    it("returns empty object when client is not in guild presence room", async () => {
      const result = await service.fetchServerPresence(
        mockServer as never,
        {
          rooms: new Set(["guild-2:presence"]),
          data: {
            discordId: "viewer",
            platform: Platform.GAME,
          },
        } as Socket,
        "guild-1",
        "alpha",
      );

      expect(result).toEqual({});
      expect(mockServer.in).not.toHaveBeenCalled();
    });

    it("filters server presence by world and hides web app sockets from game clients", async () => {
      const guildId = "guild-1";
      const presenceRoom = buildRoomName(guildId, "presence");
      const gameSocket = {
        data: {
          discordId: "discord-game",
          platform: Platform.GAME,
          player: {
            world: "alpha",
            lvl: "200",
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
          rooms: new Set([presenceRoom]),
          data: {
            discordId: "viewer",
            platform: Platform.GAME,
          },
        } as Socket,
        guildId,
        "alpha",
      );

      expect(result).toEqual({
        "discord-game": [
          {
            discordId: "discord-game",
            platform: Platform.GAME,
            player: {
              world: "alpha",
              lvl: "200",
            },
          },
        ],
      });
    });
  });

  describe("live presence events", () => {
    it("emits update-server-presence when player location changes", () => {
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
          playerPresence: {
            world: "alpha",
            name: "Hero",
            characterId: "10",
            accountId: "20",
            icon: "icon",
            lvl: "100",
            prof: "w",
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

      expect(mockEmit).toHaveBeenCalledWith(
        GatewayEvent.UPDATE_SERVER_PRESENCE,
        expect.objectContaining({
          guildId: "guild-1",
          discordId: "discord-1",
          player: expect.objectContaining({
            mapId: 2,
            mapName: "Ithan",
          }),
        }),
      );
    });

    it("emits update-server-presence for initial game presence", () => {
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

      expect(mockEmit).toHaveBeenCalledWith(
        GatewayEvent.UPDATE_SERVER_PRESENCE,
        expect.objectContaining({
          guildId: "guild-1",
          discordId: "discord-1",
          player: expect.objectContaining({
            mapName: "Karka-han",
          }),
        }),
      );
    });

    it("emits an offline update-server-presence payload on disconnect", () => {
      const mockClientEmit = vi.fn();
      const client = {
        id: "session-1",
        rooms: new Set(["session-1", buildRoomName("guild-1", "presence")]),
        to: vi.fn(() => ({
          emit: mockClientEmit,
        })),
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

      service.emitDisconnectPresence(client);

      expect(mockClientEmit).toHaveBeenCalledWith(
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
  });
});
