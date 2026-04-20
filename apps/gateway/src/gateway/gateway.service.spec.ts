import { Permission } from "@lootlog/types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GatewayEvent } from "./enums/gateway-event.enum.js";
import { GatewayService } from "./gateway.service.js";
import { SocketServerRef } from "./socket-server-ref.js";
import { NpcType } from "./enums/npc-type.enum.js";
import type { CreateTimerDto } from "./dto/create-timer.dto.js";
import type { RefreshJobUpdateDto } from "./dto/refresh-job-update.dto.js";
import type { VolunteerNotificationDto } from "./dto/volunteer-notification.dto.js";

describe("GatewayService", () => {
  const logger = {
    error: vi.fn(),
  };
  const redisStore = {
    del: vi.fn(),
  };
  const guildsService = {
    getUserGuilds: vi.fn(),
    invalidateUserGuildsCache: vi.fn(),
  };
  const presenceService = {
    checkPresenceForMap: vi.fn(),
  };

  const mockNamespace = {
    emit: vi.fn(),
    fetchSockets: vi.fn(),
    in: vi.fn(),
    to: vi.fn(),
  };

  let service: GatewayService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockNamespace.in.mockReturnValue({
      fetchSockets: mockNamespace.fetchSockets,
    });
    mockNamespace.to.mockReturnValue({
      emit: mockNamespace.emit,
    });

    const socketServerRef = new SocketServerRef();
    socketServerRef.set(mockNamespace as never);

    service = new GatewayService(
      socketServerRef,
      redisStore as never,
      guildsService as never,
      presenceService as never,
      logger,
    );
  });

  it("emits titan timer updates only to sockets that still have room access", async () => {
    const timerDto: CreateTimerDto = {
      guildId: "guild-123",
      world: "alpha",
      minSpawnTime: 1000,
      maxSpawnTime: 2000,
      location: "map",
      npc: {
        id: 1,
        name: "Titan",
        lvl: 100,
        x: 1,
        y: 1,
        prof: "w",
        type: NpcType.TITAN,
        margonemType: "1",
        location: "map",
        wt: "1000",
        icon: "icon",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
      },
    };
    const allowedSocket = {
      data: {
        discordId: "discord-1",
        guilds: [
          {
            guild: {
              id: "guild-123",
              ownerId: "discord-owner",
            },
            roles: [
              {
                id: "role-1",
                lvlRangeFrom: 90,
                lvlRangeTo: 110,
                permissions: [Permission.LOOTLOG_TIMERS_TITANS_READ],
              },
            ],
          },
        ],
      },
      emit: vi.fn(),
    };
    const deniedSocket = {
      data: {
        discordId: "discord-2",
        guilds: [
          {
            guild: {
              id: "guild-123",
              ownerId: "discord-owner",
            },
            roles: [
              {
                id: "role-2",
                lvlRangeFrom: 1,
                lvlRangeTo: 50,
                permissions: [Permission.LOOTLOG_TIMERS_TITANS_READ],
              },
            ],
          },
        ],
      },
      emit: vi.fn(),
    };

    mockNamespace.fetchSockets.mockResolvedValue([allowedSocket, deniedSocket]);

    await service.handleGuildsTimerUpdate(timerDto);

    expect(mockNamespace.in).toHaveBeenCalledWith("guild-123:timers:titans");
    expect(allowedSocket.emit).toHaveBeenCalledWith(
      GatewayEvent.TIMERS_CREATE,
      timerDto,
    );
    expect(deniedSocket.emit).not.toHaveBeenCalled();
  });

  it("emits refresh job updates to the admin room", async () => {
    const payload: RefreshJobUpdateDto = {
      guildId: "guild-123",
      jobId: 15,
      status: "PROCESSING",
      totalMembers: 20,
      processedMembers: 10,
      failedMembers: 1,
    };

    await service.handleMembersRefreshJobUpdate(payload);

    expect(mockNamespace.to).toHaveBeenCalledWith("guild-123:admin");
    expect(mockNamespace.emit).toHaveBeenCalledWith(
      GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE,
      payload,
    );
  });

  it("delegates guild cache invalidation to GuildsService", async () => {
    await service.invalidateUserGuildsCache("discord-123", "user-123");

    expect(guildsService.invalidateUserGuildsCache).toHaveBeenCalledWith(
      "discord-123",
      "user-123",
    );
  });

  it("rebalances socket rooms after permission changes", async () => {
    const socket = {
      data: {
        discordId: "discord-123",
        platform: "web-app",
        guilds: [],
      },
      emit: vi.fn(),
      id: "socket-1",
      join: vi.fn(),
      leave: vi.fn(),
      rooms: new Set(["socket-1", "old-room"]),
    };

    guildsService.getUserGuilds.mockResolvedValue([
      {
        guild: {
          id: "guild-123",
          ownerId: "discord-owner",
        },
        roles: [
          {
            id: "role-1",
            lvlRangeFrom: 1,
            lvlRangeTo: 999,
            permissions: [Permission.LOOTLOG_TIMERS_READ],
          },
        ],
      },
    ]);
    mockNamespace.fetchSockets.mockResolvedValue([socket]);

    await service.rebalanceUserSocketRooms("discord-123", "user-123");

    expect(socket.leave).toHaveBeenCalledWith("old-room");
    expect(socket.join).toHaveBeenCalledWith("guild-123:presence");
    expect(socket.join).toHaveBeenCalledWith("guild-123:events");
    expect(socket.join).toHaveBeenCalledWith("guild-123:timers:base");
    expect(socket.emit).toHaveBeenCalledWith(
      GatewayEvent.PERMISSIONS_UPDATED,
      expect.objectContaining({
        guilds: expect.any(Array),
        featureRooms: expect.arrayContaining([
          "guild-123:presence",
          "guild-123:events",
          "guild-123:timers:base",
        ]),
      }),
    );
  });

  it("sends volunteer notifications only to target sockets", async () => {
    const targetSocket = {
      data: {
        discordId: "discord-target",
      },
      emit: vi.fn(),
    };
    const otherSocket = {
      data: {
        discordId: "discord-other",
      },
      emit: vi.fn(),
    };
    const payload: VolunteerNotificationDto = {
      notificationId: "notification-1",
      targetDiscordId: "discord-target",
      volunteerDiscordId: "discord-volunteer",
      world: "alpha",
      character: {
        lvl: 100,
        nick: "Volunteer",
        accountId: "account-1",
        characterId: "character-1",
        prof: "h",
        icon: "icon",
      },
    };

    mockNamespace.fetchSockets.mockResolvedValue([targetSocket, otherSocket]);

    await service.handleVolunteerNotification(payload);

    expect(targetSocket.emit).toHaveBeenCalledWith(
      GatewayEvent.NOTIFICATIONS_VOLUNTEER,
      {
        notificationId: "notification-1",
        volunteer: {
          discordId: "discord-volunteer",
          world: "alpha",
          lvl: 100,
          nick: "Volunteer",
          accountId: "account-1",
          characterId: "character-1",
          prof: "h",
          icon: "icon",
        },
      },
    );
    expect(otherSocket.emit).not.toHaveBeenCalled();
  });
});
