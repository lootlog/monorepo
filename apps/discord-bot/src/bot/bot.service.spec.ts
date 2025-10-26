import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Test, type TestingModule } from '@nestjs/testing';
import { Client, Collection, type Guild, type Role } from 'discord.js';
import { BotService } from './bot.service';
import { RoutingKey } from './enums/routing-key.enum';
import { DEFAULT_EXCHANGE_NAME } from '../config/rabbitmq.config';

describe('BotService', () => {
  let service: BotService;
  let amqpConnection: AmqpConnection;

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  const mockClient = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        {
          provide: Client,
          useValue: mockClient,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
    amqpConnection = module.get<AmqpConnection>(AmqpConnection);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleGuildCreate', () => {
    it('should publish guild create event with roles to RabbitMQ', async () => {
      const adminPermissions = BigInt(0x8);
      const normalPermissions = BigInt(0x0);

      const mockRoles = new Collection<string, Role>();
      mockRoles.set('role-1', {
        id: 'role-1',
        name: 'Admin',
        color: 16711680,
        position: 1,
        permissions: { bitfield: adminPermissions },
      } as unknown as Role);

      mockRoles.set('role-2', {
        id: 'role-2',
        name: 'Member',
        color: 65280,
        position: 0,
        permissions: { bitfield: normalPermissions },
      } as unknown as Role);

      const mockGuild = {
        id: 'guild-123',
        name: 'Test Guild',
        iconURL: jest.fn().mockReturnValue('https://example.com/icon.png'),
        ownerId: 'owner-456',
        roles: {
          fetch: jest.fn().mockResolvedValue(mockRoles),
        },
      } as unknown as Guild;

      await service.handleGuildCreate(mockGuild);

      expect(mockGuild.roles.fetch).toHaveBeenCalled();
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_CREATE,
        {
          guildId: 'guild-123',
          name: 'Test Guild',
          icon: 'https://example.com/icon.png',
          ownerId: 'owner-456',
          roles: [
            {
              id: 'role-1',
              name: 'Admin',
              color: 16711680,
              admin: true,
              position: 1,
            },
            {
              id: 'role-2',
              name: 'Member',
              color: 65280,
              admin: false,
              position: 0,
            },
          ],
        },
      );
    });

    it('should handle guild without icon', async () => {
      const mockRoles = new Collection<string, Role>();

      const mockGuild = {
        id: 'guild-123',
        name: 'Test Guild',
        iconURL: jest.fn().mockReturnValue(null),
        ownerId: 'owner-456',
        roles: {
          fetch: jest.fn().mockResolvedValue(mockRoles),
        },
      } as unknown as Guild;

      await service.handleGuildCreate(mockGuild);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_CREATE,
        expect.objectContaining({
          icon: null,
        }),
      );
    });
  });

  describe('handleGuildUpdate', () => {
    it('should publish guild update event to RabbitMQ', async () => {
      const oldGuild = {
        id: 'guild-123',
        name: 'Old Guild Name',
        iconURL: jest.fn().mockReturnValue('https://example.com/old-icon.png'),
        ownerId: 'owner-456',
      } as unknown as Guild;

      const newGuild = {
        id: 'guild-123',
        name: 'New Guild Name',
        iconURL: jest.fn().mockReturnValue('https://example.com/new-icon.png'),
        ownerId: 'owner-789',
      } as unknown as Guild;

      await service.handleGuildUpdate(oldGuild, newGuild);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_UPDATE,
        {
          guildId: 'guild-123',
          name: 'New Guild Name',
          icon: 'https://example.com/new-icon.png',
          ownerId: 'owner-789',
        },
      );
    });
  });

  describe('handleGuildDelete', () => {
    it('should publish guild delete event to RabbitMQ', async () => {
      const mockGuild = {
        id: 'guild-123',
        name: 'Test Guild',
      } as unknown as Guild;

      await service.handleGuildDelete(mockGuild);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_DELETE,
        {
          guildId: 'guild-123',
        },
      );
    });
  });

  describe('handleGuildRoleCreate', () => {
    it('should publish role create event with admin flag when role has administrator permission', async () => {
      const adminPermissions = BigInt(0x8);

      const mockRole = {
        id: 'role-123',
        name: 'Admin Role',
        color: 16711680,
        position: 5,
        permissions: { bitfield: adminPermissions },
        guild: {
          id: 'guild-456',
        },
      } as unknown as Role;

      await service.handleGuildRoleCreate(mockRole);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_CREATE_ROLE,
        {
          guildId: 'guild-456',
          id: 'role-123',
          name: 'Admin Role',
          color: 16711680,
          position: 5,
          admin: true,
        },
      );
    });

    it('should publish role create event with admin flag false when role does not have administrator permission', async () => {
      const normalPermissions = BigInt(0x0);

      const mockRole = {
        id: 'role-123',
        name: 'Member Role',
        color: 65280,
        position: 1,
        permissions: { bitfield: normalPermissions },
        guild: {
          id: 'guild-456',
        },
      } as unknown as Role;

      await service.handleGuildRoleCreate(mockRole);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_CREATE_ROLE,
        {
          guildId: 'guild-456',
          id: 'role-123',
          name: 'Member Role',
          color: 65280,
          position: 1,
          admin: false,
        },
      );
    });
  });

  describe('handleGuildRoleUpdate', () => {
    it('should publish role update event to RabbitMQ', async () => {
      const normalPermissions = BigInt(0x0);

      const oldRole = {
        id: 'role-123',
        name: 'Old Role Name',
        color: 16711680,
        position: 1,
        permissions: { bitfield: normalPermissions },
        guild: {
          id: 'guild-456',
        },
      } as unknown as Role;

      const adminPermissions = BigInt(0x8);

      const newRole = {
        id: 'role-123',
        name: 'New Role Name',
        color: 65280,
        position: 2,
        permissions: { bitfield: adminPermissions },
        guild: {
          id: 'guild-456',
        },
      } as unknown as Role;

      await service.handleGuildRoleUpdate(oldRole, newRole);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_UPDATE_ROLE,
        {
          guildId: 'guild-456',
          id: 'role-123',
          name: 'New Role Name',
          color: 65280,
          position: 2,
          admin: true,
        },
      );
    });
  });

  describe('handleGuildRoleDelete', () => {
    it('should publish role delete event to RabbitMQ', async () => {
      const mockRole = {
        id: 'role-123',
        name: 'Deleted Role',
        guild: {
          id: 'guild-456',
        },
      } as unknown as Role;

      await service.handleGuildRoleDelete(mockRole);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_DELETE_ROLE,
        {
          guildId: 'guild-456',
          id: 'role-123',
        },
      );
    });
  });
});
