import { Test, type TestingModule } from '@nestjs/testing';
import { GatewayService } from './gateway.service';
import { Gateway } from './gateway';
import { RedisService } from '../lib/redis/redis.service';
import { GuildsService } from '../guilds/guilds.service';
import { CreateTimerDto } from './dto/create-timer.dto';
import type { DeleteTimerDto } from './dto/delete-timer.dto';
import { MessageType, SendMessageDto } from './dto/send-message.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import type { RefreshJobUpdateDto } from './dto/refresh-job-update.dto';
import { NpcType } from './enums/npc-type.enum';
import { GatewayEvent } from './enums/gateway-event.enum';
import { Permission } from '../guilds/enum/permission.type';

describe('GatewayService', () => {
  let service: GatewayService;

  const mockSocket = {
    id: 'socket-123',
    data: {
      discordId: 'discord-123',
      guilds: [],
    },
    emit: jest.fn(),
    leave: jest.fn(),
    join: jest.fn(),
    rooms: new Set(['room-1']),
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    fetchSockets: jest.fn(),
  };

  const mockGateway = {
    server: mockServer,
  };

  const mockRedisService = {
    del: jest.fn(),
  };

  const mockGuildsService = {
    invalidateUserGuildsCache: jest.fn(),
    getUserGuilds: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
      ],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
  });

  // Helper function to wait for all promises
  async function flushPromises() {
    return new Promise((resolve) => setImmediate(resolve));
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleGuildsTimerUpdate', () => {
    const npcData = {
      id: 1,
      name: 'Test NPC',
      lvl: 100,
      prof: 'warrior',
      type: NpcType.TITAN,
      margonemType: '1',
      location: 'test-location',
      wt: '1000',
      icon: 'icon.png',
      createdAt: new Date(),
      updatedAt: new Date(),
      lootId: null,
      x: 15,
      y: 15,
    };

    const timerDto = new CreateTimerDto();
    timerDto.guildId = 'guild-123';
    timerDto.world = 'test-world';
    timerDto.minSpawnTime = 1000;
    timerDto.maxSpawnTime = 2000;
    timerDto.npc = npcData;
    timerDto.location = 'test-location';

    it('should emit timer update to eligible sockets with TITAN permissions', async () => {
      const mockSocketWithPermissions = {
        ...mockSocket,
        data: {
          discordId: 'discord-123',
          guilds: [
            {
              guild: { id: 'guild-123', ownerId: 'different-user' },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_READ_TIMERS_TITANS],
                  lvlRangeFrom: 50,
                  lvlRangeTo: 150,
                },
              ],
            },
          ],
        },
        emit: jest.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockSocketWithPermissions]);

      await service.handleGuildsTimerUpdate(timerDto);

      // Wait for async promise chain to complete
      expect(mockServer.in).toHaveBeenCalledWith('guild-123');
      expect(mockServer.fetchSockets).toHaveBeenCalled();
      expect(mockSocketWithPermissions.emit).toHaveBeenCalledWith(
        GatewayEvent.TIMERS_CREATE,
        timerDto,
      );
    });

    it('should not emit to sockets without TITAN permissions', async () => {
      const mockSocketWithoutPermissions = {
        ...mockSocket,
        data: {
          discordId: 'discord-123',
          guilds: [
            {
              guild: { id: 'guild-123', ownerId: 'different-user' },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_READ],
                  lvlRangeFrom: 50,
                  lvlRangeTo: 150,
                },
              ],
            },
          ],
        },
        emit: jest.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockSocketWithoutPermissions]);

      await service.handleGuildsTimerUpdate(timerDto);

      // Wait for async promise chain to complete
      expect(mockSocketWithoutPermissions.emit).not.toHaveBeenCalled();
    });

    it('should emit to administrative users regardless of specific permissions', async () => {
      const mockAdminSocket = {
        ...mockSocket,
        data: {
          discordId: 'discord-admin',
          guilds: [
            {
              guild: { id: 'guild-123', ownerId: 'different-user' },
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
        emit: jest.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockAdminSocket]);

      await service.handleGuildsTimerUpdate(timerDto);

      // Wait for async promise chain to complete
      expect(mockAdminSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.TIMERS_CREATE,
        timerDto,
      );
    });

    it('should not emit to sockets without matching level range', async () => {
      const mockSocketWrongLevel = {
        ...mockSocket,
        data: {
          discordId: 'discord-123',
          guilds: [
            {
              guild: { id: 'guild-123', ownerId: 'different-user' },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_READ_TIMERS_TITANS],
                  lvlRangeFrom: 1,
                  lvlRangeTo: 50,
                },
              ],
            },
          ],
        },
        emit: jest.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockSocketWrongLevel]);

      await service.handleGuildsTimerUpdate(timerDto);

      // Wait for async promise chain to complete
      expect(mockSocketWrongLevel.emit).not.toHaveBeenCalled();
    });

    it('should not emit to sockets without matching guild', async () => {
      const mockSocketWrongGuild = {
        ...mockSocket,
        data: {
          discordId: 'discord-123',
          guilds: [
            {
              guild: { id: 'guild-456', ownerId: 'different-user' },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_READ_TIMERS_TITANS],
                  lvlRangeFrom: 50,
                  lvlRangeTo: 150,
                },
              ],
            },
          ],
        },
        emit: jest.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockSocketWrongGuild]);

      await service.handleGuildsTimerUpdate(timerDto);

      // Wait for async promise chain to complete
      expect(mockSocketWrongGuild.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleGuildsTimerDelete', () => {
    it('should emit timer delete event to guild room', async () => {
      const deleteDto: DeleteTimerDto = {
        guildId: 'guild-123',
        world: 'world-1',
        npcId: 1,
      };

      await service.handleGuildsTimerDelete(deleteDto);

      expect(mockServer.to).toHaveBeenCalledWith('guild-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        GatewayEvent.TIMERS_DELETE,
        deleteDto,
      );
    });
  });

  describe('handleGuildMessageSend', () => {
    it('should emit chat message to eligible sockets', async () => {
      const messageDto = new SendMessageDto();
      messageDto.id = 'message-123';
      messageDto.guildId = 'guild-123';
      messageDto.message = 'Test message';
      messageDto.senderId = 'sender-123';
      messageDto.timestamp = new Date().toISOString();
      messageDto.type = MessageType.NORMAL;
      messageDto.npc = {
        id: 1,
        name: 'Hero NPC',
        lvl: 200,
        prof: 'mage',
        type: NpcType.HERO,
        margonemType: '2',
        location: 'hero-location',
        wt: '2000',
        icon: 'hero.png',
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };
      messageDto.characterData = {
        nick: 'SenderNick',
        id: 123,
        acc: 456,
        lvl: 50,
        prof: 'warrior',
        icon: 'icon.png',
      };

      const mockSocketWithPermissions = {
        ...mockSocket,
        data: {
          discordId: 'discord-123',
          guilds: [
            {
              guild: { id: 'guild-123', ownerId: 'different-user' },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_READ],
                  lvlRangeFrom: 1,
                  lvlRangeTo: 999,
                },
              ],
            },
          ],
        },
        emit: jest.fn(),
      };

      mockServer.in.mockReturnValue(mockServer);
      mockServer.fetchSockets.mockResolvedValue([mockSocketWithPermissions]);

      await service.handleGuildMessageSend(messageDto);

      await flushPromises();

      expect(mockServer.in).toHaveBeenCalledWith('guild-123');
      expect(mockSocketWithPermissions.emit).toHaveBeenCalledWith(
        GatewayEvent.CHAT_MESSAGE,
        messageDto,
      );
    });
  });

  describe('handleGuildNotificationSend', () => {
    it('should emit notification to eligible sockets', async () => {
      const npcData = {
        id: 1,
        name: 'Hero NPC',
        lvl: 200,
        prof: 'mage',
        type: NpcType.HERO,
        margonemType: '2',
        location: 'hero-location',
        wt: '2000',
        icon: 'hero.png',
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: null,
        x: 15,
        y: 15,
      };

      const notificationDto = new SendNotificationDto();
      notificationDto.guildId = 'guild-123';
      notificationDto.npc = npcData;

      const mockSocketWithHeroPerms = {
        ...mockSocket,
        data: {
          discordId: 'discord-123',
          guilds: [
            {
              guild: { id: 'guild-123', ownerId: 'different-user' },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_READ_TIMERS_HEROES],
                  lvlRangeFrom: 150,
                  lvlRangeTo: 250,
                },
              ],
            },
          ],
        },
        emit: jest.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockSocketWithHeroPerms]);

      await service.handleGuildNotificationSend(notificationDto);

      await flushPromises();

      expect(mockSocketWithHeroPerms.emit).toHaveBeenCalledWith(
        GatewayEvent.NOTIFICATIONS_SEND,
        notificationDto,
      );
    });
  });

  describe('invalidatePlayerCache', () => {
    it('should delete player cache from Redis', async () => {
      const discordId = 'discord-123';

      await service.invalidatePlayerCache(discordId);

      expect(mockRedisService.del).toHaveBeenCalledWith(discordId);
    });
  });

  describe('handleMembersRefreshJobUpdate', () => {
    it('should emit refresh job update to OWNER/ADMIN users only', async () => {
      const refreshDto: RefreshJobUpdateDto = {
        jobId: 1,
        guildId: 'guild-123',
        status: 'PROCESSING',
        totalMembers: 100,
        processedMembers: 50,
        failedMembers: 0,
      };

      const mockOwnerSocket = {
        ...mockSocket,
        data: {
          discordId: 'discord-owner',
          guilds: [
            {
              guild: { id: 'guild-123', ownerId: 'discord-owner' },
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
        emit: jest.fn(),
      };

      const mockRegularSocket = {
        ...mockSocket,
        data: {
          discordId: 'discord-regular',
          guilds: [
            {
              guild: { id: 'guild-123', ownerId: 'discord-owner' },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_READ],
                  lvlRangeFrom: 1,
                  lvlRangeTo: 999,
                },
              ],
            },
          ],
        },
        emit: jest.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([
        mockOwnerSocket,
        mockRegularSocket,
      ]);

      await service.handleMembersRefreshJobUpdate(refreshDto);

      expect(mockServer.in).toHaveBeenCalledWith('guild-123');
      expect(mockOwnerSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE,
        refreshDto,
      );
      expect(mockRegularSocket.emit).not.toHaveBeenCalled();
    });

    it('should emit to ADMIN users', async () => {
      const refreshDto: RefreshJobUpdateDto = {
        jobId: 1,
        guildId: 'guild-123',
        status: 'PROCESSING',
        totalMembers: 100,
        processedMembers: 75,
        failedMembers: 0,
      };

      const mockAdminSocket = {
        ...mockSocket,
        data: {
          discordId: 'discord-admin',
          guilds: [
            {
              guild: { id: 'guild-123', ownerId: 'different-user' },
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
        emit: jest.fn(),
      };

      mockServer.fetchSockets.mockResolvedValue([mockAdminSocket]);

      await service.handleMembersRefreshJobUpdate(refreshDto);

      expect(mockServer.in).toHaveBeenCalledWith('guild-123');
      expect(mockAdminSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE,
        refreshDto,
      );
    });
  });

  describe('invalidateUserGuildsCache', () => {
    it('should call guildsService to invalidate user guilds cache', async () => {
      const discordId = 'discord-123';
      const userId = 'user-123';

      await service.invalidateUserGuildsCache(discordId, userId);

      expect(mockGuildsService.invalidateUserGuildsCache).toHaveBeenCalledWith(
        discordId,
        userId,
      );
    });
  });

  describe('rebalanceUserSocketRooms', () => {
    it('should rebalance user socket rooms based on updated guilds', async () => {
      const discordId = 'discord-123';
      const userId = 'user-123';

      const updatedGuilds = [
        {
          guild: { id: 'guild-1' },
          roles: [],
        },
        {
          guild: { id: 'guild-2' },
          roles: [],
        },
      ];

      const mockUserSocket = {
        id: 'socket-123',
        data: {
          discordId: 'discord-123',
        },
        rooms: new Set(['socket-123', 'guild-1', 'old-guild']),
        leave: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      };

      mockGuildsService.getUserGuilds.mockResolvedValue(updatedGuilds);
      mockServer.fetchSockets.mockResolvedValue([mockUserSocket]);

      await service.rebalanceUserSocketRooms(discordId, userId);

      expect(mockGuildsService.getUserGuilds).toHaveBeenCalledWith({
        discordId,
        userId,
      });
      expect(mockUserSocket.leave).toHaveBeenCalledWith('old-guild');
      expect(mockUserSocket.join).toHaveBeenCalledWith('guild-2');
      expect(mockUserSocket.emit).toHaveBeenCalledWith(
        GatewayEvent.PERMISSIONS_UPDATED,
        { guilds: updatedGuilds },
      );
    });

    it('should handle case when user has no active sockets', async () => {
      const discordId = 'discord-123';
      const userId = 'user-123';

      mockGuildsService.getUserGuilds.mockResolvedValue([]);
      mockServer.fetchSockets.mockResolvedValue([]);

      await service.rebalanceUserSocketRooms(discordId, userId);

      expect(mockGuildsService.getUserGuilds).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const discordId = 'discord-123';
      const userId = 'user-123';

      const errorMessage = 'Database connection failed';
      mockGuildsService.getUserGuilds.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.rebalanceUserSocketRooms(discordId, userId),
      ).resolves.not.toThrow();
    });

    it('should only rebalance sockets for specific user', async () => {
      const discordId = 'discord-target';
      const userId = 'user-target';

      const updatedGuilds = [
        {
          guild: { id: 'guild-1' },
          roles: [],
        },
      ];

      const mockTargetSocket = {
        id: 'socket-target',
        data: {
          discordId: 'discord-target',
        },
        rooms: new Set(['socket-target']),
        leave: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      };

      const mockOtherSocket = {
        id: 'socket-other',
        data: {
          discordId: 'discord-other',
        },
        rooms: new Set(['socket-other']),
        leave: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
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
  });
});
