import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
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
  // Cache mapping: METHOD + normalizedPath -> bucket metadata (bucket ID + scope)
  private readonly pathToBucketCache = new Map<string, BucketMetadata>();

  private readonly GLOBAL_KEY = 'discord:ratelimit:global';

  // Jitter range for sleep times (ms)
  private readonly MIN_JITTER = 50;
  private readonly MAX_JITTER = 250;

  // TODO [LOW-MEDIUM PRIORITY]: Implement proactive global rate limit tracking (50 req/s)
  // Discord API has a global limit of 50 requests per second. Currently we only react to 429 responses.
  // For large applications (>40 req/s sustained), consider implementing a sliding window counter.
  // See: /improvements/discord-rate-limiter.md section 3 for implementation details.

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redis: RedisService,
  ) {}


  /**
   * Check rate limit ONLY if we have cached 429 response data
   * This prevents requests when we KNOW we're rate limited
   * Does NOT block based on header estimates
   */
  async checkRateLimitForPath(
    path: string,
    userId?: string,
    method: string = 'GET',
  ): Promise<void> {
    const key = this.normalizeKey(method, path);
    const cachedMetadata = this.pathToBucketCache.get(key);

    this.logger.log({
      level: 'info',
      message: 'checkRateLimitForPath',
      key,
      hasCachedMetadata: !!cachedMetadata,
      cachedMetadata: cachedMetadata ? JSON.stringify(cachedMetadata) : 'null',
    });

    if (cachedMetadata) {
      const topLevelResource = this.extractTopLevelResource(path);
      // Only check if we have explicit rate limit block (remaining: 0)
      await this.checkRateLimitIfBlocked(
        cachedMetadata.bucket,
        userId,
        topLevelResource,
        cachedMetadata.scope,
      );
    }
  }

  /**
   * Check ONLY if we have a known active rate limit (remaining: 0)
   * Does NOT block based on low remaining counts from headers
   */
  private async checkRateLimitIfBlocked(
    bucket: string,
    userId?: string,
    topLevelResource?: string,
    scope?: 'user' | 'shared' | 'global',
  ): Promise<void> {
    // Check for global rate limit first
    await this.checkGlobalBlock();

    const key = this.getBucketKey(bucket, userId, topLevelResource, scope);
    const data = await this.redis.get(key);

    this.logger.log({
      level: 'info',
      message: 'checkRateLimitIfBlocked - Redis lookup',
      bucket,
      userId,
      redisKey: key,
      hasData: !!data,
    });

    if (!data) {
      return;
    }

    const rateLimitData = JSON.parse(data) as RateLimitData;
    const now = Date.now();

    // Clean up expired rate limit data
    if (rateLimitData.reset <= now) {
      this.logger.log({
        level: 'info',
        message: 'Rate limit expired, clearing',
        bucket,
      });
      await this.redis.del(key);
      return;
    }

    // ONLY block if remaining is 0 (from a 429 response)
    // Do NOT block based on header estimates
    if (rateLimitData.remaining === 0) {
      const waitTime = rateLimitData.reset - now + this.getJitter();
      const resetDate = new Date(rateLimitData.reset);
      const scopeInfo = scope ? ` scope: ${scope},` : '';
      this.logger.log({
        level: 'warn',
        message:
          `Rate limit active (from 429) for bucket ${bucket} ` +
          `(${scopeInfo} user: ${userId || 'none'}, resource: ${topLevelResource || 'none'}). ` +
          `Waiting ${waitTime}ms. ${rateLimitData.remaining}/${rateLimitData.limit} remaining. ` +
          `Resets at ${resetDate.toISOString()}`,
      });
      await this.sleep(waitTime);
      await this.redis.del(key);
    } else {
      this.logger.log({
        level: 'info',
        message: 'Rate limit data exists but remaining > 0, allowing request',
        remaining: rateLimitData.remaining,
        limit: rateLimitData.limit,
      });
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
    method: string = 'GET',
  ): Promise<boolean> {
    const key = this.normalizeKey(method, path);
    const cachedMetadata = this.pathToBucketCache.get(key);

    if (!cachedMetadata) {
      // No rate limit data cached - assume bucket is available
      return true;
    }

    const topLevelResource = this.extractTopLevelResource(path);
    const bucketKey = this.getBucketKey(
      cachedMetadata.bucket,
      userId,
      topLevelResource,
      cachedMetadata.scope,
    );
    const data = await this.redis.get(bucketKey);

    if (!data) {
      // No rate limit data - bucket is available
      return true;
    }

    const rateLimitData = JSON.parse(data) as RateLimitData;
    const now = Date.now();

    // If reset time has passed, bucket is available
    if (rateLimitData.reset <= now) {
      await this.redis.del(bucketKey);
      return true;
    }

    // Check if remaining requests are above threshold
    return rateLimitData.remaining >= threshold;
  }

  /**
   * Update bucket metadata from response headers
   * This only caches the bucket ID mapping, does NOT store rate limit data
   * Rate limit data is ONLY stored from 429 responses
   */
  async updateFromHeaders(
    path: string,
    headers: Record<string, string | null>,
    userId?: string,
    method: string = 'GET',
  ): Promise<void> {
    const bucket = headers['x-ratelimit-bucket'];

    if (!bucket) {
      return;
    }

    const key = this.normalizeKey(method, path);
    const scope = headers['x-ratelimit-scope'] as
      | 'user'
      | 'shared'
      | 'global'
      | null;

    // Only cache bucket metadata (for path -> bucket mapping)
    // Do NOT store rate limit data from headers
    this.pathToBucketCache.set(key, {
      bucket,
      scope: scope || undefined,
    });

    this.logger.log({
      level: 'debug',
      message: 'Updated bucket metadata from headers',
      key,
      bucket,
      scope: scope || 'undefined',
      remaining: headers['x-ratelimit-remaining'],
      limit: headers['x-ratelimit-limit'],
    });
  }

  /**
   * Update rate limit data from 429 response
   * This is the ONLY place where rate limit blocking data is stored
   * Uses retry_after from Discord's 429 response body
   */
  async updateFromRateLimitError(
    path: string,
    error: {
      retryAfter: number; // In milliseconds (Discord.js already converted)
      limit: number;
      hash: string;
      scope?: 'user' | 'shared' | 'global';
      global?: boolean;
    },
    userId?: string,
    method: string = 'GET',
  ): Promise<void> {
    const bucket = error.hash || 'unknown';
    const key = this.normalizeKey(method, path);

    // Cache bucket metadata with scope (if available from error)
    this.pathToBucketCache.set(key, {
      bucket,
      scope: error.scope,
    });

    const now = Date.now();
    // Note: Discord.js RateLimitError.retryAfter is already in MILLISECONDS
    // Discord API returns retry_after in SECONDS in the body, but Discord.js converts it
    const reset = now + error.retryAfter;

    this.logger.log({
      level: 'warn',
      message: '429 Rate Limit Error Received',
      path,
      method,
      bucket,
      retryAfterMs: error.retryAfter,
      retryAfterSeconds: error.retryAfter / 1000,
      limit: error.limit,
      scope: error.scope,
      global: error.global,
      userId,
      resetAt: new Date(reset).toISOString(),
    });

    // If global rate limit error, block all requests
    if (error.global || error.scope === 'global') {
      await this.blockGlobally(error.retryAfter);
    }

    const topLevelResource = this.extractTopLevelResource(path);
    const bucketKey = this.getBucketKey(
      bucket,
      userId,
      topLevelResource,
      error.scope,
    );
    const ttl = Math.max(Math.ceil(error.retryAfter / 1000), 1);

    // Store rate limit block with remaining: 0
    const rateLimitData: RateLimitData = {
      remaining: 0, // Always 0 from 429 response
      reset,
      limit: error.limit,
      bucket,
      scope: error.scope,
    };

    await this.redis.set(bucketKey, JSON.stringify(rateLimitData), ttl);

    this.logger.log({
      level: 'warn',
      message: 'Stored rate limit block in Redis',
      redisKey: bucketKey,
      ttlSeconds: ttl,
      rateLimitData: JSON.stringify(rateLimitData),
    });
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

  /**
   * Clear all rate limit data for a specific user
   * Useful for testing or when user re-authenticates
   */
  async clearUserRateLimits(userId: string): Promise<void> {
    const pattern = `discord:ratelimit:*:user:${userId}*`;
    const client = await this.redis.getClient();
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redis.del(key)));
      this.logger.log({
        level: 'info',
        message: `Cleared ${keys.length} rate limit entries for user ${userId}`,
      });
    }
  }

  /**
   * Clear all rate limit data
   * Useful for testing
   */
  async clearAllRateLimits(): Promise<void> {
    const pattern = 'discord:ratelimit:*';
    const client = await this.redis.getClient();
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redis.del(key)));
      this.logger.log({
        level: 'info',
        message: `Cleared ${keys.length} rate limit entries`,
      });
    }
  }

  /**
   * Block globally for a specified time (used when Discord returns global rate limit)
   */
  private async blockGlobally(ttlMs: number): Promise<void> {
    const ttlSec = Math.max(Math.ceil(ttlMs / 1000), 1);
    const resetAt = Date.now() + ttlMs;
    await this.redis.set(this.GLOBAL_KEY, String(resetAt), ttlSec);
    this.logger.log({
      level: 'warn',
      message: `Global rate limit active, blocked for ${ttlSec}s until ${new Date(resetAt).toISOString()}`,
    });
  }

  /**
   * Check if there's an active global rate limit block
   */
  private async checkGlobalBlock(): Promise<void> {
    const until = await this.redis.get(this.GLOBAL_KEY);
    if (!until) {
      return;
    }

    const waitMs = Number(until) - Date.now();
    if (waitMs > 0) {
      const jitteredWait = waitMs + this.getJitter();
      this.logger.log({
        level: 'warn',
        message: `Global rate limit active, waiting ${jitteredWait}ms`,
      });
      await this.sleep(jitteredWait);
    }
  }

  /**
   * Generate cache key from HTTP method and path
   */
  private normalizeKey(method: string, path: string): string {
    return `${method.toUpperCase()} ${this.normalizePath(path)}`;
  }

  /**
   * Get random jitter value
   */
  private getJitter(): number {
    return Math.floor(
      Math.random() * (this.MAX_JITTER - this.MIN_JITTER) + this.MIN_JITTER,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
