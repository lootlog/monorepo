import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/lib/redis/redis.service';

interface RateLimitData {
  remaining: number;
  reset: number;
  limit: number;
  bucket: string;
  scope?: 'user' | 'shared' | 'global';
}

interface BucketMetadata {
  bucket: string;
  scope?: 'user' | 'shared' | 'global';
}

@Injectable()
export class DiscordRateLimiterService {
  private readonly logger = new Logger(DiscordRateLimiterService.name);
  // Cache mapping: normalizedPath -> bucket metadata (bucket ID + scope)
  private readonly pathToBucketCache = new Map<string, BucketMetadata>();

  // TODO [LOW-MEDIUM PRIORITY]: Implement proactive global rate limit tracking (50 req/s)
  // Discord API has a global limit of 50 requests per second. Currently we only react to 429 responses.
  // For large applications (>40 req/s sustained), consider implementing a sliding window counter.
  // See: /improvements/discord-rate-limiter.md section 3 for implementation details.

  constructor(private readonly redis: RedisService) {}

  async checkRateLimit(
    bucket: string,
    userId?: string,
    topLevelResource?: string,
    scope?: 'user' | 'shared' | 'global',
  ): Promise<void> {
    const key = this.getBucketKey(bucket, userId, topLevelResource, scope);
    const data = await this.redis.get(key);

    if (!data) {
      return;
    }

    const rateLimitData = JSON.parse(data) as RateLimitData;
    const now = Date.now();

    // Clean up expired rate limit data
    if (rateLimitData.reset <= now) {
      await this.redis.del(key);
      return;
    }

    // If we've hit the rate limit, wait
    if (rateLimitData.remaining <= 0) {
      const waitTime = rateLimitData.reset - now + 100; // Add 100ms buffer
      const scopeInfo = scope ? ` scope: ${scope},` : '';
      this.logger.warn(
        `Rate limit reached for bucket ${bucket} ` +
          `(${scopeInfo} user: ${userId || 'none'}, resource: ${topLevelResource || 'none'}). ` +
          `Waiting ${waitTime}ms. ${rateLimitData.remaining}/${rateLimitData.limit} remaining.`,
      );
      await this.sleep(waitTime);
      await this.redis.del(key);
      return;
    }

    // Log warning if we're close to the limit
    if (rateLimitData.remaining <= 2) {
      const scopeInfo = scope ? ` scope: ${scope},` : '';
      this.logger.debug(
        `Low rate limit for bucket ${bucket} ` +
          `(${scopeInfo} user: ${userId || 'none'}, resource: ${topLevelResource || 'none'}): ` +
          `${rateLimitData.remaining}/${rateLimitData.limit} remaining, ` +
          `resets in ${Math.ceil((rateLimitData.reset - now) / 1000)}s`,
      );
    }
  }

  async checkRateLimitForPath(path: string, userId?: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const cachedMetadata = this.pathToBucketCache.get(normalizedPath);

    if (cachedMetadata) {
      const topLevelResource = this.extractTopLevelResource(path);
      await this.checkRateLimit(
        cachedMetadata.bucket,
        userId,
        topLevelResource,
        cachedMetadata.scope,
      );
    }
  }

  /**
   * Check if bucket has sufficient capacity for background requests
   * Returns true if bucket has enough remaining requests (>= threshold)
   * Used to prevent background jobs from consuming user's rate limit
   */
  async hasBucketCapacity(
    path: string,
    userId?: string,
    threshold: number = 3,
  ): Promise<boolean> {
    const normalizedPath = this.normalizePath(path);
    const cachedMetadata = this.pathToBucketCache.get(normalizedPath);

    if (!cachedMetadata) {
      // No rate limit data cached - assume bucket is available
      return true;
    }

    const topLevelResource = this.extractTopLevelResource(path);
    const key = this.getBucketKey(
      cachedMetadata.bucket,
      userId,
      topLevelResource,
      cachedMetadata.scope,
    );
    const data = await this.redis.get(key);

    if (!data) {
      // No rate limit data - bucket is available
      return true;
    }

    const rateLimitData = JSON.parse(data) as RateLimitData;
    const now = Date.now();

    // If reset time has passed, bucket is available
    if (rateLimitData.reset <= now) {
      await this.redis.del(key);
      return true;
    }

    // Check if remaining requests are above threshold
    return rateLimitData.remaining >= threshold;
  }

