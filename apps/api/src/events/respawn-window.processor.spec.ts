import type { Mock } from "vitest";
import { mockFn } from "src/test/mock-fn";
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
import { TimersService } from "src/timers/timers.service";

describe("RespawnWindowProcessor", () => {
  let processor: RespawnWindowProcessor;
  let logger: { log: Mock };

  const mockEventsService = {
    closeRespawnWindow: mockFn(),
  };

  const mockLogger = {
    log: mockFn(),
  };

  const mockPrisma = {
    event: { findFirst: mockFn() },
    eventHeroNpc: { findFirst: mockFn() },
    timer: { findUnique: mockFn() },
  };

  const mockQueue = {
    add: mockFn(),
  };

  const mockTimersService = {
    getEventRespawnTimer: mockFn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

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
          provide: TimersService,
          useValue: mockTimersService,
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

    it("should log and ignore deprecated auto-close jobs", async () => {
      const job = createMockJob(jobData);

      await processor.process(job);

      expect(mockEventsService.closeRespawnWindow).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
          message: expect.stringContaining("Ignoring deprecated auto-close"),
          heroId: "hero-1",
          npcId: 123,
        }),
      );
    });

    it("should include job context in the ignore log", async () => {
      const job = createMockJob(jobData);

      await processor.process(job);

      const startLog = logger.log.mock.calls.find((call: unknown[]) =>
        (call[0] as { message: string }).message?.includes(
          "Ignoring deprecated auto-close",
        ),
      )?.[0];
      expect(startLog.heroId).toBe("hero-1");
      expect(startLog.guildId).toBe("guild-1");
      expect(startLog.eventId).toBe("event-1");
      expect(startLog.npcId).toBe(123);
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
