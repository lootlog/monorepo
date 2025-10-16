import { REST, RateLimitError } from '@discordjs/rest';
import {
  Injectable,
  OnModuleInit,
  Logger,
  UnauthorizedException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
  private readonly logger = new Logger(DiscordService.name);
  private redlock: Redlock;
  private readonly lockTtl = 14000;
  private readonly requiredScopes = [
    'guilds.members.read',
    'guilds',
    'identify',
    'email',
  ];
  private isLocal: boolean;

  constructor(
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
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 1000,
      retryJitter: 200,
      automaticExtensionThreshold: 3000,
    });
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
        timeout: 5000,
        rejectOnRateLimit: ['/users'],
      }).setToken(token.accessToken);

      rest.on('response', async (request, response) => {
        try {
          const headers = {
            'x-ratelimit-bucket': response.headers.get('x-ratelimit-bucket'),
            'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
            'x-ratelimit-remaining': response.headers.get(
              'x-ratelimit-remaining',
            ),
            'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
            'x-ratelimit-scope': response.headers.get('x-ratelimit-scope'),
            'x-ratelimit-global': response.headers.get('x-ratelimit-global'),
          };

          await this.rateLimiter.updateFromHeaders(request.path, headers);
        } catch (error) {
          this.logger.error(
            'Failed to update rate limit from headers',
            (error as Error).stack,
          );
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
    const cacheTtl = this.isLocal ? 10 : 60 * 5; // 10s local, 5min prod
    const errorCacheTtl = this.isLocal ? 5 : 60; // 5s local, 1min prod
    const cacheKey = `user:${userId}:discord-guilds:data`;
    const lockKey = `user:${userId}:discord-guilds:lock`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as APIGuild[];
    }

    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        return JSON.parse(cachedAfterLock) as APIGuild[];
      }

      const rest = await this.getRestClient(userId);

      const path = Routes.userGuilds();
      await this.rateLimiter.checkRateLimitForPath(path);

      const guilds = await retry(
        async () => {
          try {
            return (await rest.get(path)) as APIGuild[];
          } catch (error: any) {
            if (error instanceof RateLimitError) {
              await this.rateLimiter.updateFromRateLimitError(path, {
                retryAfter: error.retryAfter,
                limit: error.limit,
                hash: error.hash,
              });
              throw error;
            }
            if (error.status >= 500 || error.code === 'ECONNRESET') {
              throw new RetryableError(`Discord API error: ${error.message}`);
            }
            throw error;
          }
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 5000,
          backoffFactor: 2,
          retryableErrors: [RetryableError],
          onRetry: (attempt, error) => {
            this.logger.warn(
              `Retrying getUserGuilds (attempt ${attempt}): ${error.message}`,
            );
          },
        },
      );

      if (!guilds || guilds.length === 0) {
        this.logger.warn(`No guilds found for user: ${userId}`);
        return [];
      }

      await this.redisService.set(cacheKey, JSON.stringify(guilds), cacheTtl);

      return guilds;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.warn(
          `User authentication failed for userId: ${userId}, caching empty result`,
          error,
        );
        await this.redisService.set(
          cacheKey,
          JSON.stringify([]),
          errorCacheTtl,
        );
        throw error;
      }

      this.logger.error(
        `Failed to fetch user guilds for userId: ${userId}`,
        error,
      );
      return [];
    } finally {
      await lock?.release();
      this.logger.debug(`Lock released: ${lockKey}`);
    }
  }

  async clearUserGuildIdsCache(userId: string) {
    const cacheKey = `user:${userId}:guilds:data`;

    await this.redisService.del(cacheKey);
  }

  async getGuildMember(options: {
    guildId: string;
    userId: string;
  }): Promise<APIGuildMember | null> {
    const cacheTtl = this.isLocal ? 10 : 300; // 10s local, 5min prod
    const staleCacheTtl = this.isLocal ? 60 : 3600; // 1min local, 1hr prod
    const errorCacheTtl = this.isLocal ? 5 : 60; // 5s local, 1min prod
    const { guildId, userId } = options;
    const cacheKey = `guild:${guildId}:member:${userId}:data`;
    const staleCacheKey = `guild:${guildId}:member:${userId}:stale`;
    const lockKey = `guild:${guildId}:member:${userId}:lock`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed === null ? null : (parsed as APIGuildMember);
    }

    const lock = await this.redlock.acquire([lockKey], this.lockTtl);

    try {
      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        const parsed = JSON.parse(cachedAfterLock);
        return parsed === null ? null : (parsed as APIGuildMember);
      }

      const rest = await this.getRestClient(userId);

      const path = Routes.userGuildMember(guildId);
      await this.rateLimiter.checkRateLimitForPath(path);

      const member = await retry(
        async () => {
          try {
            return (await rest.get(path)) as APIGuildMember;
          } catch (error: any) {
            if (error.status === 404) {
              throw error;
            }
            if (error instanceof RateLimitError) {
              await this.rateLimiter.updateFromRateLimitError(path, {
                retryAfter: error.retryAfter,
                limit: error.limit,
                hash: error.hash,
              });
              throw error;
            }
            if (error.status >= 500 || error.code === 'ECONNRESET') {
              throw new RetryableError(`Discord API error: ${error.message}`);
            }
            throw error;
          }
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 5000,
          backoffFactor: 2,
          retryableErrors: [RetryableError],
          onRetry: (attempt, error) => {
            this.logger.warn(
              `Retrying getGuildMember (attempt ${attempt}): ${error.message}`,
            );
          },
        },
      );

      await this.redisService.set(cacheKey, JSON.stringify(member), cacheTtl);
      await this.redisService.set(
        staleCacheKey,
        JSON.stringify(member),
        staleCacheTtl,
      );

      return member;
    } catch (error: any) {
      if (error.status === 404) {
        this.logger.debug(
          `Guild member not found for guildId: ${guildId}, userId: ${userId}`,
        );

        throw new NotFoundException();
      }

      if (error instanceof UnauthorizedException) {
        this.logger.warn(
          `User authentication failed for guildId: ${guildId}, userId: ${userId}, caching null result`,
          error,
        );
        await this.redisService.set(
          cacheKey,
          JSON.stringify(null),
          errorCacheTtl,
        );
        throw error;
      }

      this.logger.error(
        `Failed to fetch guild member for guildId: ${guildId}, userId: ${userId}`,
        error,
      );

      const staleData = await this.redisService.get(staleCacheKey);
      if (staleData) {
        this.logger.debug(
          `Returning stale cached data due to error for guildId: ${guildId}, userId: ${userId}`,
        );
        return JSON.parse(staleData) as APIGuildMember;
      }

      return null;
    } finally {
      await lock.release();
    }
  }
}
