import type { Mock } from "vitest";
import { mockFn } from "src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { DiscordRateLimiterService } from "src/discord/discord-rate-limiter.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { MEMBER_REFRESH_QUEUE } from "./constants/member-refresh-queue.constant";
import {
  type MemberRefreshJobData,
  MemberRefreshSchedulerService,
} from "./member-refresh-scheduler.service";

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
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get(MemberRefreshSchedulerService);
    queue = module.get(getQueueToken(MEMBER_REFRESH_QUEUE));
    rateLimiter = module.get(DiscordRateLimiterService);
    redisService = module.get(RedisService);
    logger = module.get(WINSTON_MODULE_PROVIDER);
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
    }> = {},
  ) => {
    const getState = mockFn().mockResolvedValue(state);
    if (overrides.stateAfterPromoteError) {
      getState
        .mockResolvedValueOnce(state)
        .mockResolvedValueOnce(overrides.stateAfterPromoteError);
    }

    const promote = overrides.promoteError
      ? mockFn().mockRejectedValue(overrides.promoteError)
      : mockFn().mockResolvedValue(undefined);
    const remove = overrides.removeError
      ? mockFn().mockRejectedValue(overrides.removeError)
      : mockFn().mockResolvedValue(undefined);

    return {
      id: `member-refresh:${refreshData.userId}:${refreshData.guildId}`,
      data: overrides.data ?? refreshData,
      opts: { priority: overrides.priority ?? refreshData.priority },
      getState,
      updateData: mockFn().mockResolvedValue(undefined),
      changePriority: mockFn().mockResolvedValue(undefined),
      promote,
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
          jobId: "member-refresh:user-123:guild-123",
          delay: 0,
          priority: refreshData.priority,
        }),
      );
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
            jobId: "member-refresh:user-123:guild-123",
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
