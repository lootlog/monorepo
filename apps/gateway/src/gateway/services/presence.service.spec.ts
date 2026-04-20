import { buildRoomName } from "../utils/room-utils.js";
import type { Socket } from "../types/socket-user.type.js";
import { PresenceService } from "./presence.service.js";

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
  const publisher = {
    publish: vi.fn().mockResolvedValue(undefined),
  };
  const logger = {
    error: vi.fn(),
    warn: vi.fn(),
  };

  const mockFetchSockets = vi.fn();
  const mockServer = {
    in: vi.fn(() => ({
      fetchSockets: mockFetchSockets,
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PresenceService(publisher, logger);
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
});
