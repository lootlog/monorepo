import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { NotificationsService } from './notifications.service';
import { GuildsService } from 'src/guilds/guilds.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockLogger = { log: jest.fn() };

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  const mockGuildsService = {
    getGuildsForRequiredPermissions: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: AmqpConnection, useValue: mockAmqpConnection },
        { provide: GuildsService, useValue: mockGuildsService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('cancelPartyGathering', () => {
    const discordId = '123456';
    const notificationId = 'notif-abc';

    it('should cancel successfully when metadata exists and user is owner', async () => {
      const metadata = {
        discordId,
        guildIds: ['guild-1', 'guild-2'],
        createdAt: new Date().toISOString(),
      };
      mockRedisService.get.mockResolvedValue(JSON.stringify(metadata));

      const result = await service.cancelPartyGathering(
        discordId,
        notificationId,
      );

      expect(result).toEqual({
        status: 'success',
        guildIds: ['guild-1', 'guild-2'],
      });
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `notification:${notificationId}`,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `party-gathering:user:${discordId}`,
      );
      expect(mockAmqpConnection.publish).toHaveBeenCalledTimes(2);
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
        { guildId: 'guild-1', notificationId },
      );
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
        { guildId: 'guild-2', notificationId },
      );
    });

    it('should return expired status when metadata is missing', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.cancelPartyGathering(
        discordId,
        notificationId,
      );

      expect(result).toEqual({ status: 'expired' });
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `notification:${notificationId}`,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `party-gathering:user:${discordId}`,
      );
      expect(mockAmqpConnection.publish).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const metadata = {
        discordId: 'other-user',
        guildIds: ['guild-1'],
        createdAt: new Date().toISOString(),
      };
      mockRedisService.get.mockResolvedValue(JSON.stringify(metadata));

      await expect(
        service.cancelPartyGathering(discordId, notificationId),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRedisService.del).not.toHaveBeenCalled();
      expect(mockAmqpConnection.publish).not.toHaveBeenCalled();
    });
  });
});
