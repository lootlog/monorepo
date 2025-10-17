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
import { ConfigKey } from 'src/config/config-key.enum';
import { ServiceConfig } from 'src/config/service.config';
import { RuntimeEnvironment } from 'src/types/runtime.types';

@Injectable()
export class DiscordService implements OnModuleInit {
  private redlock: Redlock;

  private readonly lockTtl = 6000;

  private readonly guildsCacheTtlLocal = 10;
  private readonly guildsCacheTtlProd = 300;
  private readonly memberCacheTtlLocal = 10;
  private readonly memberCacheTtlProd = 300;
  private readonly errorCacheTtlLocal = 5;
  private readonly errorCacheTtlProd = 60;
  private readonly notFoundCacheTtlLocal = 30;
  private readonly notFoundCacheTtlProd = 300;
  private readonly staleCacheTtl = 300;

  private readonly redlockDriftFactor = 0.01;
  private readonly redlockRetryCount = 3;
  private readonly redlockRetryDelay = 100;
  private readonly redlockRetryJitter = 50;
  private readonly redlockExtensionThreshold = 3000;

  private readonly restTimeout = 5000;

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
    const staleCacheKey = `user:${userId}:discord-guilds:stale`;
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

      const isRateLimited = await this.rateLimiter.checkRateLimitForUser(userId, 'guilds');

      if (isRateLimited) {
        const staleData = await this.redisService.get(staleCacheKey);
        if (staleData) {
          this.logger.log({
            level: 'info',
            message: `Returning stale guilds data due to rate limit for user ${userId}`,
          });
          return JSON.parse(staleData) as APIGuild[];
        }

        this.logger.log({
          level: 'warn',
          message: `Rate limited and no stale data available for user ${userId}`,
        });
        return [];
      }

      const rest = await this.getRestClient(userId);
      const path = Routes.userGuilds();

      let guilds: APIGuild[];
      try {
        guilds = (await rest.get(path)) as APIGuild[];
      } catch (error: any) {
        if (error instanceof RateLimitError) {
          await this.rateLimiter.setRateLimitForUser(userId, 'guilds', error.retryAfter);

          const staleData = await this.redisService.get(staleCacheKey);
          if (staleData) {
            this.logger.log({
              level: 'info',
              message: `Returning stale guilds data after rate limit error for user ${userId}`,
            });
            return JSON.parse(staleData) as APIGuild[];
          }

          throw error;
        }
        throw error;
      }

      if (!guilds || guilds.length === 0) {
        this.logger.log({
          level: 'warn',
          message: `No guilds found for user: ${userId}`,
        });
        return [];
      }

      await Promise.all([
        this.redisService.set(cacheKey, JSON.stringify(guilds), cacheTtl),
        this.redisService.set(staleCacheKey, JSON.stringify(guilds), this.staleCacheTtl),
      ]);

      return guilds;
    } catch (error) {
      if ((error as any)?.name === 'ExecutionError') {
        this.logger.log({
          level: 'error',
          message: `Lock acquisition failed for getUserGuilds`,
          userId,
        });
        return [];
      }

      if (error instanceof RateLimitError) {
        throw error;
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
    const staleCacheKey = `guild:${guildId}:member:${userId}:stale`;
    const lockKey = `guild:${guildId}:member:${userId}:lock`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed === null ? null : (parsed as APIGuildMember);
    }

    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        const parsed = JSON.parse(cachedAfterLock);
        return parsed === null ? null : (parsed as APIGuildMember);
      }

      const isRateLimited = await this.rateLimiter.checkRateLimitForUser(userId, 'guild-member');

      if (isRateLimited) {
        const staleData = await this.redisService.get(staleCacheKey);
        if (staleData) {
          const parsed = JSON.parse(staleData);
          this.logger.log({
            level: 'info',
            message: `Returning stale member data due to rate limit for guild ${guildId}, user ${userId}`,
          });
          return parsed === null ? null : (parsed as APIGuildMember);
        }

        this.logger.log({
          level: 'warn',
          message: `Rate limited and no stale data available for guild ${guildId}, user ${userId}`,
        });
        return null;
      }

      const rest = await this.getRestClient(userId);
      const path = Routes.userGuildMember(guildId);

      let member: APIGuildMember;
      try {
        member = (await rest.get(path)) as APIGuildMember;
        this.logger.log({
          level: 'info',
          message: 'Discord API returned member data',
          path,
        });
      } catch (error: any) {
        if (error.status === 404) {
          throw error;
        }
        if (error instanceof RateLimitError) {
          await this.rateLimiter.setRateLimitForUser(userId, 'guild-member', error.retryAfter);

          const staleData = await this.redisService.get(staleCacheKey);
          if (staleData) {
            const parsed = JSON.parse(staleData);
            this.logger.log({
              level: 'info',
              message: `Returning stale member data after rate limit error for guild ${guildId}, user ${userId}`,
            });
            return parsed === null ? null : (parsed as APIGuildMember);
          }

          throw error;
        }
        throw error;
      }

      await Promise.all([
        this.redisService.set(cacheKey, JSON.stringify(member), cacheTtl),
        this.redisService.set(staleCacheKey, JSON.stringify(member), this.staleCacheTtl),
      ]);

      return member;
    } catch (error: any) {
      if (error?.name === 'ExecutionError') {
        this.logger.log({
          level: 'error',
          message: `Lock acquisition failed for getGuildMember`,
          guildId,
          userId,
        });
        return null;
      }

      if (error instanceof RateLimitError) {
        throw error;
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
