import { Test, type TestingModule } from '@nestjs/testing';
import type { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { getQueueToken } from '@nestjs/bullmq';
import { MembersConsumer } from './members.consumer';
import { MembersService } from './members.service';
import { PrismaService } from 'src/db/prisma.service';
import type { MemberType } from 'generated/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { MEMBER_BULK_REFRESH_QUEUE } from './constants/member-refresh-queue.constant';

describe('MembersConsumer', () => {
  let consumer: MembersConsumer;
  let membersService: jest.Mocked<MembersService>;
  let prismaService: unknown;
  let amqpConnection: jest.Mocked<AmqpConnection>;

  const mockMember = {
    id: 123,
    userId: 'discord-123',
    guildId: 'guild-123',
    type: MemberType.USER,
    name: 'Test User',
    avatar: 'avatar.png',
    banner: null,
    active: true,
    globalUserId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [],
  };

  const mockJob = {
    id: 1,
    guildId: 'guild-123',
    requestedBy: 'discord-123',
    status: 'PENDING',
    totalMembers: 3,
    processedMembers: 0,
    failedMembers: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      memberRefreshJob: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const mockMembersService = {
      refreshMember: jest.fn(),
      getGuildMemberById: jest.fn(),
    };

    const mockAmqpConnection = {
      publish: jest.fn(),
    };

    const mockBullQueue = {
      add: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersConsumer,
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
        {
          provide: getQueueToken(MEMBER_BULK_REFRESH_QUEUE),
          useValue: mockBullQueue,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    consumer = module.get<MembersConsumer>(MembersConsumer);
    membersService = module.get(MembersService);
    prismaService = module.get(PrismaService);
    amqpConnection = module.get(AmqpConnection);

    // Mock sleep to avoid delays in tests
    jest.spyOn(consumer as any, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(consumer).toBeDefined();
    });
  });

  describe('handleBulkRefresh', () => {
    const payload = {
      jobId: 1,
      guildId: 'guild-123',
      memberIds: ['discord-123', 'discord-456', 'discord-789'],
    };

    beforeEach(() => {
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(mockJob);
    });

    it('should queue job to BullMQ successfully', async () => {
      const bullQueue = consumer['bulkRefreshQueue'];
      bullQueue.add = jest.fn().mockResolvedValue({});

      await consumer.handleBulkRefresh(payload);

      expect(bullQueue.add).toHaveBeenCalledWith(
        'bulk-refresh',
        {
          jobId: payload.jobId,
          guildId: payload.guildId,
          memberIds: payload.memberIds,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      expect(consumer['logger'].log).toHaveBeenCalledWith({
        level: 'info',
        message: expect.stringContaining('Queueing bulk refresh job'),
      });
      expect(consumer['logger'].log).toHaveBeenCalledWith({
        level: 'info',
        message: expect.stringContaining(
          'Successfully queued bulk refresh job',
        ),
      });
    });

    it('should handle BullMQ queue errors', async () => {
      const bullQueue = consumer['bulkRefreshQueue'];
      const queueError = new Error('Queue connection failed');
      bullQueue.add = jest.fn().mockRejectedValue(queueError);
      prismaService.memberRefreshJob.update.mockResolvedValue({
        ...mockJob,
        status: 'FAILED',
      });

      await consumer.handleBulkRefresh(payload);

      expect(consumer['logger'].log).toHaveBeenCalledWith({
        level: 'error',
        message: expect.stringContaining('Failed to queue bulk refresh job'),
        stack: expect.any(String),
      });

      expect(prismaService.memberRefreshJob.update).toHaveBeenCalledWith({
        where: { id: payload.jobId },
        data: {
          status: 'FAILED',
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe('handleMemberRefresh', () => {
    const payload = {
      discordId: 'discord-123',
      guildId: 'guild-123',
      userId: 'user-123',
    };

    it('should successfully refresh member in background', async () => {
      membersService.getGuildMemberById.mockResolvedValue(mockMember);

      await consumer.handleMemberRefresh(payload);

      expect(membersService.getGuildMemberById).toHaveBeenCalledWith({
        discordId: payload.discordId,
        guildId: payload.guildId,
        userId: payload.userId,
        refresh: false,
        standalone: false,
      });

      expect(consumer['logger'].log).toHaveBeenCalledWith({
        level: 'debug',
        message: expect.stringContaining('Processing background refresh'),
      });
      expect(consumer['logger'].log).toHaveBeenCalledWith({
        level: 'debug',
        message: expect.stringContaining('Successfully refreshed member'),
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Refresh failed');
      membersService.getGuildMemberById.mockRejectedValue(error);

      await consumer.handleMemberRefresh(payload);

      expect(consumer['logger'].log).toHaveBeenCalledWith({
        level: 'error',
        message: expect.stringContaining('Failed to refresh member'),
        stack: expect.any(String),
      });
    });

    it('should not throw error on failure', async () => {
      membersService.getGuildMemberById.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        consumer.handleMemberRefresh(payload),
      ).resolves.not.toThrow();
    });
  });

  describe('emitJobUpdate', () => {
    it('should publish job update to message queue', async () => {
      const job = {
        ...mockJob,
        status: 'PROCESSING',
        processedMembers: 5,
      };
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(job);

      await consumer['emitJobUpdate'](1);

      expect(prismaService.memberRefreshJob.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        {
          jobId: job.id,
          guildId: job.guildId,
          status: job.status,
          totalMembers: job.totalMembers,
          processedMembers: job.processedMembers,
          failedMembers: job.failedMembers,
          completedAt: job.completedAt,
        },
      );

      expect(consumer['logger'].log).toHaveBeenCalledWith({
        level: 'debug',
        message: expect.stringContaining('Emitted job update for job 1'),
      });
    });

    it('should handle job not found gracefully', async () => {
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(null);

      await consumer['emitJobUpdate'](999);

      expect(consumer['logger'].log).toHaveBeenCalledWith({
        level: 'warn',
        message: 'Job 999 not found when emitting update',
      });
      expect(amqpConnection.publish).not.toHaveBeenCalled();
    });

    it('should handle publish errors gracefully', async () => {
      const job = { ...mockJob };
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(job);
      const publishError = new Error('RabbitMQ connection lost');
      amqpConnection.publish.mockRejectedValue(publishError);

      await consumer['emitJobUpdate'](1);

      expect(consumer['logger'].log).toHaveBeenCalledWith({
        level: 'error',
        message: expect.stringContaining('Failed to emit job update for job 1'),
        stack: expect.any(String),
      });
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      // Restore original sleep implementation for this test suite
      jest.spyOn(consumer as any, 'sleep').mockRestore();
    });

    it('should wait for specified milliseconds', async () => {
      const startTime = Date.now();
      await consumer['sleep'](100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(95);
      expect(endTime - startTime).toBeLessThan(150);
    });
  });
});
