import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/lib/redis/redis.service';

interface RateLimitData {
  remaining: number;
  reset: number;
  limit: number;
  bucket: string;
}

@Injectable()
export class DiscordRateLimiterService {
  private readonly logger = new Logger(DiscordRateLimiterService.name);
  private readonly pathToBucketCache = new Map<string, string>();

  constructor(private readonly redis: RedisService) {}

  async checkRateLimit(
    bucket: string,
    topLevelResource?: string,
  ): Promise<void> {
    const key = this.getBucketKey(bucket, topLevelResource);
    const data = await this.redis.get(key);

    if (!data) {
      return;
    }

    const rateLimitData = JSON.parse(data) as RateLimitData;
    const now = Date.now();

    if (rateLimitData.reset <= now) {
      await this.redis.del(key);
      return;
    }

    if (rateLimitData.remaining <= 0) {
      const waitTime = rateLimitData.reset - now + 100;
      this.logger.warn(
        `Rate limit reached for bucket ${bucket} (resource: ${topLevelResource || 'none'}). ` +
          `Waiting ${waitTime}ms. ${rateLimitData.remaining}/${rateLimitData.limit} remaining.`,
      );
      await this.sleep(waitTime);
      await this.redis.del(key);
      return;
    }

    if (rateLimitData.remaining <= 2) {
      this.logger.debug(
        `Low rate limit for bucket ${bucket} (resource: ${topLevelResource || 'none'}): ` +
          `${rateLimitData.remaining}/${rateLimitData.limit} remaining, ` +
          `resets in ${Math.ceil((rateLimitData.reset - now) / 1000)}s`,
      );
    }
  }

  async checkRateLimitForPath(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const cachedBucket = this.pathToBucketCache.get(normalizedPath);

    if (cachedBucket) {
      const topLevelResource = this.extractTopLevelResource(path);
      await this.checkRateLimit(cachedBucket, topLevelResource);
    }
  }

  async updateFromHeaders(
    path: string,
    headers: Record<string, string | null>,
  ): Promise<void> {
    const bucket = headers['x-ratelimit-bucket'];

    if (!bucket) {
      return;
    }

    const normalizedPath = this.normalizePath(path);
    this.pathToBucketCache.set(normalizedPath, bucket);

    const limit = parseInt(headers['x-ratelimit-limit'] || '0');
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
    const resetTimestamp = parseFloat(headers['x-ratelimit-reset'] || '0');
    const scope = headers['x-ratelimit-scope'];
    const isGlobal = headers['x-ratelimit-global'] === 'true';

    if (limit === 0 || resetTimestamp === 0) {
      return;
    }

    const reset = Math.floor(resetTimestamp * 1000);
    const now = Date.now();

    if (reset <= now) {
      return;
    }

    const topLevelResource = this.extractTopLevelResource(path);
    const key = this.getBucketKey(bucket, topLevelResource);
    const ttl = Math.max(Math.ceil((reset - now) / 1000), 1);

    const rateLimitData: RateLimitData = {
      remaining,
      reset,
      limit,
      bucket,
    };

    await this.redis.set(key, JSON.stringify(rateLimitData), ttl);

    const scopeInfo = scope ? ` (scope: ${scope})` : '';
    const globalInfo = isGlobal ? ' [GLOBAL]' : '';
    const resourceInfo = topLevelResource ? ` [${topLevelResource}]` : '';

    this.logger.debug(
      `Rate limit updated${globalInfo}${scopeInfo}: bucket=${bucket}${resourceInfo}, ` +
        `${remaining}/${limit} remaining, resets at ${new Date(reset).toISOString()}`,
    );
  }

  private normalizePath(path: string): string {
    return path
      .replace(/\/guilds\/\d+/, '/guilds/{guild.id}')
      .replace(/\/channels\/\d+/, '/channels/{channel.id}')
      .replace(/\/webhooks\/\d+/, '/webhooks/{webhook.id}');
  }

  extractTopLevelResource(path: string): string | undefined {
    const guildMatch = path.match(/\/guilds\/(\d+)/);
    if (guildMatch) {
      return `guild:${guildMatch[1]}`;
    }

    const channelMatch = path.match(/\/channels\/(\d+)/);
    if (channelMatch) {
      return `channel:${channelMatch[1]}`;
    }

    const webhookMatch = path.match(/\/webhooks\/(\d+)/);
    if (webhookMatch) {
      return `webhook:${webhookMatch[1]}`;
    }

    return undefined;
  }

  private getBucketKey(bucket: string, topLevelResource?: string): string {
    if (topLevelResource) {
      return `discord:ratelimit:${bucket}:${topLevelResource}`;
    }
    return `discord:ratelimit:${bucket}`;
  }

  async updateFromRateLimitError(
    path: string,
    error: { retryAfter: number; limit: number; hash: string },
  ): Promise<void> {
    const bucket = error.hash || 'unknown';
    const normalizedPath = this.normalizePath(path);
    this.pathToBucketCache.set(normalizedPath, bucket);

    const now = Date.now();
    const reset = now + error.retryAfter;
    const topLevelResource = this.extractTopLevelResource(path);
    const key = this.getBucketKey(bucket, topLevelResource);
    const ttl = Math.max(Math.ceil(error.retryAfter / 1000), 1);

    const rateLimitData: RateLimitData = {
      remaining: 0,
      reset,
      limit: error.limit,
      bucket,
    };

    await this.redis.set(key, JSON.stringify(rateLimitData), ttl);

    const resourceInfo = topLevelResource ? ` [${topLevelResource}]` : '';
    this.logger.warn(
      `Rate limit exceeded: bucket=${bucket}${resourceInfo}, ` +
        `0/${error.limit} remaining, locked for ${Math.ceil(error.retryAfter / 1000)}s`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
