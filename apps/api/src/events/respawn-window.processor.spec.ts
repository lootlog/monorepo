import { getQueueToken } from "@nestjs/bullmq";
import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Job } from "bullmq";
import {
  RespawnWindowProcessor,
  type AutoCloseRespawnWindowJobData,
} from "./respawn-window.processor";
import { EventsService } from "./events.service";
import { PrismaService } from "src/db/prisma.service";
import { RESPAWN_WINDOW_QUEUE } from "./constants/respawn-queue.constant";
import { AUTO_CLOSE_MAX_EXTENSIONS } from "./utils/respawn-auto-close-job";

describe("RespawnWindowProcessor", () => {
  let processor: RespawnWindowProcessor;
  let logger: { log: jest.Mock };

  const mockEventsService = {
    closeRespawnWindow: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
  };

  const mockPrisma = {
    event: { findFirst: jest.fn() },
    eventHeroNpc: { findFirst: jest.fn() },
    timer: { findUnique: jest.fn() },
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RespawnWindowProcessor,
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: getQueueToken(RESPAWN_WINDOW_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    processor = module.get<RespawnWindowProcessor>(RespawnWindowProcessor);
    logger = mockLogger;
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  describe("process", () => {
    const jobData: AutoCloseRespawnWindowJobData = {
      guildId: "guild-1",
      eventId: "event-1",
      heroId: "hero-1",
      npcId: 123,
      world: "tempest",
    };

    const createMockJob = (
      data: AutoCloseRespawnWindowJobData,
    ): Job<AutoCloseRespawnWindowJobData> =>
      ({
        data,
        id: "job-1",
        attemptsMade: 0,
      }) as Job<AutoCloseRespawnWindowJobData>;

    it("should call closeRespawnWindow with correct parameters when no active event", async () => {
      const job = createMockJob(jobData);
      mockEventsService.closeRespawnWindow.mockResolvedValue(undefined);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      await processor.process(job);

      expect(mockEventsService.closeRespawnWindow).toHaveBeenCalledWith(
        "guild-1",
        "event-1",
        "hero-1",
        {
          createNewWindow: false,
          isAutoClose: true,
        },
      );
    });

    it("should defer auto-close when event is active and timer exists", async () => {
      const now = new Date();
      const job = createMockJob(jobData);
      mockPrisma.event.findFirst.mockResolvedValue({
        startsAt: new Date(now.getTime() - 3600_000),
        endsAt: new Date(now.getTime() + 86400_000),
        createdAt: new Date(now.getTime() - 7200_000),
      });
      mockPrisma.eventHeroNpc.findFirst.mockResolvedValue({
        npcId: 123,
      });
      mockPrisma.timer.findUnique.mockResolvedValue({ npcId: 123 });

      await processor.process(job);

      expect(mockEventsService.closeRespawnWindow).not.toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ...jobData,
          autoCloseAttempt: 1,
        }),
        expect.objectContaining({
          delay: expect.any(Number),
          removeOnComplete: true,
          removeOnFail: true,
        }),
      );
    });

    it("should close when max extensions reached even if event is active", async () => {
      const now = new Date();
      const job = createMockJob({
        ...jobData,
        autoCloseAttempt: AUTO_CLOSE_MAX_EXTENSIONS,
      });
      mockPrisma.event.findFirst.mockResolvedValue({
        startsAt: new Date(now.getTime() - 3600_000),
        endsAt: null,
        createdAt: new Date(now.getTime() - 7200_000),
      });
      mockEventsService.closeRespawnWindow.mockResolvedValue(undefined);

      await processor.process(job);

      expect(mockEventsService.closeRespawnWindow).toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should close when event has ended", async () => {
      const now = new Date();
      const job = createMockJob(jobData);
      mockPrisma.event.findFirst.mockResolvedValue({
        startsAt: new Date(now.getTime() - 86400_000),
        endsAt: new Date(now.getTime() - 3600_000),
        createdAt: new Date(now.getTime() - 172800_000),
      });
      mockEventsService.closeRespawnWindow.mockResolvedValue(undefined);

      await processor.process(job);

      expect(mockEventsService.closeRespawnWindow).toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should close when timer no longer exists", async () => {
      const now = new Date();
      const job = createMockJob(jobData);
      mockPrisma.event.findFirst.mockResolvedValue({
        startsAt: new Date(now.getTime() - 3600_000),
        endsAt: null,
        createdAt: new Date(now.getTime() - 7200_000),
      });
      mockPrisma.eventHeroNpc.findFirst.mockResolvedValue({
        npcId: 123,
      });
      mockPrisma.timer.findUnique.mockResolvedValue(null);
      mockEventsService.closeRespawnWindow.mockResolvedValue(undefined);

      await processor.process(job);

      expect(mockEventsService.closeRespawnWindow).toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should close when hero not found", async () => {
      const now = new Date();
      const job = createMockJob(jobData);
      mockPrisma.event.findFirst.mockResolvedValue({
        startsAt: new Date(now.getTime() - 3600_000),
        endsAt: null,
        createdAt: new Date(now.getTime() - 7200_000),
      });
      mockPrisma.eventHeroNpc.findFirst.mockResolvedValue(null);
      mockEventsService.closeRespawnWindow.mockResolvedValue(undefined);

      await processor.process(job);

      expect(mockEventsService.closeRespawnWindow).toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should increment autoCloseAttempt on each reschedule", async () => {
      const now = new Date();
      const job = createMockJob({
        ...jobData,
        autoCloseAttempt: 5,
      });
      mockPrisma.event.findFirst.mockResolvedValue({
        startsAt: new Date(now.getTime() - 3600_000),
        endsAt: new Date(now.getTime() + 86400_000),
        createdAt: new Date(now.getTime() - 7200_000),
      });
      mockPrisma.eventHeroNpc.findFirst.mockResolvedValue({
        npcId: 123,
      });
      mockPrisma.timer.findUnique.mockResolvedValue({ npcId: 123 });

      await processor.process(job);

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          autoCloseAttempt: 6,
        }),
        expect.any(Object),
      );
    });

    it("should log start and success messages on normal close", async () => {
      const job = createMockJob(jobData);
      mockEventsService.closeRespawnWindow.mockResolvedValue(undefined);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      await processor.process(job);

      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
          message: expect.stringContaining("Auto-closing respawn window"),
        }),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
          message: expect.stringContaining("Successfully auto-closed"),
        }),
      );
    });

    it("should log error and rethrow when closeRespawnWindow fails", async () => {
      const job = createMockJob(jobData);
      const error = new Error("Database connection failed");
      mockEventsService.closeRespawnWindow.mockRejectedValue(error);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      await expect(processor.process(job)).rejects.toThrow(
        "Database connection failed",
      );

      expect(logger.log).toHaveBeenCalledWith({
        level: "error",
        message: expect.stringContaining("Failed to auto-close"),
        error: "Database connection failed",
        stack: expect.any(String),
      });
    });

    it("should handle non-Error exceptions", async () => {
      const job = createMockJob(jobData);
      mockEventsService.closeRespawnWindow.mockRejectedValue(
        "String error message",
      );
      mockPrisma.event.findFirst.mockResolvedValue(null);

      await expect(processor.process(job)).rejects.toBe("String error message");

      expect(logger.log).toHaveBeenCalledWith({
        level: "error",
        message: expect.stringContaining("Failed to auto-close"),
        error: "String error message",
        stack: undefined,
      });
    });

    it("should include heroId and npcId in start log message", async () => {
      const job = createMockJob(jobData);
      mockEventsService.closeRespawnWindow.mockResolvedValue(undefined);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      await processor.process(job);

      const startLog = logger.log.mock.calls.find((call: unknown[]) =>
        (call[0] as { message: string }).message?.includes("Auto-closing"),
      )?.[0];
      expect(startLog.message).toContain("hero-1");
      expect(startLog.message).toContain("123");
      expect(startLog.message).toContain("event-1");
    });
  });

  describe("onFailed", () => {
    const jobData: AutoCloseRespawnWindowJobData = {
      guildId: "guild-1",
      eventId: "event-1",
      heroId: "hero-1",
      npcId: 123,
      world: "tempest",
    };

    const createMockJob = (
      data: AutoCloseRespawnWindowJobData,
      attemptsMade = 1,
    ): Job<AutoCloseRespawnWindowJobData> =>
      ({
        data,
        id: "job-1",
        attemptsMade,
      }) as Job<AutoCloseRespawnWindowJobData>;

    it("should log failed job with full context", () => {
      const job = createMockJob(jobData, 3);
      const error = new Error("Connection timeout");
      error.stack = "Error stack trace";

      processor.onFailed(job, error);

      expect(logger.log).toHaveBeenCalledWith({
        level: "error",
        message: "Auto-close respawn window job failed",
        jobId: "job-1",
        heroId: "hero-1",
        eventId: "event-1",
        guildId: "guild-1",
        npcId: 123,
        world: "tempest",
        attemptsMade: 3,
        error: "Connection timeout",
        stack: "Error stack trace",
      });
    });

    it("should include all job data fields in log", () => {
      const customJobData: AutoCloseRespawnWindowJobData = {
        guildId: "another-guild",
        eventId: "another-event",
        heroId: "another-hero",
        npcId: 456,
        world: "kastagar",
      };
      const job = createMockJob(customJobData);
      const error = new Error("Test error");

      processor.onFailed(job, error);

      const logCall = logger.log.mock.calls[0][0];
      expect(logCall.guildId).toBe("another-guild");
      expect(logCall.eventId).toBe("another-event");
      expect(logCall.heroId).toBe("another-hero");
      expect(logCall.npcId).toBe(456);
      expect(logCall.world).toBe("kastagar");
    });

    it("should log error message without stack if not available", () => {
      const job = createMockJob(jobData);
      const error = new Error("Simple error");
      delete error.stack;

      processor.onFailed(job, error);

      const logCall = logger.log.mock.calls[0][0];
      expect(logCall.error).toBe("Simple error");
      expect(logCall.stack).toBeUndefined();
    });

    it("should correctly track attemptsMade", () => {
      const job = createMockJob(jobData, 5);
      const error = new Error("Max retries exceeded");

      processor.onFailed(job, error);

      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptsMade: 5,
        }),
      );
    });
  });
});
