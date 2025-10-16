import { Test, TestingModule } from '@nestjs/testing';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { MembersConsumer } from './members.consumer';
import { MembersService } from './members.service';
import { PrismaService } from 'src/db/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { MemberType } from 'generated/client';

describe('MembersConsumer', () => {
  let consumer: MembersConsumer;
  let membersService: jest.Mocked<MembersService>;
  let prismaService: any;
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
      ],
    }).compile();

    consumer = module.get<MembersConsumer>(MembersConsumer);
    membersService = module.get(MembersService);
    prismaService = module.get(PrismaService);
    amqpConnection = module.get(AmqpConnection);

    // Suppress logger output
    jest.spyOn(consumer['logger'], 'log').mockImplementation();
    jest.spyOn(consumer['logger'], 'debug').mockImplementation();
    jest.spyOn(consumer['logger'], 'warn').mockImplementation();
    jest.spyOn(consumer['logger'], 'error').mockImplementation();

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

    it('should process all members successfully', async () => {
      membersService.refreshMember.mockResolvedValue(mockMember);
      prismaService.memberRefreshJob.update.mockResolvedValue(mockJob);

      await consumer.handleBulkRefresh(payload);

      expect(prismaService.memberRefreshJob.update).toHaveBeenCalledWith({
        where: { id: payload.jobId },
        data: { status: 'PROCESSING' },
      });

      expect(membersService.refreshMember).toHaveBeenCalledTimes(3);
      expect(membersService.refreshMember).toHaveBeenCalledWith({
        discordId: 'discord-123',
        guildId: 'guild-123',
        skipTtlCheck: true,
      });
      expect(membersService.refreshMember).toHaveBeenCalledWith({
        discordId: 'discord-456',
        guildId: 'guild-123',
        skipTtlCheck: true,
      });
      expect(membersService.refreshMember).toHaveBeenCalledWith({
        discordId: 'discord-789',
        guildId: 'guild-123',
        skipTtlCheck: true,
      });

      expect(prismaService.memberRefreshJob.update).toHaveBeenCalledWith({
        where: { id: payload.jobId },
        data: {
          status: 'COMPLETED',
          processedMembers: expect.any(Number),
          completedAt: expect.any(Date),
        },
      });

      expect(consumer['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('Starting bulk refresh job'),
      );
      expect(consumer['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('Completed bulk refresh job'),
      );
    });

    it('should batch update processedMembers counter', async () => {
      const largeBatchPayload = {
        ...payload,
        memberIds: Array(12).fill(null).map((_, i) => `discord-${i}`),
      };
      membersService.refreshMember.mockResolvedValue(mockMember);
      prismaService.memberRefreshJob.update.mockResolvedValue(mockJob);

      await consumer.handleBulkRefresh(largeBatchPayload);

      const batchUpdateCalls = prismaService.memberRefreshJob.update.mock.calls.filter(
        (call: any) => typeof call[0].data?.processedMembers === 'number',
      );

      // Should have batch updates: one at member 5, one at member 10, and final at completion
      expect(batchUpdateCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle individual member refresh failures gracefully', async () => {
      membersService.refreshMember
        .mockResolvedValueOnce(mockMember)
        .mockRejectedValueOnce(new Error('Refresh failed'))
        .mockResolvedValueOnce(mockMember);
      prismaService.memberRefreshJob.update.mockResolvedValue(mockJob);

      await consumer.handleBulkRefresh(payload);

      expect(prismaService.memberRefreshJob.update).toHaveBeenCalledWith({
        where: { id: payload.jobId },
        data: { failedMembers: { increment: 1 } },
      });

      expect(consumer['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh member'),
        expect.any(Error),
      );

      expect(prismaService.memberRefreshJob.update).toHaveBeenCalledWith({
        where: { id: payload.jobId },
        data: {
          status: 'COMPLETED',
          processedMembers: expect.any(Number),
          completedAt: expect.any(Date),
        },
      });
    });

    it('should emit job updates periodically (every 5 members)', async () => {
      const largeBatchPayload = {
        ...payload,
        memberIds: Array(12).fill(null).map((_, i) => `discord-${i}`),
      };
      membersService.refreshMember.mockResolvedValue(mockMember);
      prismaService.memberRefreshJob.update.mockResolvedValue(mockJob);
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(mockJob);

      await consumer.handleBulkRefresh(largeBatchPayload);

      // Should emit update at start, after 5 members, after 10 members, and at completion
      const emitCalls = amqpConnection.publish.mock.calls;
      expect(emitCalls.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle fatal errors and set job status to FAILED', async () => {
      const fatalError = new Error('Database connection lost');
      let updateCallCount = 0;

      prismaService.memberRefreshJob.update.mockImplementation(async (args: any) => {
        updateCallCount++;
        if (updateCallCount === 1) {
          return mockJob; // First update to PROCESSING succeeds
        }
        // Allow the final FAILED status update to succeed
        if (args.data?.status === 'FAILED') {
          return { ...mockJob, status: 'FAILED' };
        }
        throw fatalError; // Second update fails (incrementing processedMembers)
      });

      // Mock findUnique for emitJobUpdate calls
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(mockJob);

      membersService.refreshMember.mockResolvedValue(mockMember);

      await consumer.handleBulkRefresh(payload);

      expect(consumer['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('Fatal error in bulk refresh job'),
        expect.any(String),
      );

      const failedUpdateCall = prismaService.memberRefreshJob.update.mock.calls.find(
        (call: any) => call[0].data?.status === 'FAILED',
      );
      expect(failedUpdateCall).toBeDefined();
      expect(failedUpdateCall[0]).toMatchObject({
        where: { id: payload.jobId },
        data: {
          status: 'FAILED',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should call sleep between member refreshes', async () => {
      membersService.refreshMember.mockResolvedValue(mockMember);
      prismaService.memberRefreshJob.update.mockResolvedValue(mockJob);

      await consumer.handleBulkRefresh(payload);

      expect(consumer['sleep']).toHaveBeenCalledTimes(3);
      expect(consumer['sleep']).toHaveBeenCalledWith(200);
    });

    it('should handle empty member list', async () => {
      const emptyPayload = {
        ...payload,
        memberIds: [],
      };
      prismaService.memberRefreshJob.update.mockResolvedValue(mockJob);

      await consumer.handleBulkRefresh(emptyPayload);

      expect(membersService.refreshMember).not.toHaveBeenCalled();
      expect(prismaService.memberRefreshJob.update).toHaveBeenCalledWith({
        where: { id: emptyPayload.jobId },
        data: {
          status: 'COMPLETED',
          processedMembers: 0,
          completedAt: expect.any(Date),
        },
      });
    });

    it('should continue processing after individual failures', async () => {
      membersService.refreshMember
        .mockRejectedValueOnce(new NotFoundException('Member not found'))
        .mockResolvedValueOnce(mockMember)
        .mockRejectedValueOnce(new Error('Network error'));
      prismaService.memberRefreshJob.update.mockResolvedValue(mockJob);

      await consumer.handleBulkRefresh(payload);

      expect(membersService.refreshMember).toHaveBeenCalledTimes(3);
      expect(prismaService.memberRefreshJob.update).toHaveBeenCalledWith({
        where: { id: payload.jobId },
        data: {
          status: 'COMPLETED',
          processedMembers: expect.any(Number),
          completedAt: expect.any(Date),
        },
      });
    });

    it('should log progress for each successfully processed member', async () => {
      membersService.refreshMember.mockResolvedValue(mockMember);
      prismaService.memberRefreshJob.update.mockResolvedValue(mockJob);

      await consumer.handleBulkRefresh(payload);

      expect(consumer['logger'].debug).toHaveBeenCalledWith(
        expect.stringContaining('Successfully refreshed member discord-123'),
      );
      expect(consumer['logger'].debug).toHaveBeenCalledWith(
        expect.stringContaining('Successfully refreshed member discord-456'),
      );
      expect(consumer['logger'].debug).toHaveBeenCalledWith(
        expect.stringContaining('Successfully refreshed member discord-789'),
      );
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

      expect(consumer['logger'].debug).toHaveBeenCalledWith(
        expect.stringContaining('Processing background refresh'),
      );
      expect(consumer['logger'].debug).toHaveBeenCalledWith(
        expect.stringContaining('Successfully refreshed member'),
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Refresh failed');
      membersService.getGuildMemberById.mockRejectedValue(error);

      await consumer.handleMemberRefresh(payload);

      expect(consumer['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh member'),
        expect.any(String),
      );
    });

    it('should not throw error on failure', async () => {
      membersService.getGuildMemberById.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(consumer.handleMemberRefresh(payload)).resolves.not.toThrow();
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

      expect(consumer['logger'].debug).toHaveBeenCalledWith(
        expect.stringContaining('Emitted job update for job 1'),
      );
    });

    it('should handle job not found gracefully', async () => {
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(null);

      await consumer['emitJobUpdate'](999);

      expect(consumer['logger'].warn).toHaveBeenCalledWith(
        'Job 999 not found when emitting update',
      );
      expect(amqpConnection.publish).not.toHaveBeenCalled();
    });

    it('should handle publish errors gracefully', async () => {
      const job = { ...mockJob };
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(job);
      const publishError = new Error('RabbitMQ connection lost');
      amqpConnection.publish.mockRejectedValue(publishError);

      await consumer['emitJobUpdate'](1);

      expect(consumer['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to emit job update for job 1'),
        expect.any(String),
      );
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
