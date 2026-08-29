import { ServiceUnavailableException } from "@nestjs/common";
import {
  buildNotificationRateLimitKey,
  NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS,
  NOTIFICATION_RATE_LIMIT_WINDOW_MS,
  NotificationRateLimiterService,
} from "./notification-rate-limiter.service.js";

describe("NotificationRateLimiterService", () => {
  const logger = { log: vi.fn<(entry: unknown) => void>() };
  const redisService = {
    eval: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the authenticated user key and configured limit", async () => {
    redisService.eval.mockResolvedValue([1, 0]);
    const service = new NotificationRateLimiterService(
      logger as never,
      redisService as never,
    );

    await expect(service.consume("user-1")).resolves.toEqual({
      accepted: true,
    });

    expect(redisService.eval).toHaveBeenCalledWith(
      expect.any(String),
      [buildNotificationRateLimitKey("user-1")],
      [
        NOTIFICATION_RATE_LIMIT_WINDOW_MS,
        NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS,
        expect.any(String),
      ],
    );
  });

  it("returns the Redis retry delay when the limit is exhausted", async () => {
    redisService.eval.mockResolvedValue([0, 2_345]);
    const service = new NotificationRateLimiterService(
      logger as never,
      redisService as never,
    );

    await expect(service.consume("user-1")).resolves.toEqual({
      accepted: false,
      retryAfterMs: 2_345,
    });
  });

  it("fails closed and logs no user data when Redis is unavailable", async () => {
    redisService.eval.mockRejectedValue(new Error("redis unavailable"));
    const service = new NotificationRateLimiterService(
      logger as never,
      redisService as never,
    );

    await expect(service.consume("sensitive-user-id")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(logger.log).toHaveBeenCalledWith({
      level: "error",
      message: "Failed to apply notification rate limit",
    });
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain(
      "sensitive-user-id",
    );
  });

  it("fails closed when Redis returns an invalid limiter result", async () => {
    redisService.eval.mockResolvedValue(["unexpected"]);
    const service = new NotificationRateLimiterService(
      logger as never,
      redisService as never,
    );

    await expect(service.consume("user-1")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
