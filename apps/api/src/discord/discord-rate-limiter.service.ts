import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { RedisService } from 'src/lib/redis/redis.service';

interface UserRateLimitData {
  retryAfter: number;
  resetAt: number;
}

@Injectable()
export class DiscordRateLimiterService {
  private readonly RATE_LIMIT_KEY_PREFIX = 'discord:ratelimit:user:';

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redis: RedisService,
  ) {}

  async checkRateLimitForUser(
    userId: string,
    endpoint: string,
  ): Promise<boolean> {
    const key = this.getUserKey(userId, endpoint);
    const data = await this.redis.get(key);

    if (!data) {
      return false;
    }

    const rateLimitData = JSON.parse(data) as UserRateLimitData;
    const now = Date.now();

    if (rateLimitData.resetAt <= now) {
      await this.redis.del(key);
      return false;
    }

    const waitTime = rateLimitData.resetAt - now;
    this.logger.log({
      level: 'warn',
      message: `Rate limit active for user ${userId} on endpoint ${endpoint}. Wait time: ${waitTime}ms`,
      userId,
      endpoint,
      resetAt: new Date(rateLimitData.resetAt).toISOString(),
    });

    return true;
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
      retryAfter: retryAfterMs,
      resetAt,
    };

    await this.redis.set(key, JSON.stringify(rateLimitData), ttlSeconds);

    this.logger.log({
      level: 'warn',
      message: 'Set rate limit for user',
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
