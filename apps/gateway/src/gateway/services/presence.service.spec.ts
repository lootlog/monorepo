import { buildRoomName } from "src/gateway/utils/room-utils";
import type { Socket } from "src/gateway/types/socket-user.type";
import { PresenceService } from "./presence.service";
import { Platform } from "src/gateway/enums/platform.enum";

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

  const mockFetchSockets = vi.fn();
  const mockServer = {
    in: vi.fn(() => ({
      fetchSockets: mockFetchSockets,
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PresenceService({} as never);
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
});
