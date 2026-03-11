import { Test, type TestingModule } from "@nestjs/testing";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { getQueueToken } from "@nestjs/bullmq";
import { MembersConsumer } from "./members.consumer";
import { PrismaService } from "src/db/prisma.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MEMBER_BULK_REFRESH_QUEUE } from "./constants/member-refresh-queue.constant";

describe("MembersConsumer", () => {
  let consumer: MembersConsumer;
  let prismaService: {
    memberRefreshJob: {
      update: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let amqpConnection: {
    publish: jest.Mock;
  };

  const mockJob = {
    id: 1,
    guildId: "guild-123",
    requestedBy: "discord-123",
    status: "PENDING",
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
    prismaService = module.get(PrismaService);
    amqpConnection = module.get(AmqpConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should be defined", () => {
      expect(consumer).toBeDefined();
    });
  });

  describe("handleBulkRefresh", () => {
    const payload = {
      jobId: 1,
      guildId: "guild-123",
      memberIds: ["discord-123", "discord-456", "discord-789"],
    };

    beforeEach(() => {
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(mockJob);
    });

    it("should queue job to BullMQ successfully", async () => {
      const bullQueue = consumer["bulkRefreshQueue"];
      bullQueue.add = jest.fn().mockResolvedValue({});

      await consumer.handleBulkRefresh(payload);

      expect(bullQueue.add).toHaveBeenCalledWith(
        "bulk-refresh",
        {
          jobId: payload.jobId,
          guildId: payload.guildId,
          memberIds: payload.memberIds,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );

      expect(consumer["logger"].log).toHaveBeenCalledWith({
        level: "info",
        message: expect.stringContaining("Queueing bulk refresh job"),
      });
      expect(consumer["logger"].log).toHaveBeenCalledWith({
        level: "info",
        message: expect.stringContaining(
          "Successfully queued bulk refresh job",
        ),
      });
    });

    it("should handle BullMQ queue errors", async () => {
      const bullQueue = consumer["bulkRefreshQueue"];
      const queueError = new Error("Queue connection failed");
      bullQueue.add = jest.fn().mockRejectedValue(queueError);
      prismaService.memberRefreshJob.update.mockResolvedValue({
        ...mockJob,
        status: "FAILED",
      });

      await consumer.handleBulkRefresh(payload);

      expect(consumer["logger"].log).toHaveBeenCalledWith({
        level: "error",
        message: expect.stringContaining("Failed to queue bulk refresh job"),
        stack: expect.any(String),
      });

      expect(prismaService.memberRefreshJob.update).toHaveBeenCalledWith({
        where: { id: payload.jobId },
        data: {
          status: "FAILED",
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe("emitJobUpdate", () => {
    it("should publish job update to message queue", async () => {
      const job = {
        ...mockJob,
        status: "PROCESSING",
        processedMembers: 5,
      };
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(job);

      await consumer["emitJobUpdate"](1);

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

      expect(consumer["logger"].log).toHaveBeenCalledWith({
        level: "debug",
        message: expect.stringContaining("Emitted job update for job 1"),
      });
    });

    it("should handle job not found gracefully", async () => {
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(null);

      await consumer["emitJobUpdate"](999);

      expect(consumer["logger"].log).toHaveBeenCalledWith({
        level: "warn",
        message: "Job 999 not found when emitting update",
      });
      expect(amqpConnection.publish).not.toHaveBeenCalled();
    });

    it("should handle publish errors gracefully", async () => {
      const job = { ...mockJob };
      prismaService.memberRefreshJob.findUnique.mockResolvedValue(job);
      const publishError = new Error("RabbitMQ connection lost");
      amqpConnection.publish.mockRejectedValue(publishError);

      await consumer["emitJobUpdate"](1);

      expect(consumer["logger"].log).toHaveBeenCalledWith({
        level: "error",
        message: expect.stringContaining("Failed to emit job update for job 1"),
        stack: expect.any(String),
      });
    });
  });
});
