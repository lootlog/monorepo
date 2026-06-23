import { Permission } from "@lootlog/types";
import { SubscriptionService } from "./subscription.service";
import { Platform } from "../enums/platform.enum";
import { ResponseStatus } from "../enums/response-status.enum";
import { ErrorMessages } from "../constants/error-messages.constant";
import { ActivityType } from "../enums/activity-type.enum";
import { buildRoomName } from "../utils/room-utils";
import type { MargonemAccountProofDto } from "../dto/join-gateway.dto";
import type { SocketUserPlayer } from "../types/socket-user.type";
import type { UserGuildData, GuildRole } from "src/guilds/types/guild.types";

function createRole(
  permissions: Permission[],
  lvlRangeFrom = 1,
  lvlRangeTo = 500,
): GuildRole {
  return {
    id: crypto.randomUUID(),
    permissions,
    lvlRangeFrom,
    lvlRangeTo,
  };
}

function createGuild(options: {
  discordId: string;
  ownerId?: string;
  permissions?: Permission[];
}): UserGuildData {
  return {
    guild: {
      id: "guild-1",
      ownerId: options.ownerId ?? "owner-1",
    },
    roles: [createRole(options.permissions ?? [])],
  };
}

function createPlayer(): SocketUserPlayer {
  return {
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
  };
}

function createMargonemAccountProof(
  overrides: Partial<MargonemAccountProofDto> = {},
): MargonemAccountProofDto {
  const proof = {
    userId: "20",
    token: "lootlog:socket-1:20:0123456789abcdef0123456789abcdef",
    ts: 1_700_000_000,
    validatedString:
      "20+lootlog:socket-1:20:0123456789abcdef0123456789abcdef+1700000000",
    signatureBase64: "signature",
    ...overrides,
  };

  return proof;
}