  async updateFromHeaders(
    path: string,
    headers: Record<string, string | null>,
    userId?: string,
  ): Promise<void> {
    const bucket = headers['x-ratelimit-bucket'];

    if (!bucket) {
      return;
    }

    const normalizedPath = this.normalizePath(path);
    const limit = parseInt(headers['x-ratelimit-limit'] || '0');
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
    const resetTimestamp = parseFloat(headers['x-ratelimit-reset'] || '0');
    // Prefer X-RateLimit-Reset-After for higher precision (supports decimals for milliseconds)
    // Falls back to X-RateLimit-Reset if Reset-After is not available
    const resetAfter = parseFloat(headers['x-ratelimit-reset-after'] || '0');
    const scope = headers['x-ratelimit-scope'] as
      | 'user'
      | 'shared'
      | 'global'
      | null;
    const isGlobal = headers['x-ratelimit-global'] === 'true';

    // Cache bucket metadata with scope
    this.pathToBucketCache.set(normalizedPath, {
      bucket,
      scope: scope || undefined,
    });

    if (limit === 0) {
      return;
    }

    const now = Date.now();
    let reset: number;

    // Prefer Reset-After (more precise, includes milliseconds) over Reset timestamp
    if (resetAfter > 0) {
      reset = now + Math.floor(resetAfter * 1000);
    } else if (resetTimestamp > 0) {
      reset = Math.floor(resetTimestamp * 1000);
    } else {
      return; // No valid reset time available
    }

    // Skip if reset time has already passed
    if (reset <= now) {
      return;
    }

    const topLevelResource = this.extractTopLevelResource(path);
    const key = this.getBucketKey(bucket, userId, topLevelResource, scope || undefined);
    const ttl = Math.max(Math.ceil((reset - now) / 1000), 1);

    const rateLimitData: RateLimitData = {
      remaining,
      reset,
      limit,
      bucket,
      scope: scope || undefined,
    };

    await this.redis.set(key, JSON.stringify(rateLimitData), ttl);

    const scopeInfo = scope ? ` (scope: ${scope})` : '';
    const globalInfo = isGlobal ? ' [GLOBAL]' : '';
    const userInfo = userId ? ` [user:${userId}]` : '';
    const resourceInfo = topLevelResource ? ` [${topLevelResource}]` : '';

    this.logger.debug(
      `Rate limit updated${globalInfo}${scopeInfo}: bucket=${bucket}${userInfo}${resourceInfo}, ` +
        `${remaining}/${limit} remaining, resets at ${new Date(reset).toISOString()}`,
    );
  }

  async updateFromRateLimitError(
    path: string,
    error: { retryAfter: number; limit: number; hash: string; scope?: 'user' | 'shared' | 'global' },
    userId?: string,
  ): Promise<void> {
    const bucket = error.hash || 'unknown';
    const normalizedPath = this.normalizePath(path);

    // Cache bucket metadata with scope (if available from error)
    this.pathToBucketCache.set(normalizedPath, {
      bucket,
      scope: error.scope,
    });

    const now = Date.now();
    const reset = now + error.retryAfter;
    const topLevelResource = this.extractTopLevelResource(path);
    const key = this.getBucketKey(bucket, userId, topLevelResource, error.scope);
    const ttl = Math.max(Math.ceil(error.retryAfter / 1000), 1);

    const rateLimitData: RateLimitData = {
      remaining: 0,
      reset,
      limit: error.limit,
      bucket,
      scope: error.scope,
    };

    await this.redis.set(key, JSON.stringify(rateLimitData), ttl);

    const userInfo = userId ? ` [user:${userId}]` : '';
    const resourceInfo = topLevelResource ? ` [${topLevelResource}]` : '';
    this.logger.warn(
      `Rate limit exceeded: bucket=${bucket}${userInfo}${resourceInfo}, ` +
        `0/${error.limit} remaining, locked for ${Math.ceil(error.retryAfter / 1000)}s`,
    );
  }

  private normalizePath(path: string): string {
    return path
      .replace(/\/guilds\/\d+/, '/guilds/{guild.id}')
      .replace(/\/channels\/\d+/, '/channels/{channel.id}')
      .replace(/\/webhooks\/\d+/, '/webhooks/{webhook.id}')
      .replace(/\/users\/\d+/, '/users/{user.id}');
  }

  extractTopLevelResource(path: string): string | undefined {
    // For user-specific endpoints, we don't need resource-based rate limiting
    if (path.includes('/users/@me/guilds')) {
      return undefined; // Let user ID handle the separation
    }

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

  /**
   * Generate a Redis key for rate limit data based on scope
   *
   * Discord API rate limit scopes:
   * - 'user': Rate limit is per user (each user has their own limit)
   * - 'shared': Rate limit is shared across a resource (e.g., per guild)
   * - 'global': Rate limit is global (affects all requests)
   */
  private getBucketKey(
    bucket: string,
    userId?: string,
    topLevelResource?: string,
    scope?: 'user' | 'shared' | 'global',
  ): string {
    // Global scope - no user or resource specificity
    if (scope === 'global') {
      return `discord:ratelimit:${bucket}:global`;
    }

    // Shared scope - rate limit is per resource (e.g., per guild/channel)
    if (scope === 'shared') {
      if (topLevelResource) {
        return `discord:ratelimit:${bucket}:shared:${topLevelResource}`;
      }
      return `discord:ratelimit:${bucket}:shared`;
    }

    // User scope - rate limit is per user
    if (scope === 'user') {
      if (userId) {
        if (topLevelResource) {
          return `discord:ratelimit:${bucket}:user:${userId}:${topLevelResource}`;
        }
        return `discord:ratelimit:${bucket}:user:${userId}`;
      }
      // Fallback if userId not provided but scope is 'user'
      return `discord:ratelimit:${bucket}:user:unknown`;
    }

    // Legacy behavior when scope is not specified
    // Try to infer from presence of userId
    if (userId) {
      if (topLevelResource) {
        return `discord:ratelimit:${bucket}:user:${userId}:${topLevelResource}`;
      }
      return `discord:ratelimit:${bucket}:user:${userId}`;
    }

    // Default fallback
    if (topLevelResource) {
      return `discord:ratelimit:${bucket}:${topLevelResource}`;
    }
    return `discord:ratelimit:${bucket}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
