import { REST, RateLimitError } from '@discordjs/rest';
import {
  Injectable,
  OnModuleInit,
  Inject,
  UnauthorizedException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';
import { Routes, APIGuild, APIGuildMember } from 'discord-api-types/v10';
import { RedisService } from 'src/lib/redis/redis.service';
import { DiscordRateLimiterService } from './discord-rate-limiter.service';
import Redlock from 'redlock';
import {
  TokenExpiredError,
  AuthServiceUnavailableError,
  InvalidScopesError,
} from 'src/auth/errors';
import { retry, RetryableError } from 'src/lib/retry/retry.util';
import { ConfigKey } from 'src/config/config-key.enum';
import { ServiceConfig } from 'src/config/service.config';
import { RuntimeEnvironment } from 'src/types/runtime.types';

@Injectable()
export class DiscordService implements OnModuleInit {
  private redlock: Redlock;

  // Lock configuration
  private readonly lockTtl = 6000; // 6s - slightly more than REST timeout
  private readonly lockAcquireTimeout = 8000; // 8s - maximum time to wait for lock
  private readonly cacheCheckInterval = 100; // Check cache every 100ms when waiting

  // Cache TTL configuration (in seconds)
  private readonly guildsCacheTtlLocal = 10;
  private readonly guildsCacheTtlProd = 60 * 5; // 5 minutes
  private readonly memberCacheTtlLocal = 10;
  private readonly memberCacheTtlProd = 300; // 5 minutes
  private readonly errorCacheTtlLocal = 5;
  private readonly errorCacheTtlProd = 60; // 1 minute
  private readonly notFoundCacheTtlLocal = 30;
  private readonly notFoundCacheTtlProd = 300; // 5 minutes

  // Retry configuration
  private readonly retryMaxAttempts = 3;
  private readonly retryInitialDelay = 1000; // 1 second
  private readonly retryMaxDelay = 5000; // 5 seconds
  private readonly retryBackoffFactor = 2;

  // Redlock configuration
  private readonly redlockDriftFactor = 0.01;
  private readonly redlockRetryCount = 3;
  private readonly redlockRetryDelay = 100;
  private readonly redlockRetryJitter = 50;
  private readonly redlockExtensionThreshold = 3000;

  // REST client configuration
  private readonly restTimeout = 5000; // 5 seconds

  private readonly requiredScopes = [
    'guilds.members.read',
    'guilds',
    'identify',
    'email',
  ];
  private isLocal: boolean;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
    private readonly rateLimiter: DiscordRateLimiterService,
    private readonly configService: ConfigService,
  ) {
    const serviceConfig = this.configService.get<ServiceConfig>(
      ConfigKey.SERVICE,
    );
    this.isLocal = serviceConfig?.env === RuntimeEnvironment.LOCAL;
  }

  async onModuleInit() {
    const client = await this.redisService.getClient();
    this.redlock = new Redlock([client], {
      driftFactor: this.redlockDriftFactor,
      retryCount: this.redlockRetryCount,
      retryDelay: this.redlockRetryDelay,
      retryJitter: this.redlockRetryJitter,
      automaticExtensionThreshold: this.redlockExtensionThreshold,
    });
  }

  private getCacheTtl(localTtl: number, prodTtl: number): number {
    return this.isLocal ? localTtl : prodTtl;
  }

  private async waitForCache<T>(
    cacheKey: string,
    startTime: number,
  ): Promise<T | null> {
    const elapsed = Date.now() - startTime;
    if (elapsed >= this.lockAcquireTimeout) {
      return null;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, this.cacheCheckInterval),
    );

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    if (Date.now() - startTime < this.lockAcquireTimeout) {
      return this.waitForCache<T>(cacheKey, startTime);
    }

    return null;
  }

  async getRestClient(userId: string) {
    try {
      const token = await this.authService.getIdpToken(userId);

      if (!this.requiredScopes.every((scope) => token.scopes.includes(scope))) {
        throw new InvalidScopesError(this.requiredScopes, token.scopes);
      }

      const rest = new REST({
        version: '10',
        authPrefix: 'Bearer',
        timeout: this.restTimeout,
        rejectOnRateLimit: ['/users'],
      }).setToken(token.accessToken);

      // Pass userId to rate limiter for per-user tracking
      rest.on('response', async (request, response) => {
        try {
          const headers = {
            'x-ratelimit-bucket': response.headers.get('x-ratelimit-bucket'),
            'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
            'x-ratelimit-remaining': response.headers.get(
              'x-ratelimit-remaining',
            ),
            'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
            'x-ratelimit-reset-after': response.headers.get(
              'x-ratelimit-reset-after',
            ),
            'x-ratelimit-scope': response.headers.get('x-ratelimit-scope'),
            'x-ratelimit-global': response.headers.get('x-ratelimit-global'),
          };

          await this.rateLimiter.updateFromHeaders(
            request.path,
            headers,
            userId, // Pass userId for per-user rate limit tracking
          );

          // TODO [LOW PRIORITY]: Track invalid requests (401, 403, 429) to prevent Cloudflare bans
          // Discord limits: 10,000 invalid requests per 10 minutes
          // Note: 429 with X-RateLimit-Scope: shared are NOT counted
          // Implement when application scales to >16 req/s sustained
          // See: /improvements/discord-rate-limiter.md section 4 for implementation details
        } catch (error) {
          this.logger.log({
            level: 'error',
            message: 'Failed to update rate limit from headers',
            error: (error as Error).stack,
          });
        }
      });

      return rest;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException({
          message: 'TOKEN_EXPIRED',
          requiresReauth: true,
        });
      }

      if (error instanceof InvalidScopesError) {
        throw new UnauthorizedException({
          message: 'INVALID_SCOPES',
          required: error.required,
          actual: error.actual,
        });
      }

      if (error instanceof AuthServiceUnavailableError) {
        throw new ServiceUnavailableException({
          message: 'AUTH_SERVICE_UNAVAILABLE',
          retryAfter: 60,
        });
      }

      throw error;
    }
  }

  async getUserGuilds(userId: string): Promise<APIGuild[]> {
    const cacheTtl = this.getCacheTtl(
      this.guildsCacheTtlLocal,
      this.guildsCacheTtlProd,
    );
    const cacheKey = `user:${userId}:discord-guilds:data`;
    const lockKey = `user:${userId}:discord-guilds:lock`;

    // Check cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as APIGuild[];
    }

    // Use Redlock to prevent multiple concurrent Discord API calls
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;
    const startTime = Date.now();

    try {
      // Try to acquire lock
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      // Double-check cache after acquiring lock (another request might have filled it)
      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        return JSON.parse(cachedAfterLock) as APIGuild[];
      }

      const rest = await this.getRestClient(userId);
      const path = Routes.userGuilds();

      // Check rate limit with userId for per-user tracking
      await this.rateLimiter.checkRateLimitForPath(path, userId);

      const guilds = await retry(
        async () => {
          try {
            return (await rest.get(path)) as APIGuild[];
          } catch (error: any) {
            if (error instanceof RateLimitError) {
              await this.rateLimiter.updateFromRateLimitError(
                path,
                {
                  retryAfter: error.retryAfter,
                  limit: error.limit,
                  hash: error.hash,
                  scope: error.scope,
                },
                userId,
              );
              this.logger.log({
                level: 'warn',
                message: `Rate limit hit for getUserGuilds, waiting ${error.retryAfter}ms before retry`,
              });
              await new Promise((resolve) =>
                setTimeout(resolve, error.retryAfter),
              );
              throw new RetryableError(
                `Rate limit exceeded, retried after ${error.retryAfter}ms`,
              );
            }
            if (error.status >= 500 || error.code === 'ECONNRESET') {
              throw new RetryableError(`Discord API error: ${error.message}`);
            }
            throw error;
          }
        },
        {
          maxAttempts: this.retryMaxAttempts,
          initialDelay: this.retryInitialDelay,
          maxDelay: this.retryMaxDelay,
          backoffFactor: this.retryBackoffFactor,
          retryableErrors: [RetryableError],
          onRetry: (attempt, error) => {
            this.logger.log({
              level: 'warn',
              message: `Retrying getUserGuilds (attempt ${attempt}): ${error.message}`,
            });
          },
        },
      );

      if (!guilds || guilds.length === 0) {
        this.logger.log({
          level: 'warn',
          message: `No guilds found for user: ${userId}`,
        });
        return [];
      }

      // Cache the result
      await this.redisService.set(cacheKey, JSON.stringify(guilds), cacheTtl);

      return guilds;
    } catch (error) {
      if ((error as any)?.name === 'ExecutionError') {
        this.logger.log({
          level: 'warn',
          message: `Lock acquisition failed for getUserGuilds, waiting for cache to be populated by another request`,
          userId,
        });

        const cachedData = await this.waitForCache<APIGuild[]>(
          cacheKey,
          startTime,
        );

        if (cachedData) {
          return cachedData;
        }

        this.logger.log({
          level: 'error',
          message: `Cache was not populated within timeout for getUserGuilds`,
          userId,
        });
        return [];
      }

      if (error instanceof UnauthorizedException) {
        this.logger.log({
          level: 'warn',
          message: `User authentication failed for userId: ${userId}`,
          error,
        });
        await this.redisService.set(
          cacheKey,
          JSON.stringify([]),
          this.getCacheTtl(this.errorCacheTtlLocal, this.errorCacheTtlProd),
        );
        throw error;
      }

      this.logger.log({
        level: 'error',
        message: `Failed to fetch user guilds for userId: ${userId}`,
        error,
      });
      return [];
    } finally {
      await lock?.release();
    }
  }

  async clearUserGuildIdsCache(userId: string) {
    const cacheKey = `user:${userId}:discord-guilds:data`;
    await this.redisService.del(cacheKey);
  }

  /**
   * Check if user's rate limit bucket has capacity for guild member requests
   * Used by background jobs to avoid consuming user's rate limit
   */
  async hasGuildMemberBucketCapacity(
    guildId: string,
    userId: string,
    threshold: number = 3,
  ): Promise<boolean> {
    const path = Routes.userGuildMember(guildId);
    return this.rateLimiter.hasBucketCapacity(path, userId, threshold);
  }

  async getGuildMember(options: {
    guildId: string;
    userId: string;
  }): Promise<APIGuildMember | null> {
    const cacheTtl = this.getCacheTtl(
      this.memberCacheTtlLocal,
      this.memberCacheTtlProd,
    );
    const { guildId, userId } = options;
    const cacheKey = `guild:${guildId}:member:${userId}:data`;
    const lockKey = `guild:${guildId}:member:${userId}:lock`;

    // Check cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed === null ? null : (parsed as APIGuildMember);
    }

    // Use Redlock to prevent multiple concurrent Discord API calls
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;
    const startTime = Date.now();

    try {
      // Try to acquire lock
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      // Double-check cache after acquiring lock (another request might have filled it)
      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        const parsed = JSON.parse(cachedAfterLock);
        return parsed === null ? null : (parsed as APIGuildMember);
      }

      const rest = await this.getRestClient(userId);
      const path = Routes.userGuildMember(guildId);

      // Check rate limit with userId for per-user tracking
      await this.rateLimiter.checkRateLimitForPath(path, userId);

      const member = await retry(
        async () => {
          try {
            return (await rest.get(path)) as APIGuildMember;
          } catch (error: any) {
            if (error.status === 404) {
              throw error;
            }
            if (error instanceof RateLimitError) {
              await this.rateLimiter.updateFromRateLimitError(
                path,
                {
                  retryAfter: error.retryAfter,
                  limit: error.limit,
                  hash: error.hash,
                  scope: error.scope,
                },
                userId,
              );
              this.logger.log({
                level: 'warn',
                message: `Rate limit hit for getGuildMember, waiting ${error.retryAfter}ms before retry`,
              });
              await new Promise((resolve) =>
                setTimeout(resolve, error.retryAfter),
              );
              throw new RetryableError(
                `Rate limit exceeded, retried after ${error.retryAfter}ms`,
              );
            }
            if (error.status >= 500 || error.code === 'ECONNRESET') {
              throw new RetryableError(`Discord API error: ${error.message}`);
            }
            throw error;
          }
        },
        {
          maxAttempts: this.retryMaxAttempts,
          initialDelay: this.retryInitialDelay,
          maxDelay: this.retryMaxDelay,
          backoffFactor: this.retryBackoffFactor,
          retryableErrors: [RetryableError],
          onRetry: (attempt, error) => {
            this.logger.log({
              level: 'warn',
              message: `Retrying getGuildMember (attempt ${attempt}): ${error.message}`,
            });
          },
        },
      );

      // Cache the result
      await this.redisService.set(cacheKey, JSON.stringify(member), cacheTtl);

      return member;
    } catch (error: any) {
      if (error?.name === 'ExecutionError') {
        this.logger.log({
          level: 'warn',
          message: `Lock acquisition failed for getGuildMember, waiting for cache to be populated by another request`,
          guildId,
          userId,
        });

        const cachedData = await this.waitForCache<APIGuildMember | null>(
          cacheKey,
          startTime,
        );

        if (cachedData !== null) {
          return cachedData;
        }

        this.logger.log({
          level: 'error',
          message: `Cache was not populated within timeout for getGuildMember`,
          guildId,
          userId,
        });
        return null;
      }

      if (error.status === 404) {
        this.logger.log({
          level: 'debug',
          message: `Guild member not found for guildId: ${guildId}, userId: ${userId}`,
        });
        await this.redisService.set(
          cacheKey,
          JSON.stringify(null),
          this.getCacheTtl(
            this.notFoundCacheTtlLocal,
            this.notFoundCacheTtlProd,
          ),
        );
        throw new NotFoundException();
      }

      if (error instanceof UnauthorizedException) {
        this.logger.log({
          level: 'warn',
          message: `User authentication failed for guildId: ${guildId}, userId: ${userId}`,
          error,
        });
        await this.redisService.set(
          cacheKey,
          JSON.stringify(null),
          this.getCacheTtl(this.errorCacheTtlLocal, this.errorCacheTtlProd),
        );
        throw error;
      }

      this.logger.log({
        level: 'error',
        message: `Failed to fetch guild member for guildId: ${guildId}, userId: ${userId}`,
        error,
      });

      return null;
    } finally {
      await lock?.release();
    }
  }
}
