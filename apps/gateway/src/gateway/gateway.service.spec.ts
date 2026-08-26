import { Test, type TestingModule } from "@nestjs/testing";
import { GatewayService } from "./gateway.service";
import { Gateway } from "./gateway";
import { RedisService } from "@lootlog/nest-shared/redis";
import { GuildsService } from "../guilds/guilds.service";
import { CreateTimerDto } from "./dto/create-timer.dto";
import type { DeleteTimerDto } from "./dto/delete-timer.dto";
import { MessageType, SendMessageDto } from "./dto/send-message.dto";
import { SendNotificationDto } from "./dto/send-notification.dto";
import type { RefreshJobUpdateDto } from "./dto/refresh-job-update.dto";
import { NpcType } from "./enums/npc-type.enum";
import { GatewayEvent } from "./enums/gateway-event.enum";
import { Platform } from "./enums/platform.enum";
import { Permission, type PartyReadyRoomUpdateEnvelope } from "@lootlog/types";
import { ActivityType } from "./enums/activity-type.enum";
import { ActivityService } from "./services/activity.service";
import { PresenceService } from "./services/presence.service";
import type {
  ReservationCreateEventDto,
  ReservationChangedEventV2Dto,
  ReservationDeleteEventDto,
} from "./dto/reservation-event.dto";
import type { ChatMessageEnvelopeDto } from "./dto/chat-message-envelope.dto";
import type { ChatMessagesClearDto } from "./dto/chat-messages-clear.dto";
import { AirTagService } from "./services/air-tag.service";