describe("SubscriptionService", () => {
  const mockGuildsService = {
    getUserGuilds: vi.fn(),
  };

  const mockPresenceService = {
    emitPresenceToRooms: vi.fn(),
    emitInitialPresence: vi.fn(),
  };

  const mockActivityService = {
    publishActivityEvent: vi.fn(),
  };

  const mockMargonemAccountProofService = {
    verifyProof: vi.fn(),
  };

  const mockServer = {};

  let service: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionService(
      mockGuildsService as never,
      mockPresenceService as never,
      mockActivityService as never,
      mockMargonemAccountProofService as never,
    );
    mockActivityService.publishActivityEvent.mockResolvedValue(undefined);
    mockMargonemAccountProofService.verifyProof.mockResolvedValue({
      valid: true,
    });
  });

  it("returns an error when the user has no guilds", async () => {
    const client = {
      data: {
        platform: Platform.WEB_APP,
      },
      join: vi.fn(),
      request: { headers: {} },
    };

    mockGuildsService.getUserGuilds.mockResolvedValue([]);

    const result = await service.handleJoin(
      mockServer as never,
      client as never,
      "discord-1",
      "user-1",
      undefined,
    );

    expect(result).toEqual({
      status: ResponseStatus.ERROR,
      message: ErrorMessages.NO_GUILDS_FOUND,
    });
    expect(client.join).not.toHaveBeenCalled();
    expect(mockPresenceService.emitInitialPresence).not.toHaveBeenCalled();
    expect(mockMargonemAccountProofService.verifyProof).not.toHaveBeenCalled();
  });

  it("rejects game joins without a valid Margonem account proof before resolving guilds", async () => {
    const client = {
      id: "socket-1",
      data: {
        discordId: "discord-1",
        sessionId: "socket-1",
        userId: "user-1",
        platform: Platform.GAME,
      },
      join: vi.fn(),
      request: { headers: {} },
    };

    mockMargonemAccountProofService.verifyProof.mockResolvedValueOnce({
      valid: false,
      reason: "missing proof",
    });

    const result = await service.handleJoin(
      mockServer as never,
      client as never,
      "discord-1",
      "user-1",
      createPlayer(),
      undefined,
    );

    expect(result).toEqual({
      status: ResponseStatus.ERROR,
      code: "MARGONEM_ACCOUNT_PROOF_INVALID",
      message: ErrorMessages.MARGONEM_ACCOUNT_PROOF_INVALID,
    });
    expect(mockMargonemAccountProofService.verifyProof).toHaveBeenCalledWith({
      proof: undefined,
      socketId: "socket-1",
      accountId: "20",
    });
    expect(mockGuildsService.getUserGuilds).not.toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
    expect(mockActivityService.publishActivityEvent).not.toHaveBeenCalled();
  });

  it("grants owner full room access and emits initial presence for game clients", async () => {
    const player = createPlayer();
    const guilds = [
      createGuild({
        discordId: "discord-owner",
        ownerId: "discord-owner",
      }),
    ];
    const client = {
      id: "socket-1",
      data: {
        discordId: "discord-owner",
        sessionId: "socket-1",
        userId: "user-1",
        platform: Platform.GAME,
      },
      join: vi.fn(),
      request: { headers: { "user-agent": "Vitest" } },
    };

    mockGuildsService.getUserGuilds.mockResolvedValue(guilds);

    const result = await service.handleJoin(
      mockServer as never,
      client as never,
      "discord-owner",
      "user-1",
      player,
      createMargonemAccountProof(),
    );

    expect(result.status).toBe(ResponseStatus.SUCCESS);
    expect(result.featureRooms).toEqual(
      expect.arrayContaining([
        buildRoomName("guild-1", "admin"),
        buildRoomName("guild-1", "online-players"),
        buildRoomName("guild-1", "chat", "base"),
        buildRoomName("guild-1", "chat", "titans"),
        buildRoomName("guild-1", "chat", "heroes"),
        buildRoomName("guild-1", "timers", "base"),
        buildRoomName("guild-1", "timers", "titans"),
        buildRoomName("guild-1", "timers", "heroes"),
        buildRoomName("guild-1", "notifications", "base"),
        buildRoomName("guild-1", "notifications", "titans"),
        buildRoomName("guild-1", "notifications", "heroes"),
      ]),
    );
    expect(client.join).toHaveBeenCalledWith(result.featureRooms);
    expect(mockPresenceService.emitInitialPresence).toHaveBeenCalledWith(
      mockServer,
      client,
      "discord-owner",
      ["guild-1"],
    );
  });

  it("does not treat LOOTLOG_MANAGE as an admin bypass", async () => {
    const guilds = [
      createGuild({
        discordId: "discord-1",
        permissions: [Permission.LOOTLOG_MANAGE],
      }),
    ];
    const client = {
      id: "socket-1",
      data: {
        discordId: "discord-1",
        sessionId: "socket-1",
        userId: "user-1",
        platform: Platform.GAME,
      },
      join: vi.fn(),
      request: { headers: {} },
    };

    mockGuildsService.getUserGuilds.mockResolvedValue(guilds);

    const result = await service.handleJoin(
      mockServer as never,
      client as never,
      "discord-1",
      "user-1",
      createPlayer(),
      createMargonemAccountProof(),
    );

    expect(result.featureRooms).toEqual(
      expect.arrayContaining([
        buildRoomName("guild-1", "presence"),
        buildRoomName("guild-1", "events"),
      ]),
    );
    expect(result.featureRooms).not.toContain(
      buildRoomName("guild-1", "admin"),
    );
    expect(result.featureRooms).not.toContain(
      buildRoomName("guild-1", "chat", "base"),
    );
    expect(result.featureRooms).not.toContain(
      buildRoomName("guild-1", "timers", "base"),
    );
    expect(result.featureRooms).not.toContain(
      buildRoomName("guild-1", "online-players"),
    );
  });

  it("joins online players room when role has online players permission", async () => {
    const guilds = [
      createGuild({
        discordId: "discord-1",
        permissions: [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
      }),
    ];
    const client = {
      id: "socket-1",
      data: {
        discordId: "discord-1",
        sessionId: "socket-1",
        userId: "user-1",
        platform: Platform.GAME,
      },
      join: vi.fn(),
      request: { headers: {} },
    };

    mockGuildsService.getUserGuilds.mockResolvedValue(guilds);

    const result = await service.handleJoin(
      mockServer as never,
      client as never,
      "discord-1",
      "user-1",
      createPlayer(),
      createMargonemAccountProof(),
    );

    expect(result.featureRooms).toEqual(
      expect.arrayContaining([
        buildRoomName("guild-1", "presence"),
        buildRoomName("guild-1", "events"),
        buildRoomName("guild-1", "online-players"),
      ]),
    );
  });

  it("keeps web clients out of chat and notifications rooms", async () => {
    const guilds = [
      createGuild({
        discordId: "discord-1",
        permissions: [
          Permission.LOOTLOG_CHAT_READ,
          Permission.LOOTLOG_TIMERS_READ,
          Permission.LOOTLOG_NOTIFICATIONS_READ,
        ],
      }),
    ];
    const client = {
      data: {
        discordId: "discord-1",
        sessionId: "socket-1",
        userId: "user-1",
        platform: Platform.WEB_APP,
      },
      join: vi.fn(),
      request: { headers: {} },
    };

    mockGuildsService.getUserGuilds.mockResolvedValue(guilds);

    const result = await service.handleJoin(
      mockServer as never,
      client as never,
      "discord-1",
      "user-1",
      createPlayer(),
    );

    expect(result.featureRooms).toEqual(
      expect.arrayContaining([
        buildRoomName("guild-1", "presence"),
        buildRoomName("guild-1", "events"),
        buildRoomName("guild-1", "timers", "base"),
      ]),
    );
    expect(result.featureRooms).not.toContain(
      buildRoomName("guild-1", "chat", "base"),
    );
    expect(result.featureRooms).not.toContain(
      buildRoomName("guild-1", "notifications", "base"),
    );
    expect(mockPresenceService.emitInitialPresence).not.toHaveBeenCalled();
    expect(mockMargonemAccountProofService.verifyProof).not.toHaveBeenCalled();
    expect(mockActivityService.publishActivityEvent).toHaveBeenCalledWith(
      ActivityType.CONNECT_EVENT,
      client,
      guilds,
    );
  });

  it("returns join failed when guild access cannot be resolved", async () => {
    const client = {
      id: "socket-1",
      data: {
        platform: Platform.GAME,
      },
      join: vi.fn(),
      request: { headers: {} },
    };

    mockGuildsService.getUserGuilds.mockRejectedValue(
      new Error("guild API unavailable"),
    );

    const result = await service.handleJoin(
      mockServer as never,
      client as never,
      "discord-1",
      "user-1",
      createPlayer(),
      createMargonemAccountProof(),
    );

    expect(result).toEqual({
      status: ResponseStatus.ERROR,
      message: ErrorMessages.JOIN_FAILED,
    });
  });
});
