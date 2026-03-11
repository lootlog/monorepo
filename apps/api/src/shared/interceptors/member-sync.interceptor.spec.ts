import { Test, type TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { MemberSyncInterceptor } from './member-sync.interceptor';
import { PrismaService } from 'src/db/prisma.service';
import { MembersService } from 'src/members/members.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { MEMBER_REFRESH_PRIORITY } from 'src/members/constants/member-refresh-queue.constant';

describe('MemberSyncInterceptor', () => {
  let interceptor: MemberSyncInterceptor;
  let prismaService: {
    member: {
      findMany: jest.Mock;
    };
  };
  let membersService: {
    getMemberSoftStaleThreshold: jest.Mock;
    queueMemberRefresh: jest.Mock;
  };
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
  };

  beforeEach(async () => {
    const mockPrismaService = {
      member: {
        findMany: jest.fn(),
      },
    };

    const mockMembersService = {
      getMemberSoftStaleThreshold: jest.fn(),
      queueMemberRefresh: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberSyncInterceptor,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MembersService, useValue: mockMembersService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    interceptor = module.get(MemberSyncInterceptor);
    prismaService = module.get(PrismaService);
    membersService = module.get(MembersService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('queueStaleMemberRefreshes', () => {
    it('should use the threshold from MembersService', async () => {
      const threshold = new Date('2026-03-10T10:00:00.000Z');
      redisService.get.mockResolvedValue(null);
      membersService.getMemberSoftStaleThreshold.mockReturnValue(threshold);
      prismaService.member.findMany.mockResolvedValue([]);

      await (interceptor as any).queueStaleMemberRefreshes(
        'discord-123',
        'user-123',
        [{ id: 'guild-123' }],
      );

      expect(membersService.getMemberSoftStaleThreshold).toHaveBeenCalled();
      expect(prismaService.member.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'discord-123',
          guildId: { in: ['guild-123'] },
          globalUserId: { not: null },
          active: true,
          OR: [
            { lastDiscordSyncAt: null },
            { lastDiscordSyncAt: { lt: threshold } },
          ],
        },
        select: {
          userId: true,
          guildId: true,
          globalUserId: true,
        },
      });
    });

    it('should skip querying and queueing when throttled', async () => {
      redisService.get.mockResolvedValue('1');

      await (interceptor as any).queueStaleMemberRefreshes(
        'discord-123',
        'user-123',
        [{ id: 'guild-123' }],
      );

      expect(prismaService.member.findMany).not.toHaveBeenCalled();
      expect(membersService.getMemberSoftStaleThreshold).not.toHaveBeenCalled();
      expect(membersService.queueMemberRefresh).not.toHaveBeenCalled();
    });

    it('should queue stale members and set throttle', async () => {
      redisService.get.mockResolvedValue(null);
      membersService.getMemberSoftStaleThreshold.mockReturnValue(
        new Date('2026-03-10T10:00:00.000Z'),
      );
      prismaService.member.findMany.mockResolvedValue([
        {
          userId: 'discord-123',
          guildId: 'guild-123',
          globalUserId: 'user-123',
        },
      ]);
      membersService.queueMemberRefresh.mockResolvedValue({
        queued: true,
        nextRefreshAt: null,
      });

      await (interceptor as any).queueStaleMemberRefreshes(
        'discord-123',
        'user-123',
        [{ id: 'guild-123' }],
      );

      expect(redisService.set).toHaveBeenCalledWith(
        'member:sync:throttle:discord-123',
        '1',
        150,
      );
      expect(membersService.queueMemberRefresh).toHaveBeenCalledWith({
        discordId: 'discord-123',
        guildId: 'guild-123',
        userId: 'user-123',
        priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
        reason: 'guild-list-sync',
      });
    });
  });
});
