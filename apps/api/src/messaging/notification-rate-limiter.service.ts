import { randomUUID } from "node:crypto";
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { RedisService } from "#src/redis/redis.service";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import type { Logger } from "winston";

export const NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const NOTIFICATION_RATE_LIMIT_WINDOW_MS = 5_000;

export const buildNotificationRateLimitKey = (userId: string): string =>
  `messaging:notification-rate:${userId}`;

const NOTIFICATION_RATE_LIMIT_SCRIPT = `
local time = redis.call("TIME")
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])

redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now - window)

local count = redis.call("ZCARD", KEYS[1])
if count >= limit then
  local oldest = redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")
  local retryAfter = math.max(1, tonumber(oldest[2]) + window - now)
  return {0, retryAfter}
end

redis.call("ZADD", KEYS[1], now, ARGV[3])
redis.call("PEXPIRE", KEYS[1], window)
return {1, 0}
`;

export type NotificationRateLimitOutcome =
  | { accepted: true }
  | { accepted: false; retryAfterMs: number };

@Injectable()
export class NotificationRateLimiterService {
  constructor(
    @Inject(APPLICATION_LOGGER) private readonly logger: Logger,
    private readonly redisService: RedisService,
  ) {}

  async consume(userId: string): Promise<NotificationRateLimitOutcome> {
    try {
      const result = await this.redisService.eval<unknown>(
        NOTIFICATION_RATE_LIMIT_SCRIPT,
        [buildNotificationRateLimitKey(userId)],
        [
          NOTIFICATION_RATE_LIMIT_WINDOW_MS,
          NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS,
          randomUUID(),
        ],
      );
      if (!Array.isArray(result) || result.length !== 2) {
        throw new Error("Invalid notification rate limit result");
      }

      const accepted = Number(result[0]);
      const retryAfterMs = Number(result[1]);
      if (
        (accepted !== 0 && accepted !== 1) ||
        !Number.isFinite(retryAfterMs)
      ) {
        throw new Error("Invalid notification rate limit result");
      }

      if (accepted === 1) {
        return { accepted: true };
      }

      return {
        accepted: false,
        retryAfterMs: Math.max(1, retryAfterMs),
      };
    } catch {
      this.logger.log({
        level: "error",
        message: "Failed to apply notification rate limit",
      });
      throw new ServiceUnavailableException();
    }
  }
}
