import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { RedisService } from "src/lib/redis/redis.service";

interface UserRateLimitData {
  bucket?: string | null;
  limit?: number | null;
  remaining?: number | null;
  retryAfter: number;
  resetAt: number;
}

export interface DiscordRateLimitState {
  bucket: string | null;
  limit: number | null;
  remaining: number | null;
  resetAt: number;
  retryAfter: number;
  isBlocked: boolean;
}

@Injectable()
export class DiscordRateLimiterService {
  private readonly RATE_LIMIT_KEY_PREFIX = "discord:ratelimit:user:";

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redis: RedisService,
  ) {}

  async checkRateLimitForUser(
    userId: string,
    endpoint: string,
  ): Promise<boolean> {
    const state = await this.getRateLimitStateForUser(userId, endpoint);
    if (!state?.isBlocked) {
      return false;
    }

    const waitTime = state.resetAt - Date.now();
    this.logger.log({
      level: "warn",
      message: `Rate limit active for user ${userId} on endpoint ${endpoint}. Wait time: ${waitTime}ms`,
      userId,
      endpoint,
      resetAt: new Date(state.resetAt).toISOString(),
    });

    return true;
  }

  async getRateLimitStateForUser(
    userId: string,
    endpoint: string,
  ): Promise<DiscordRateLimitState | null> {
    const key = this.getUserKey(userId, endpoint);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    const rateLimitData = JSON.parse(data) as UserRateLimitData;
    const now = Date.now();

    if (rateLimitData.resetAt <= now) {
      await this.redis.del(key);
      return null;
    }

    const remaining =
      typeof rateLimitData.remaining === "number"
        ? rateLimitData.remaining
        : null;

    return {
      bucket: rateLimitData.bucket ?? null,
      limit:
        typeof rateLimitData.limit === "number" ? rateLimitData.limit : null,
      remaining,
      resetAt: rateLimitData.resetAt,
      retryAfter: rateLimitData.retryAfter,
      isBlocked:
        remaining !== null ? remaining <= 0 : rateLimitData.retryAfter > 0,
    };
  }

  async getNextAvailableAtForUser(
    userId: string,
    endpoint: string,
  ): Promise<Date | null> {
    const state = await this.getRateLimitStateForUser(userId, endpoint);
    if (!state?.isBlocked) {
      return null;
    }

    return new Date(state.resetAt);
  }

  async updateRateLimitFromHeaders(
    userId: string,
    endpoint: string,
    headers: { get(name: string): string | null },
  ): Promise<void> {
    const bucket = headers.get("x-ratelimit-bucket");
    const limitHeader = headers.get("x-ratelimit-limit");
    const remainingHeader = headers.get("x-ratelimit-remaining");
    const resetAfterHeader =
      headers.get("x-ratelimit-reset-after") ?? headers.get("retry-after");
    const resetHeader = headers.get("x-ratelimit-reset");

    const limit = limitHeader ? Number.parseInt(limitHeader, 10) : null;
    const remaining = remainingHeader
      ? Number.parseInt(remainingHeader, 10)
      : null;

    const resetAfterSeconds = resetAfterHeader
      ? Number.parseFloat(resetAfterHeader)
      : Number.NaN;
    const resetAtSeconds = resetHeader
      ? Number.parseFloat(resetHeader)
      : Number.NaN;

    let resetAt = 0;
    if (Number.isFinite(resetAfterSeconds)) {
      resetAt = Date.now() + Math.ceil(resetAfterSeconds * 1000);
    } else if (Number.isFinite(resetAtSeconds)) {
      resetAt = Math.ceil(resetAtSeconds * 1000);
    }

    if (
      bucket === null &&
      limit === null &&
      remaining === null &&
      resetAt === 0
    ) {
      return;
    }

    const ttlSeconds =
      resetAt > 0 ? Math.max(Math.ceil((resetAt - Date.now()) / 1000), 1) : 60;

    const nextState: UserRateLimitData = {
      bucket,
      limit,
      remaining,
      retryAfter: resetAt > 0 ? Math.max(resetAt - Date.now(), 0) : 0,
      resetAt: resetAt > 0 ? resetAt : Date.now() + ttlSeconds * 1000,
    };

    await this.redis.set(
      this.getUserKey(userId, endpoint),
      JSON.stringify(nextState),
      ttlSeconds,
    );

    this.logger.log({
      level: "debug",
      message: "Updated Discord rate limit state from headers",
      userId,
      endpoint,
      bucket,
      limit,
      remaining,
      resetAt: new Date(nextState.resetAt).toISOString(),
      ttlSeconds,
    });
  }

  async setRateLimitForUser(
    userId: string,
    endpoint: string,
    retryAfterMs: number,
  ): Promise<void> {
    const now = Date.now();
    const resetAt = now + retryAfterMs;
    const key = this.getUserKey(userId, endpoint);
    const ttlSeconds = Math.max(Math.ceil(retryAfterMs / 1000), 1);

    const rateLimitData: UserRateLimitData = {
      bucket: null,
      limit: null,
      remaining: 0,
      retryAfter: retryAfterMs,
      resetAt,
    };

    await this.redis.set(key, JSON.stringify(rateLimitData), ttlSeconds);

    this.logger.log({
      level: "warn",
      message: "Set rate limit for user",
      userId,
      endpoint,
      retryAfterMs,
      resetAt: new Date(resetAt).toISOString(),
      ttlSeconds,
    });
  }

  async clearRateLimitForUser(
    userId: string,
    endpoint?: string,
  ): Promise<void> {
    if (endpoint) {
      const key = this.getUserKey(userId, endpoint);
      await this.redis.del(key);
    } else {
      const pattern = `${this.RATE_LIMIT_KEY_PREFIX}${userId}:*`;
      const client = await this.redis.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.redis.del(key)));
      }
    }
  }

  private getUserKey(userId: string, endpoint: string): string {
    return `${this.RATE_LIMIT_KEY_PREFIX}${userId}:${endpoint}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
