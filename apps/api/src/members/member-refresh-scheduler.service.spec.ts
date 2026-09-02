import type { Mock } from "vitest";
import { mockFn } from "#src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import { DiscordRateLimiterService } from "#src/discord/discord-rate-limiter.service";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { MEMBER_REFRESH_QUEUE } from "./constants/member-refresh-queue.constant.js";
import {
  type MemberRefreshJobData,
  MemberRefreshSchedulerService,
} from "./member-refresh-scheduler.service.js";

describe("MemberRefreshSchedulerService", () => {
  let service: MemberRefreshSchedulerService;
  let queue: {
    getJob: Mock;
    add: Mock;
  };
  let rateLimiter: {
    getNextAvailableAtForUser: Mock;
  };
  let redisService: {
    get: Mock;
    setNX: Mock;
    eval: Mock;
  };
  let logger: {
    log: Mock;
    error: Mock;
    warn: Mock;
    debug: Mock;
  };
  let diagnostics: {
    recordMemberRefreshMetric: Mock;
  };

  const refreshData: MemberRefreshJobData = {
    discordId: "discord-123",
    guildId: "guild-123",
    userId: "user-123",
    priority: 4,
    reason: "test-refresh",
  };

  beforeEach(async () => {
    const mockQueue = {
      getJob: mockFn(),
      add: mockFn(),
    };

    const mockRateLimiter = {
      getNextAvailableAtForUser: mockFn().mockResolvedValue(null),
    };

    const mockRedisService = {
      get: mockFn(),
      setNX: mockFn(),
      eval: mockFn(),
    };

    const mockLogger = {
      log: mockFn(),
      error: mockFn(),
      warn: mockFn(),
      debug: mockFn(),
    };

    const mockDiagnostics = {
      recordMemberRefreshMetric: mockFn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberRefreshSchedulerService,
        {
          provide: getQueueToken(MEMBER_REFRESH_QUEUE),
          useValue: mockQueue,
        },
        {
          provide: DiscordRateLimiterService,
          useValue: mockRateLimiter,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: APPLICATION_LOGGER,
          useValue: mockLogger,
        },
        {
          provide: DiscordSyncDiagnosticsService,
          useValue: mockDiagnostics,
        },
      ],
    }).compile();

    service = module.get(MemberRefreshSchedulerService);
    queue = module.get(getQueueToken(MEMBER_REFRESH_QUEUE));
    rateLimiter = module.get(DiscordRateLimiterService);
    redisService = module.get(RedisService);
    logger = module.get(APPLICATION_LOGGER);
    diagnostics = module.get(
      DiscordSyncDiagnosticsService,
    ) as typeof diagnostics;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createJobMock = (
    state:
      | "active"
      | "completed"
      | "delayed"
      | "failed"
      | "prioritized"
      | "unknown"
      | "waiting"
      | "waiting-children",
    overrides: Partial<{
      data: MemberRefreshJobData;
      priority: number;
      promoteError: unknown;
      changeDelayError: unknown;
      removeError: unknown;
      stateAfterPromoteError:
        | "active"
        | "completed"
        | "delayed"
        | "failed"
        | "prioritized"
        | "unknown"
        | "waiting"
        | "waiting-children";
      stateAfterChangeDelayError:
        | "active"
        | "completed"
        | "delayed"
        | "failed"
        | "prioritized"
        | "unknown"
        | "waiting"
        | "waiting-children";
    }> = {},
  ) => {
    const getState = mockFn().mockResolvedValue(state);
    if (overrides.stateAfterPromoteError) {
      getState
        .mockResolvedValueOnce(state)
        .mockResolvedValueOnce(overrides.stateAfterPromoteError);
    }
    if (overrides.stateAfterChangeDelayError) {
      getState
        .mockResolvedValueOnce(state)
        .mockResolvedValueOnce(overrides.stateAfterChangeDelayError);
    }

    const promote = overrides.promoteError
      ? mockFn().mockRejectedValue(overrides.promoteError)
      : mockFn().mockResolvedValue(undefined);
    const changeDelay = overrides.changeDelayError
      ? mockFn().mockRejectedValue(overrides.changeDelayError)
      : mockFn().mockResolvedValue(undefined);
    const remove = overrides.removeError
      ? mockFn().mockRejectedValue(overrides.removeError)
      : mockFn().mockResolvedValue(undefined);

    return {
      id: `member-refresh-${refreshData.userId}-${refreshData.guildId}`,
      data: overrides.data ?? refreshData,
      opts: { priority: overrides.priority ?? refreshData.priority },
      getState,
      updateData: mockFn().mockResolvedValue(undefined),
      changePriority: mockFn().mockResolvedValue(undefined),
      promote,
      changeDelay,
      remove,
    };
  };

  describe("enqueueRefresh", () => {
    it("should add a new refresh job when no existing job is present", async () => {
      queue.getJob.mockResolvedValue(null);
      queue.add.mockResolvedValue({});

      const result = await service.enqueueRefresh(refreshData);

      expect(result).toEqual({
        queued: true,
        nextRefreshAt: null,
      });
      expect(queue.add).toHaveBeenCalledWith(
        "member-refresh",
        refreshData,
        expect.objectContaining({
          jobId: "member-refresh-user-123-guild-123",
          delay: 0,
          priority: refreshData.priority,
        }),
      );
      expect(diagnostics.recordMemberRefreshMetric).toHaveBeenCalledWith({
        outcome: "queued",
        reason: refreshData.reason,
      });
    });

    it("should record delayed queue metrics when rate limit delay is active", async () => {
      const nextRefreshAt = new Date(Date.now() + 5000);
      queue.getJob.mockResolvedValue(null);
      queue.add.mockResolvedValue({});
      rateLimiter.getNextAvailableAtForUser.mockResolvedValue(nextRefreshAt);

      await service.enqueueRefresh(refreshData);

      expect(queue.add).toHaveBeenCalledWith(
        "member-refresh",
        refreshData,
        expect.objectContaining({
          delay: expect.any(Number),
        }),
      );
      expect(diagnostics.recordMemberRefreshMetric).toHaveBeenCalledWith({
        outcome: "queued",
        reason: refreshData.reason,
      });
      expect(diagnostics.recordMemberRefreshMetric).toHaveBeenCalledWith({
        outcome: "delayed",
        reason: refreshData.reason,
      });
    });

    it("should update a waiting job without calling promote", async () => {
      const existingJob = createJobMock("waiting", { priority: 8 });
      queue.getJob.mockResolvedValue(existingJob);

      await service.enqueueRefresh({ ...refreshData, priority: 2 });

      expect(existingJob.updateData).toHaveBeenCalledWith({
        ...refreshData,
        priority: 2,
      });
      expect(existingJob.changePriority).toHaveBeenCalledWith({ priority: 2 });
      expect(existingJob.promote).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("should promote an existing delayed job when it should run immediately", async () => {
      const existingJob = createJobMock("delayed");
      queue.getJob.mockResolvedValue(existingJob);

      await service.enqueueRefresh(refreshData);

      expect(existingJob.promote).toHaveBeenCalledTimes(1);
      expect(existingJob.changeDelay).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("should update delay for an existing delayed job when rate limit is still active", async () => {
      const nextRefreshAt = new Date(Date.now() + 5000);
      const existingJob = createJobMock("delayed");
      queue.getJob.mockResolvedValue(existingJob);
      rateLimiter.getNextAvailableAtForUser.mockResolvedValue(nextRefreshAt);

      await service.enqueueRefresh(refreshData);

      expect(existingJob.changeDelay).toHaveBeenCalledWith(expect.any(Number));
      expect(existingJob.promote).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("should treat promote -3 as benign when the job already left delayed state", async () => {
      const existingJob = createJobMock("delayed", {
        promoteError: { code: -3 },
        stateAfterPromoteError: "waiting",
      });
      queue.getJob.mockResolvedValue(existingJob);

      await expect(service.enqueueRefresh(refreshData)).resolves.toEqual({
        queued: true,
        nextRefreshAt: null,
      });

      expect(existingJob.promote).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith({
        level: "debug",
        message:
          "Skipped promoting member refresh job because it already left delayed state",
        jobId: existingJob.id,
        state: "waiting",
      });
      expect(logger.log).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Failed to promote member refresh job",
        }),
      );
    });

    it("should treat changeDelay -3 as benign when the job already left delayed state", async () => {
      const nextRefreshAt = new Date(Date.now() + 5000);
      const existingJob = createJobMock("delayed", {
        changeDelayError: { code: -3 },
        stateAfterChangeDelayError: "waiting",
      });
      queue.getJob.mockResolvedValue(existingJob);
      rateLimiter.getNextAvailableAtForUser.mockResolvedValue(nextRefreshAt);

      await expect(service.enqueueRefresh(refreshData)).resolves.toEqual({
        queued: true,
        nextRefreshAt,
      });

      expect(existingJob.changeDelay).toHaveBeenCalledWith(expect.any(Number));
      expect(logger.log).toHaveBeenCalledWith({
        level: "debug",
        message:
          "Skipped changing member refresh job delay because it already left delayed state",
        jobId: existingJob.id,
        state: "waiting",
      });
      expect(logger.log).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Failed to change member refresh job delay",
        }),
      );
    });

    it.each(["completed", "failed", "unknown"] as const)(
      "should replace an existing %s job instead of reusing it",
      async (state) => {
        const existingJob =
          state === "unknown"
            ? createJobMock(state, { removeError: { code: -1 } })
            : createJobMock(state);
        queue.getJob.mockResolvedValue(existingJob);
        queue.add.mockResolvedValue({});

        await service.enqueueRefresh(refreshData);

        expect(existingJob.remove).toHaveBeenCalledTimes(1);
        expect(queue.add).toHaveBeenCalledWith(
          "member-refresh",
          refreshData,
          expect.objectContaining({
            jobId: "member-refresh-user-123-guild-123",
          }),
        );
      },
    );
  });

  describe("lock helpers", () => {
    it("should delegate refresh lock helpers to Redis", async () => {
      redisService.get.mockResolvedValue("owner-1");
      redisService.setNX.mockResolvedValue(true);
      redisService.eval.mockResolvedValue(1);

      await expect(service.isUserRefreshLocked("user-123")).resolves.toBe(true);
      await expect(
        service.acquireUserRefreshLock("user-123", "owner-1"),
      ).resolves.toBe(true);
      await expect(
        service.extendUserRefreshLock("user-123", "owner-1", 45),
      ).resolves.toBeUndefined();
      await expect(
        service.releaseUserRefreshLock("user-123", "owner-1"),
      ).resolves.toBeUndefined();

      expect(redisService.get).toHaveBeenCalledWith(
        "member:refresh:lock:user-123",
      );
      expect(redisService.setNX).toHaveBeenCalledWith(
        "member:refresh:lock:user-123",
        "owner-1",
        30,
      );
      expect(redisService.eval).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('redis.call("EXPIRE", KEYS[1], ARGV[2])'),
        ["member:refresh:lock:user-123"],
        ["owner-1", 45],
      );
      expect(redisService.eval).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('redis.call("DEL", KEYS[1])'),
        ["member:refresh:lock:user-123"],
        ["owner-1"],
      );
    });

    it("should expose the next refresh time from the rate limiter", async () => {
      const nextRefreshAt = new Date("2026-03-10T05:55:00.000Z");
      rateLimiter.getNextAvailableAtForUser.mockResolvedValue(nextRefreshAt);

      await expect(service.getNextRefreshAt("user-123")).resolves.toEqual(
        nextRefreshAt,
      );
    });
  });
});