describe("GatewayService", () => {
  let service: GatewayService;

  const mockSocket = {
    id: "socket-123",
    data: {
      discordId: "discord-123",
      guilds: [],
    },
    emit: vi.fn(),
    leave: vi.fn(),
    join: vi.fn(),
    rooms: new Set(["room-1"]),
  };

  const mockServer = {
    to: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    fetchSockets: vi.fn(),
  };

  const mockGateway = {
    server: mockServer,
  };

  const mockRedisService = {
    del: vi.fn(),
  };

  const mockGuildsService = {
    invalidateUserGuildsCache: vi.fn(),
    getUserGuilds: vi.fn(),
  };

  const mockActivityService = {
    publishActivityEventForGuildIds: vi.fn(),
  };

  const mockPresenceService = {
    emitDisconnectPresenceForGuildIds: vi.fn(),
    broadcastPlayerDisconnectForGuildIds: vi.fn(),
  };

  const mockAirTagService = {
    clearSubscription: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-initialize mock return values after clearAllMocks
    mockServer.to.mockReturnThis();
    mockServer.in.mockReturnThis();
    mockServer.emit.mockReturnThis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        {
          provide: Gateway,
          useValue: mockGateway,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: GuildsService,
          useValue: mockGuildsService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
        {
          provide: PresenceService,
          useValue: mockPresenceService,
        },
        {
          provide: AirTagService,
          useValue: mockAirTagService,
        },
      ],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
  });

  it("emits a Ready Room update only to the recipient's user-and-guild rooms", () => {
    const envelope = {
      recipientDiscordId: "participant",
      eligibleGuildIds: ["guild-1", "guild-2"],
      update: {
        schemaVersion: 3,
        type: "UPSERT",
        projection: {
          schemaVersion: 3,
          notificationId: "room-1",
          organizerDiscordId: "organizer",
          organizerCharacter: {
            accountId: "account",
            characterId: "character",
            icon: "character.gif",
            lvl: 200,
            nick: "Organizer",
            prof: "w",
          },
          guildIds: ["guild-1", "guild-2"],
          world: "Fobos",
          status: "ACTIVE",
          revision: 2,
          createdAt: "2026-07-13T10:00:00.000Z",
          updatedAt: "2026-07-13T10:01:00.000Z",
          expiresAt: "2026-07-13T10:30:00.000Z",
          viewer: "PARTICIPANT",
          participants: {
            "participant-1": {
              participantId: "participant-1",
              discordId: "participant",
              character: {
                accountId: "participant-account",
                characterId: "participant-character",
                icon: "participant.gif",
                lvl: 190,
                nick: "Participant",
                prof: "m",
              },
              partyPresence: "OUTSIDE",
              createdAt: "2026-07-13T10:01:00.000Z",
              updatedAt: "2026-07-13T10:01:00.000Z",
            },
          },
        },
      },
    } satisfies PartyReadyRoomUpdateEnvelope;

    service.handlePartyReadyRoomUpdate(envelope);

    expect(mockServer.to).toHaveBeenCalledWith([
      "user:participant:guild:guild-1",
      "user:participant:guild:guild-2",
    ]);
    expect(mockServer.emit).toHaveBeenCalledWith(
      GatewayEvent.PARTY_READY_ROOM_UPDATE,
      envelope.update,
    );
  });

  // Helper function to wait for all promises
  async function flushPromises() {
    return new Promise((resolve) => setImmediate(resolve));
  }

  function createGuildRole(
    permissions: Permission[],
    lvlRangeFrom = 1,
    lvlRangeTo = 999,
  ) {
    return {
      id: crypto.randomUUID(),
      permissions,
      lvlRangeFrom,
      lvlRangeTo,
    };
  }

  function createSocketForGuild(options: {
    discordId: string;
    guildId?: string;
    ownerId?: string;
    roles: Array<{
      permissions: Permission[];
      lvlRangeFrom?: number;
      lvlRangeTo?: number;
    }>;
  }) {
    return {
      ...mockSocket,
      data: {
        discordId: options.discordId,
        guilds: [
          {
            guild: {
              id: options.guildId ?? "guild-123",
              ownerId: options.ownerId ?? "different-user",
            },
            roles: options.roles.map((role) =>
              createGuildRole(
                role.permissions,
                role.lvlRangeFrom,
                role.lvlRangeTo,
              ),
            ),
          },
        ],
      },
      emit: vi.fn(),
    };
  }

  function createChatMessageEnvelope(
    message: SendMessageDto,
    capabilities: Pick<ChatMessageEnvelopeDto, "canEdit" | "canDelete">,
  ): ChatMessageEnvelopeDto {
    return {
      ...message,
      ...capabilities,
    };
  }

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("handleGuildsTimerUpdate", () => {
    const npcData = {
      id: 1,
      name: "Test NPC",
      lvl: 100,
      prof: "warrior",
      type: NpcType.TITAN,
      margonemType: "1",
      location: "test-location",
      wt: "1000",
      icon: "icon.png",
      createdAt: new Date(),
      updatedAt: new Date(),
      lootId: null,
      x: 15,
      y: 15,
    };

    const timerDto = new CreateTimerDto();
    timerDto.guildId = "guild-123";
    timerDto.world = "test-world";
    timerDto.minSpawnTime = 1000;
    timerDto.maxSpawnTime = 2000;
    timerDto.npc = npcData;
    timerDto.location = "test-location";

    it("should emit timer update to eligible sockets with TITAN permissions", async () => {
      const mockSocketWithPermissions = {
        ...mockSocket,
        data: {
          discordId: "discord-123",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_TIMERS_TITANS_READ],
                  lvlRangeFrom: 50,
                  lvlRangeTo: 150,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockSocketWithPermissions]);

      await service.handleGuildsTimerUpdate(timerDto);

      // Wait for async promise chain to complete
      await flushPromises();
      // Feature room for titan timers
      expect(mockServer.in).toHaveBeenCalledWith("guild-123:timers:titans");
      expect(mockServer.fetchSockets).toHaveBeenCalled();
      expect(mockSocketWithPermissions.emit).toHaveBeenCalledWith(
        GatewayEvent.TIMERS_CREATE,
        timerDto,
      );
    });

    it("should not emit to sockets without TITAN permissions (socket not in room)", async () => {
      // Socket without TITAN permission would not be in the 'guild-123:timers:titans' room
      // so fetchSockets from that room returns empty
      mockServer.fetchSockets.mockResolvedValue([]);

      await service.handleGuildsTimerUpdate(timerDto);

      // Feature room for titan timers
      expect(mockServer.in).toHaveBeenCalledWith("guild-123:timers:titans");
      expect(mockServer.fetchSockets).toHaveBeenCalled();
      // No sockets to emit to since none are in the room
    });

    it("should ignore socket fetch failures for filtered timer updates", async () => {
      mockServer.fetchSockets.mockRejectedValue(
        new Error("timeout reached while waiting for fetchSockets response"),
      );

      await service.handleGuildsTimerUpdate(timerDto);
      await flushPromises();

      expect(mockServer.fetchSockets).toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it("should emit to administrative users regardless of specific permissions", async () => {
      const mockAdminSocket = {
        ...mockSocket,
        data: {
          discordId: "discord-admin",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.ADMIN],
                  lvlRangeFrom: 1,
                  lvlRangeTo: 10,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockAdminSocket]);

      await service.handleGuildsTimerUpdate(timerDto);

      // Wait for async promise chain to complete
      await flushPromises();
      expect(mockAdminSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.TIMERS_CREATE,
        timerDto,
      );
    });

    it("should not emit to sockets without matching level range", async () => {
      const mockSocketWrongLevel = {
        ...mockSocket,
        data: {
          discordId: "discord-123",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_TIMERS_TITANS_READ],
                  lvlRangeFrom: 1,
                  lvlRangeTo: 50,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockSocketWrongLevel]);

      await service.handleGuildsTimerUpdate(timerDto);

      // Wait for async promise chain to complete
      expect(mockSocketWrongLevel.emit).not.toHaveBeenCalled();
    });

    it("should not emit to sockets without matching guild", async () => {
      const mockSocketWrongGuild = {
        ...mockSocket,
        data: {
          discordId: "discord-123",
          guilds: [
            {
              guild: { id: "guild-456", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_TIMERS_TITANS_READ],
                  lvlRangeFrom: 50,
                  lvlRangeTo: 150,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockSocketWrongGuild]);

      await service.handleGuildsTimerUpdate(timerDto);

      // Wait for async promise chain to complete
      expect(mockSocketWrongGuild.emit).not.toHaveBeenCalled();
    });
  });

  describe("handleChatMessagesClear", () => {
    it("broadcasts guild-wide chat clear to every chat room tier", async () => {
      const payload: ChatMessagesClearDto = {
        guildId: "guild-123",
      };

      service.handleChatMessagesClear(payload);

      expect(mockServer.to).toHaveBeenCalledWith([
        "guild-123:chat:base",
        "guild-123:chat:titans",
        "guild-123:chat:heroes",
      ]);
      expect(mockServer.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGES_CLEAR,
        { guildId: "guild-123" },
      );
    });
  });

  describe("handleGuildsTimerDelete", () => {
    it("should emit timer delete event only to the routed timer room", async () => {
      const allowedSocket = {
        ...mockSocket,
        data: {
          discordId: "discord-123",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_TIMERS_TITANS_READ],
                  lvlRangeFrom: 250,
                  lvlRangeTo: 350,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      const deleteDto: DeleteTimerDto = {
        guildId: "guild-123",
        world: "world-1",
        npcId: 1,
        routing: {
          tier: "titans",
          npcLevel: 300,
        },
      };

      mockServer.fetchSockets.mockResolvedValue([allowedSocket]);

      await service.handleGuildsTimerDelete(deleteDto);

      await flushPromises();

      expect(mockServer.in).toHaveBeenCalledWith("guild-123:timers:titans");
      expect(allowedSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.TIMERS_DELETE,
        {
          guildId: "guild-123",
          world: "world-1",
          npcId: 1,
        },
      );
    });
  });

  describe("handleGuildsReservationCreate", () => {
    it("should emit reservation create event to events room", () => {
      const payload: ReservationCreateEventDto = {
        guildId: "guild-123",
        reservation: {
          id: 42,
          reservationId: "raid",
          createdDate: new Date().toISOString(),
          fromDate: new Date().toISOString(),
          toDate: new Date(Date.now() + 3_600_000).toISOString(),
          createdBy: "discord-123",
        },
      };

      service.handleGuildsReservationCreate(payload);

      expect(mockServer.to).toHaveBeenCalledWith("guild-123:events");
      expect(mockServer.emit).toHaveBeenCalledWith(
        GatewayEvent.RESERVATIONS_CREATE,
        payload,
      );
    });
  });

  describe("handleGuildsReservationDelete", () => {
    it("should emit reservation delete event to events room", () => {
      const payload: ReservationDeleteEventDto = {
        guildId: "guild-123",
        reservation: {
          id: 43,
          reservationId: "raid",
          createdDate: new Date().toISOString(),
          fromDate: new Date().toISOString(),
          toDate: new Date(Date.now() + 3_600_000).toISOString(),
          createdBy: "discord-123",
        },
      };

      service.handleGuildsReservationDelete(payload);

      expect(mockServer.to).toHaveBeenCalledWith("guild-123:events");
      expect(mockServer.emit).toHaveBeenCalledWith(
        GatewayEvent.RESERVATIONS_DELETE,
        payload,
      );
    });
  });

  describe("handleGuildsReservationChangedV2", () => {
    it("emits a PII-free invalidation to every unique audience room", () => {
      const payload: ReservationChangedEventV2Dto = {
        version: 2,
        action: "updated",
        sourceGuildId: "guild-source",
        audienceGuildIds: ["guild-source", "guild-partner", "guild-partner"],
        reservationId: 44,
        spotId: "potepione-zamczysko",
      };

      service.handleGuildsReservationChangedV2(payload);

      expect(mockServer.to).toHaveBeenCalledTimes(2);
      expect(mockServer.to).toHaveBeenNthCalledWith(1, "guild-source:events");
      expect(mockServer.to).toHaveBeenNthCalledWith(2, "guild-partner:events");
      expect(mockServer.emit).toHaveBeenCalledTimes(2);
      expect(mockServer.emit).toHaveBeenCalledWith(
        GatewayEvent.RESERVATIONS_CHANGED,
        payload,
      );
      expect(payload).not.toHaveProperty("author");
      expect(payload).not.toHaveProperty("comment");
    });
  });

  describe("handleGuildsLootCreate", () => {
    it("should emit loot create event to loot room", () => {
      const payload = {
        guildId: "guild-123",
        lootId: 42,
        npc: {
          type: "ELITE",
          wt: 10,
        },
      };

      service.handleGuildsLootCreate(payload);

      expect(mockServer.to).toHaveBeenCalledWith("guild-123:loots:base");
      expect(mockServer.emit).toHaveBeenCalledWith(
        GatewayEvent.LOOTS_CREATE,
        payload,
      );
    });
  });

  describe("handleGuildsLootShareUpdate", () => {
    it("should emit loot share update event to loot room", () => {
      const payload = {
        guildId: "guild-123",
        lootId: 42,
        lootShare: { player: ["item"] },
        npc: {
          type: "ELITE",
          wt: 10,
        },
      };

      service.handleGuildsLootShareUpdate(payload);

      expect(mockServer.to).toHaveBeenCalledWith("guild-123:loots:base");
      expect(mockServer.emit).toHaveBeenCalledWith(
        GatewayEvent.LOOTS_SHARE_UPDATE,
        payload,
      );
    });
  });

  describe("handleGuildMessageSend", () => {
    it("should emit regular chat messages with backend capabilities for each base-room viewer", async () => {
      const messageDto = new SendMessageDto();
      messageDto.id = "message-base";
      messageDto.guildId = "guild-123";
      messageDto.message = "Base message";
      messageDto.senderId = "sender-123";
      messageDto.timestamp = new Date().toISOString();
      messageDto.type = MessageType.NORMAL;
      messageDto.characterData = {
        nick: "SenderNick",
        id: 123,
        acc: 456,
        lvl: 50,
        prof: "warrior",
        icon: "icon.png",
      };
      const authorSocket = createSocketForGuild({
        discordId: "sender-123",
        roles: [
          {
            permissions: [Permission.LOOTLOG_CHAT_READ],
          },
        ],
      });
      const viewerSocket = createSocketForGuild({
        discordId: "discord-viewer",
        roles: [
          {
            permissions: [Permission.LOOTLOG_CHAT_READ],
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([authorSocket, viewerSocket]);

      service.handleGuildMessageSend(messageDto);

      await flushPromises();

      expect(mockServer.in).toHaveBeenCalledWith("guild-123:chat:base");
      expect(mockServer.fetchSockets).toHaveBeenCalled();
      expect(authorSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE,
        createChatMessageEnvelope(messageDto, {
          canEdit: true,
          canDelete: true,
        }),
      );
      expect(viewerSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE,
        createChatMessageEnvelope(messageDto, {
          canEdit: false,
          canDelete: false,
        }),
      );
    });

    it("should emit titan chat message to the titan room for numeric NPC payloads", async () => {
      const messageDto = new SendMessageDto();
      messageDto.id = "message-123";
      messageDto.guildId = "guild-123";
      messageDto.message = "Test message";
      messageDto.senderId = "sender-123";
      messageDto.timestamp = new Date().toISOString();
      messageDto.type = MessageType.NPC;
      messageDto.npc = {
        id: 1,
        name: "Titan NPC",
        lvl: 200,
        prof: "mage",
        type: 2 as unknown as string,
        margonemType: "2",
        location: "titan-location",
        wt: "120",
        icon: "titan.png",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };
      messageDto.characterData = {
        nick: "SenderNick",
        id: 123,
        acc: 456,
        lvl: 50,
        prof: "warrior",
        icon: "icon.png",
      };

      const mockSocketWithPermissions = {
        ...mockSocket,
        data: {
          discordId: "discord-123",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_CHAT_TITANS_READ],
                  lvlRangeFrom: 1,
                  lvlRangeTo: 999,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      mockServer.in.mockReturnValue(mockServer);
      mockServer.fetchSockets.mockResolvedValue([mockSocketWithPermissions]);

      await service.handleGuildMessageSend(messageDto);

      await flushPromises();

      expect(mockServer.in).toHaveBeenCalledWith("guild-123:chat:titans");
      expect(mockSocketWithPermissions.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE,
        createChatMessageEnvelope(messageDto, {
          canEdit: false,
          canDelete: false,
        }),
      );
    });

    it("should emit titan chat messages to owner without tier permission", async () => {
      const messageDto = new SendMessageDto();
      messageDto.id = "message-owner";
      messageDto.guildId = "guild-123";
      messageDto.message = "Owner message";
      messageDto.senderId = "sender-123";
      messageDto.timestamp = new Date().toISOString();
      messageDto.type = MessageType.NPC;
      messageDto.npc = {
        id: 1,
        name: "Titan NPC",
        lvl: 320,
        prof: "mage",
        type: "TITAN",
        margonemType: "2",
        location: "titan-location",
        wt: "120",
        icon: "titan.png",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };
      messageDto.characterData = {
        nick: "SenderNick",
        id: 123,
        acc: 456,
        lvl: 50,
        prof: "warrior",
        icon: "icon.png",
      };

      const ownerSocket = createSocketForGuild({
        discordId: "discord-owner",
        ownerId: "discord-owner",
        roles: [
          {
            permissions: [Permission.LOOTLOG_CHAT_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 100,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([ownerSocket]);

      service.handleGuildMessageSend(messageDto);

      await flushPromises();

      expect(ownerSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE,
        createChatMessageEnvelope(messageDto, {
          canEdit: true,
          canDelete: true,
        }),
      );
    });

    it("should not emit titan chat messages to LOOTLOG_MANAGE users without tier permission", async () => {
      const messageDto = new SendMessageDto();
      messageDto.id = "message-manage";
      messageDto.guildId = "guild-123";
      messageDto.message = "Manage message";
      messageDto.senderId = "sender-123";
      messageDto.timestamp = new Date().toISOString();
      messageDto.type = MessageType.NPC;
      messageDto.npc = {
        id: 1,
        name: "Titan NPC",
        lvl: 320,
        prof: "mage",
        type: "TITAN",
        margonemType: "2",
        location: "titan-location",
        wt: "120",
        icon: "titan.png",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };
      messageDto.characterData = {
        nick: "SenderNick",
        id: 123,
        acc: 456,
        lvl: 50,
        prof: "warrior",
        icon: "icon.png",
      };

      const manageSocket = createSocketForGuild({
        discordId: "discord-manage",
        roles: [
          {
            permissions: [Permission.LOOTLOG_MANAGE],
            lvlRangeFrom: 1,
            lvlRangeTo: 10,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([manageSocket]);

      service.handleGuildMessageSend(messageDto);

      await flushPromises();

      expect(manageSocket.emit).not.toHaveBeenCalled();
    });

    it("should emit titan chat messages to LOOTLOG_MANAGE users when another role explicitly grants the routed permission", async () => {
      const messageDto = new SendMessageDto();
      messageDto.id = "message-manage-explicit";
      messageDto.guildId = "guild-123";
      messageDto.message = "Manage explicit message";
      messageDto.senderId = "sender-123";
      messageDto.timestamp = new Date().toISOString();
      messageDto.type = MessageType.NPC;
      messageDto.npc = {
        id: 1,
        name: "Titan NPC",
        lvl: 320,
        prof: "mage",
        type: "TITAN",
        margonemType: "2",
        location: "titan-location",
        wt: "120",
        icon: "titan.png",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };
      messageDto.characterData = {
        nick: "SenderNick",
        id: 123,
        acc: 456,
        lvl: 50,
        prof: "warrior",
        icon: "icon.png",
      };

      const manageSocket = createSocketForGuild({
        discordId: "discord-manage",
        roles: [
          {
            permissions: [Permission.LOOTLOG_MANAGE],
            lvlRangeFrom: 1,
            lvlRangeTo: 10,
          },
          {
            permissions: [Permission.LOOTLOG_CHAT_TITANS_READ],
            lvlRangeFrom: 300,
            lvlRangeTo: 350,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([manageSocket]);

      service.handleGuildMessageSend(messageDto);

      await flushPromises();

      expect(manageSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE,
        createChatMessageEnvelope(messageDto, {
          canEdit: false,
          canDelete: false,
        }),
      );
    });

    it("should emit chat messages when one of multiple roles fully matches", async () => {
      const messageDto = new SendMessageDto();
      messageDto.id = "message-multi";
      messageDto.guildId = "guild-123";
      messageDto.message = "Multi role";
      messageDto.senderId = "sender-123";
      messageDto.timestamp = new Date().toISOString();
      messageDto.type = MessageType.NPC;
      messageDto.npc = {
        id: 1,
        name: "Titan NPC",
        lvl: 300,
        prof: "mage",
        type: "TITAN",
        margonemType: "2",
        location: "titan-location",
        wt: "120",
        icon: "titan.png",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };
      messageDto.characterData = {
        nick: "SenderNick",
        id: 123,
        acc: 456,
        lvl: 50,
        prof: "warrior",
        icon: "icon.png",
      };

      const multiRoleSocket = createSocketForGuild({
        discordId: "discord-123",
        roles: [
          {
            permissions: [Permission.LOOTLOG_CHAT_HEROES_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 100,
          },
          {
            permissions: [Permission.LOOTLOG_CHAT_TITANS_READ],
            lvlRangeFrom: 250,
            lvlRangeTo: 350,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([multiRoleSocket]);

      service.handleGuildMessageSend(messageDto);

      await flushPromises();

      expect(multiRoleSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE,
        createChatMessageEnvelope(messageDto, {
          canEdit: false,
          canDelete: false,
        }),
      );
    });

    it("should not emit chat messages when permission and matching level are split across roles", async () => {
      const messageDto = new SendMessageDto();
      messageDto.id = "message-split";
      messageDto.guildId = "guild-123";
      messageDto.message = "Split role";
      messageDto.senderId = "sender-123";
      messageDto.timestamp = new Date().toISOString();
      messageDto.type = MessageType.NPC;
      messageDto.npc = {
        id: 1,
        name: "Titan NPC",
        lvl: 300,
        prof: "mage",
        type: "TITAN",
        margonemType: "2",
        location: "titan-location",
        wt: "120",
        icon: "titan.png",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };
      messageDto.characterData = {
        nick: "SenderNick",
        id: 123,
        acc: 456,
        lvl: 50,
        prof: "warrior",
        icon: "icon.png",
      };

      const splitRolesSocket = createSocketForGuild({
        discordId: "discord-123",
        roles: [
          {
            permissions: [Permission.LOOTLOG_CHAT_TITANS_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 299,
          },
          {
            permissions: [],
            lvlRangeFrom: 300,
            lvlRangeTo: 350,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([splitRolesSocket]);

      service.handleGuildMessageSend(messageDto);

      await flushPromises();

      expect(splitRolesSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe("chat message routing events", () => {
    it("should broadcast base chat updates without socket filtering", () => {
      service.handleChatMessageUpdate({
        guildId: "guild-123",
        messageId: "msg-base",
        message: "updated",
        routing: {
          tier: "base",
        },
      });

      expect(mockServer.to).toHaveBeenCalledWith("guild-123:chat:base");
      expect(mockServer.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE_UPDATE,
        {
          guildId: "guild-123",
          messageId: "msg-base",
          message: "updated",
        },
      );
      expect(mockServer.fetchSockets).not.toHaveBeenCalled();
    });

    it("should emit chat updates only to sockets with routed chat permissions", async () => {
      const allowedSocket = {
        ...mockSocket,
        data: {
          discordId: "discord-allowed",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_CHAT_TITANS_READ],
                  lvlRangeFrom: 250,
                  lvlRangeTo: 500,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      const disallowedSocket = {
        ...mockSocket,
        data: {
          discordId: "discord-blocked",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_CHAT_HEROES_READ],
                  lvlRangeFrom: 250,
                  lvlRangeTo: 500,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([
        allowedSocket,
        disallowedSocket,
      ]);

      service.handleChatMessageUpdate({
        guildId: "guild-123",
        messageId: "msg-1",
        message: "updated",
        routing: {
          tier: "titans",
          npcLevel: 300,
        },
      });

      await flushPromises();

      expect(mockServer.in).toHaveBeenCalledWith("guild-123:chat:titans");
      expect(allowedSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE_UPDATE,
        {
          guildId: "guild-123",
          messageId: "msg-1",
          message: "updated",
        },
      );
      expect(disallowedSocket.emit).not.toHaveBeenCalled();
    });

    it("should emit chat updates to owner even without matching tier permission", async () => {
      const ownerSocket = createSocketForGuild({
        discordId: "discord-owner",
        ownerId: "discord-owner",
        roles: [
          {
            permissions: [Permission.LOOTLOG_CHAT_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 100,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([ownerSocket]);

      service.handleChatMessageUpdate({
        guildId: "guild-123",
        messageId: "msg-owner",
        message: "updated",
        routing: {
          tier: "titans",
          npcLevel: 300,
        },
      });

      await flushPromises();

      expect(ownerSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE_UPDATE,
        {
          guildId: "guild-123",
          messageId: "msg-owner",
          message: "updated",
        },
      );
    });

    it("should emit chat deletes only to the routed chat room", async () => {
      const allowedSocket = {
        ...mockSocket,
        data: {
          discordId: "discord-allowed",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_CHAT_TITANS_READ],
                  lvlRangeFrom: 250,
                  lvlRangeTo: 500,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([allowedSocket]);

      service.handleChatMessageDelete({
        guildId: "guild-123",
        messageId: "msg-1",
        routing: {
          tier: "titans",
          npcLevel: 300,
        },
      });

      await flushPromises();

      expect(mockServer.in).toHaveBeenCalledWith("guild-123:chat:titans");
      expect(allowedSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE_DELETE,
        {
          guildId: "guild-123",
          messageId: "msg-1",
        },
      );
    });

    it("should not emit chat deletes to LOOTLOG_MANAGE users without matching tier permission", async () => {
      const manageSocket = createSocketForGuild({
        discordId: "discord-manage",
        roles: [
          {
            permissions: [Permission.LOOTLOG_MANAGE],
            lvlRangeFrom: 1,
            lvlRangeTo: 10,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([manageSocket]);

      service.handleChatMessageDelete({
        guildId: "guild-123",
        messageId: "msg-manage",
        routing: {
          tier: "titans",
          npcLevel: 300,
        },
      });

      await flushPromises();

      expect(manageSocket.emit).not.toHaveBeenCalled();
    });

    it("should emit chat deletes to LOOTLOG_MANAGE users when another role explicitly grants the routed permission", async () => {
      const manageSocket = createSocketForGuild({
        discordId: "discord-manage",
        roles: [
          {
            permissions: [Permission.LOOTLOG_MANAGE],
            lvlRangeFrom: 1,
            lvlRangeTo: 10,
          },
          {
            permissions: [Permission.LOOTLOG_CHAT_TITANS_READ],
            lvlRangeFrom: 250,
            lvlRangeTo: 350,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([manageSocket]);

      service.handleChatMessageDelete({
        guildId: "guild-123",
        messageId: "msg-manage-explicit",
        routing: {
          tier: "titans",
          npcLevel: 300,
        },
      });

      await flushPromises();

      expect(manageSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE_DELETE,
        {
          guildId: "guild-123",
          messageId: "msg-manage-explicit",
        },
      );
    });

    it("should not emit chat deletes to sockets from another guild", async () => {
      const wrongGuildSocket = createSocketForGuild({
        discordId: "discord-other",
        guildId: "guild-999",
        roles: [
          {
            permissions: [Permission.LOOTLOG_CHAT_TITANS_READ],
            lvlRangeFrom: 250,
            lvlRangeTo: 350,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([wrongGuildSocket]);

      service.handleChatMessageDelete({
        guildId: "guild-123",
        messageId: "msg-wrong-guild",
        routing: {
          tier: "titans",
          npcLevel: 300,
        },
      });

      await flushPromises();

      expect(wrongGuildSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe("handleGuildNotificationSend", () => {
    it("should emit notification to eligible sockets", async () => {
      const npcData = {
        id: 1,
        name: "Hero NPC",
        lvl: 200,
        prof: "mage",
        type: NpcType.HERO,
        margonemType: "2",
        location: "hero-location",
        wt: "2000",
        icon: "hero.png",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };

      const notificationDto = new SendNotificationDto();
      notificationDto.guildId = "guild-123";
      notificationDto.npc = npcData;

      const mockSocketWithHeroPerms = {
        ...mockSocket,
        data: {
          discordId: "discord-123",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ],
                  lvlRangeFrom: 150,
                  lvlRangeTo: 250,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockSocketWithHeroPerms]);

      await service.handleGuildNotificationSend(notificationDto);

      await flushPromises();

      expect(mockSocketWithHeroPerms.emit).toHaveBeenCalledWith(
        GatewayEvent.NOTIFICATIONS_SEND,
        notificationDto,
      );
    });

    it("should not emit notifications to LOOTLOG_MANAGE users without matching notification permission", async () => {
      const npcData = {
        id: 1,
        name: "Titan NPC",
        lvl: 320,
        prof: "mage",
        type: NpcType.TITAN,
        margonemType: "2",
        location: "titan-location",
        wt: "120",
        icon: "titan.png",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };

      const notificationDto = new SendNotificationDto();
      notificationDto.guildId = "guild-123";
      notificationDto.npc = npcData;

      const manageSocket = createSocketForGuild({
        discordId: "discord-manage",
        roles: [
          {
            permissions: [Permission.LOOTLOG_MANAGE],
            lvlRangeFrom: 1,
            lvlRangeTo: 10,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([manageSocket]);

      service.handleGuildNotificationSend(notificationDto);

      await flushPromises();

      expect(manageSocket.emit).not.toHaveBeenCalled();
    });

    it("should emit notifications to LOOTLOG_MANAGE users when another role explicitly grants the routed permission", async () => {
      const npcData = {
        id: 1,
        name: "Titan NPC",
        lvl: 320,
        prof: "mage",
        type: NpcType.TITAN,
        margonemType: "2",
        location: "titan-location",
        wt: "120",
        icon: "titan.png",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };

      const notificationDto = new SendNotificationDto();
      notificationDto.guildId = "guild-123";
      notificationDto.npc = npcData;

      const manageSocket = createSocketForGuild({
        discordId: "discord-manage",
        roles: [
          {
            permissions: [Permission.LOOTLOG_MANAGE],
            lvlRangeFrom: 1,
            lvlRangeTo: 10,
          },
          {
            permissions: [Permission.LOOTLOG_NOTIFICATIONS_TITANS_READ],
            lvlRangeFrom: 300,
            lvlRangeTo: 350,
          },
        ],
      });

      mockServer.fetchSockets.mockResolvedValue([manageSocket]);

      service.handleGuildNotificationSend(notificationDto);

      await flushPromises();

      expect(manageSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.NOTIFICATIONS_SEND,
        notificationDto,
      );
    });
  });

  describe("invalidatePlayerCache", () => {
    it("should delete player cache from Redis", async () => {
      const discordId = "discord-123";

      await service.invalidatePlayerCache(discordId);

      expect(mockRedisService.del).toHaveBeenCalledWith(discordId);
    });
  });

  describe("handleMembersRefreshJobUpdate", () => {
    it("should emit refresh job update to OWNER/ADMIN users only", async () => {
      const refreshDto: RefreshJobUpdateDto = {
        jobId: 1,
        guildId: "guild-123",
        status: "PROCESSING",
        totalMembers: 100,
        processedMembers: 50,
        failedMembers: 0,
      };

      const mockOwnerSocket = {
        ...mockSocket,
        data: {
          discordId: "discord-owner",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "discord-owner" },
              roles: [
                {
                  permissions: [Permission.OWNER],
                  lvlRangeFrom: 1,
                  lvlRangeTo: 999,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      const mockRegularSocket = {
        ...mockSocket,
        data: {
          discordId: "discord-regular",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "discord-owner" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_LOOTS_READ],
                  lvlRangeFrom: 1,
                  lvlRangeTo: 999,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([
        mockOwnerSocket,
        mockRegularSocket,
      ]);

      await service.handleMembersRefreshJobUpdate(refreshDto);

      // Admin room broadcast
      expect(mockServer.to).toHaveBeenCalledWith("guild-123:admin");
    });

    it("should emit to ADMIN users", async () => {
      const refreshDto: RefreshJobUpdateDto = {
        jobId: 1,
        guildId: "guild-123",
        status: "PROCESSING",
        totalMembers: 100,
        processedMembers: 75,
        failedMembers: 0,
      };

      const mockAdminSocket = {
        ...mockSocket,
        data: {
          discordId: "discord-admin",
          guilds: [
            {
              guild: { id: "guild-123", ownerId: "different-user" },
              roles: [
                {
                  permissions: [Permission.ADMIN],
                  lvlRangeFrom: 1,
                  lvlRangeTo: 999,
                },
              ],
            },
          ],
        },
        emit: vi.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockAdminSocket]);

      await service.handleMembersRefreshJobUpdate(refreshDto);

      expect(mockServer.to).toHaveBeenCalledWith("guild-123:admin");
    });
  });

  describe("invalidateUserGuildsCache", () => {
    it("should call guildsService to invalidate user guilds cache", async () => {
      const discordId = "discord-123";
      const userId = "user-123";

      await service.invalidateUserGuildsCache(discordId, userId);

      expect(mockGuildsService.invalidateUserGuildsCache).toHaveBeenCalledWith(
        discordId,
        userId,
      );
    });
  });

  describe("rebalanceUserSocketRooms", () => {
    it("should rebalance user socket rooms based on updated guilds", async () => {
      const discordId = "discord-123";
      const userId = "user-123";

      const updatedGuilds = [
        {
          guild: { id: "guild-1", ownerId: "discord-123" },
          roles: [],
        },
        {
          guild: { id: "guild-2", ownerId: "discord-123" },
          roles: [],
        },
      ];

      const mockUserSocket = {
        id: "socket-123",
        data: {
          discordId: "discord-123",
        },
        rooms: new Set([
          "socket-123",
          "guild-1:presence",
          "old-guild:presence",
        ]),
        leave: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
      };

      mockGuildsService.getUserGuilds.mockResolvedValue(updatedGuilds);
      mockServer.fetchSockets.mockResolvedValue([mockUserSocket]);

      await service.rebalanceUserSocketRooms(discordId, userId);

      expect(mockGuildsService.getUserGuilds).toHaveBeenCalledWith({
        discordId,
        userId,
      });
      expect(mockUserSocket.leave).toHaveBeenCalledWith("old-guild:presence");
      expect(mockUserSocket.join).toHaveBeenCalledWith("guild-2:presence");
      expect(mockUserSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.PERMISSIONS_UPDATED,
        expect.objectContaining({
          guilds: updatedGuilds,
          featureRooms: expect.any(Array),
        }),
      );
    });

    it("should finish joining rooms before notifying the client", async () => {
      const discordId = "discord-123";
      const userId = "user-123";
      let resolveEventsRoomJoin: (() => void) | undefined;
      const mockUserSocket = {
        id: "socket-123",
        data: {
          discordId,
          platform: Platform.WEB_APP,
        },
        rooms: new Set(["socket-123", "guild-1:presence"]),
        leave: vi.fn(),
        join: vi.fn((room: string) => {
          if (room !== "guild-1:events") {
            return Promise.resolve();
          }

          return new Promise<void>((resolve) => {
            resolveEventsRoomJoin = resolve;
          });
        }),
        emit: vi.fn(),
      };

      mockGuildsService.getUserGuilds.mockResolvedValue([
        {
          guild: { id: "guild-1", ownerId: "owner-1" },
          roles: [],
        },
      ]);
      mockServer.fetchSockets.mockResolvedValue([mockUserSocket]);

      const rebalancePromise = service.rebalanceUserSocketRooms(
        discordId,
        userId,
      );
      await vi.waitFor(() => {
        expect(mockUserSocket.join).toHaveBeenCalledWith("guild-1:events");
      });

      expect(mockUserSocket.emit).not.toHaveBeenCalled();

      resolveEventsRoomJoin?.();
      await rebalancePromise;

      expect(mockUserSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.PERMISSIONS_UPDATED,
        expect.any(Object),
      );
    });

    it("should publish disconnect cleanup for guilds removed during rebalance", async () => {
      const discordId = "discord-123";
      const userId = "user-123";
      const updatedGuilds = [
        {
          guild: { id: "guild-2", ownerId: "owner-1" },
          roles: [],
        },
      ];
      const mockUserSocket = {
        id: "socket-123",
        data: {
          discordId,
          userId,
          sessionId: "socket-123",
          platform: Platform.WEB_APP,
          guilds: [
            {
              guild: { id: "guild-1", ownerId: "owner-1" },
              roles: [],
            },
            {
              guild: { id: "guild-2", ownerId: "owner-1" },
              roles: [],
            },
          ],
        },
        rooms: new Set(["socket-123", "guild-1:presence", "guild-2:presence"]),
        leave: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
      };

      mockGuildsService.getUserGuilds.mockResolvedValue(updatedGuilds);
      mockServer.fetchSockets.mockResolvedValue([mockUserSocket]);

      await service.rebalanceUserSocketRooms(discordId, userId);

      expect(
        mockActivityService.publishActivityEventForGuildIds,
      ).toHaveBeenCalledWith(ActivityType.DISCONNECT_EVENT, mockUserSocket, [
        "guild-1",
      ]);
      expect(
        mockPresenceService.emitDisconnectPresenceForGuildIds,
      ).toHaveBeenCalledWith(mockServer, mockUserSocket, ["guild-1"]);
      expect(
        mockPresenceService.broadcastPlayerDisconnectForGuildIds,
      ).toHaveBeenCalledWith(mockServer, mockUserSocket, ["guild-1"]);
      expect(mockUserSocket.data.guilds).toEqual(updatedGuilds);
      expect(mockUserSocket.disconnect).not.toHaveBeenCalled();
    });

    it("should disconnect sockets after all guild access is removed", async () => {
      const discordId = "discord-123";
      const userId = "user-123";
      const mockUserSocket = {
        id: "socket-123",
        data: {
          discordId,
          userId,
          sessionId: "socket-123",
          platform: Platform.WEB_APP,
          guilds: [
            {
              guild: { id: "guild-1", ownerId: "owner-1" },
              roles: [],
            },
          ],
        },
        rooms: new Set(["socket-123", "guild-1:presence"]),
        leave: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
      };

      mockGuildsService.getUserGuilds.mockResolvedValue([]);
      mockServer.fetchSockets.mockResolvedValue([mockUserSocket]);

      await service.rebalanceUserSocketRooms(discordId, userId);

      expect(
        mockActivityService.publishActivityEventForGuildIds,
      ).toHaveBeenCalledWith(ActivityType.DISCONNECT_EVENT, mockUserSocket, [
        "guild-1",
      ]);
      expect(mockUserSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it("should handle case when user has no active sockets", async () => {
      const discordId = "discord-123";
      const userId = "user-123";

      mockGuildsService.getUserGuilds.mockResolvedValue([]);
      mockServer.fetchSockets.mockResolvedValue([]);

      await service.rebalanceUserSocketRooms(discordId, userId);

      expect(mockGuildsService.getUserGuilds).toHaveBeenCalled();
    });

    it("should not throw when socket fetch fails", async () => {
      const discordId = "discord-123";
      const userId = "user-123";

      mockGuildsService.getUserGuilds.mockResolvedValue([]);
      mockServer.fetchSockets.mockRejectedValue(
        new Error("timeout reached while waiting for fetchSockets response"),
      );

      await expect(
        service.rebalanceUserSocketRooms(discordId, userId),
      ).resolves.not.toThrow();
    });

    it("should handle errors gracefully", async () => {
      const discordId = "discord-123";
      const userId = "user-123";

      const errorMessage = "Database connection failed";
      mockGuildsService.getUserGuilds.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.rebalanceUserSocketRooms(discordId, userId),
      ).resolves.not.toThrow();
    });

    it("should only rebalance sockets for specific user", async () => {
      const discordId = "discord-target";
      const userId = "user-target";

      const updatedGuilds = [
        {
          guild: { id: "guild-1" },
          roles: [],
        },
      ];

      const mockTargetSocket = {
        id: "socket-target",
        data: {
          discordId: "discord-target",
        },
        rooms: new Set(["socket-target"]),
        leave: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
      };

      const mockOtherSocket = {
        id: "socket-other",
        data: {
          discordId: "discord-other",
        },
        rooms: new Set(["socket-other"]),
        leave: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
      };

      mockGuildsService.getUserGuilds.mockResolvedValue(updatedGuilds);
      mockServer.fetchSockets.mockResolvedValue([
        mockTargetSocket,
        mockOtherSocket,
      ]);

      await service.rebalanceUserSocketRooms(discordId, userId);

      expect(mockTargetSocket.emit).toHaveBeenCalled();
      expect(mockOtherSocket.emit).not.toHaveBeenCalled();
    });

    it("should grant admin and all feature rooms after promotion to admin", async () => {
      const discordId = "discord-123";
      const userId = "user-123";

      const updatedGuilds = [
        {
          guild: { id: "guild-1", ownerId: "owner-1" },
          roles: [createGuildRole([Permission.ADMIN])],
        },
      ];

      const mockUserSocket = {
        id: "socket-123",
        data: {
          discordId,
          platform: Platform.GAME,
        },
        rooms: new Set(["socket-123", "guild-1:presence", "guild-1:events"]),
        leave: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
      };

      mockGuildsService.getUserGuilds.mockResolvedValue(updatedGuilds);
      mockServer.fetchSockets.mockResolvedValue([mockUserSocket]);

      await service.rebalanceUserSocketRooms(discordId, userId);

      expect(mockUserSocket.join).toHaveBeenCalledWith("guild-1:admin");
      expect(mockUserSocket.join).toHaveBeenCalledWith("guild-1:chat:base");
      expect(mockUserSocket.join).toHaveBeenCalledWith(
        "guild-1:notifications:heroes",
      );
    });

    it("should remove admin and chat rooms when admin access is revoked", async () => {
      const discordId = "discord-123";
      const userId = "user-123";

      const updatedGuilds = [
        {
          guild: { id: "guild-1", ownerId: "owner-1" },
          roles: [],
        },
      ];

      const mockUserSocket = {
        id: "socket-123",
        data: {
          discordId,
          platform: Platform.GAME,
        },
        rooms: new Set([
          "socket-123",
          "guild-1:presence",
          "guild-1:events",
          "guild-1:admin",
          "guild-1:chat:base",
        ]),
        leave: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
      };

      mockGuildsService.getUserGuilds.mockResolvedValue(updatedGuilds);
      mockServer.fetchSockets.mockResolvedValue([mockUserSocket]);

      await service.rebalanceUserSocketRooms(discordId, userId);

      expect(mockUserSocket.leave).toHaveBeenCalledWith("guild-1:admin");
      expect(mockUserSocket.leave).toHaveBeenCalledWith("guild-1:chat:base");
    });

    it("should recalculate rooms per socket platform for the same user", async () => {
      const discordId = "discord-123";
      const userId = "user-123";

      const updatedGuilds = [
        {
          guild: { id: "guild-1", ownerId: "owner-1" },
          roles: [
            createGuildRole([
              Permission.LOOTLOG_CHAT_READ,
              Permission.LOOTLOG_TIMERS_READ,
              Permission.LOOTLOG_NOTIFICATIONS_READ,
            ]),
          ],
        },
      ];

      const gameSocket = {
        id: "socket-game",
        data: {
          discordId,
          platform: Platform.GAME,
        },
        rooms: new Set(["socket-game"]),
        leave: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
      };
      const webSocket = {
        id: "socket-web",
        data: {
          discordId,
          platform: Platform.WEB_APP,
        },
        rooms: new Set(["socket-web"]),
        leave: vi.fn(),
        join: vi.fn(),
        emit: vi.fn(),
      };

      mockGuildsService.getUserGuilds.mockResolvedValue(updatedGuilds);
      mockServer.fetchSockets.mockResolvedValue([gameSocket, webSocket]);

      await service.rebalanceUserSocketRooms(discordId, userId);

      expect(gameSocket.join).toHaveBeenCalledWith("guild-1:chat:base");
      expect(gameSocket.join).toHaveBeenCalledWith(
        "guild-1:notifications:base",
      );
      expect(webSocket.join).toHaveBeenCalledWith("guild-1:timers:base");
      expect(webSocket.join).not.toHaveBeenCalledWith("guild-1:chat:base");
      expect(webSocket.join).not.toHaveBeenCalledWith(
        "guild-1:notifications:base",
      );
    });
  });
});
