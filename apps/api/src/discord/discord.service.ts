import { REST } from '@discordjs/rest';
import {
  Injectable,
  OnModuleInit,
  Logger,
  UnauthorizedException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Routes, APIGuild, APIGuildMember } from 'discord-api-types/v10';
import { RedisService } from 'src/lib/redis/redis.service';
import Redlock from 'redlock';
import {
  TokenExpiredError,
  AuthServiceUnavailableError,
  InvalidScopesError,
} from 'src/auth/errors';
import { retry, RetryableError } from 'src/lib/retry/retry.util';

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

  constructor(
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

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

      if (
        !this.requiredScopes.every((scope) => token.scopes.includes(scope))
      ) {
        throw new InvalidScopesError(this.requiredScopes, token.scopes);
      }

      return new REST({
        version: '10',
        authPrefix: 'Bearer',
        timeout: 5000,
        rejectOnRateLimit: ['/users'],
      }).setToken(token.accessToken);
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
    const cacheTtl = 60 * 5; // 5 minutes
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

      const guilds = await retry(
        async () => {
          try {
            return (await rest.get(Routes.userGuilds())) as APIGuild[];
          } catch (error: any) {
            if (error.status >= 500 || error.code === 'ECONNRESET') {
              throw new RetryableError(
                `Discord API error: ${error.message}`,
              );
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
    const cacheTtl = 60; // 1 minute
    const { guildId, userId } = options;
    const cacheKey = `guild:${guildId}:member:${userId}:data`;
    const lockKey = `guild:${guildId}:member:${userId}:lock`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as APIGuildMember;
    }

    const lock = await this.redlock.acquire([lockKey], this.lockTtl);

    try {
      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        return JSON.parse(cachedAfterLock) as APIGuildMember;
      }

      const rest = await this.getRestClient(userId);

      const member = await retry(
        async () => {
          try {
            return (await rest.get(
              Routes.userGuildMember(guildId),
            )) as APIGuildMember;
          } catch (error: any) {
            if (error.status === 404) {
              throw error;
            }
            if (error.status >= 500 || error.code === 'ECONNRESET') {
              throw new RetryableError(
                `Discord API error: ${error.message}`,
              );
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

      return member;
    } catch (error: any) {
      if (error.status === 404) {
        this.logger.debug(
          `Guild member not found for guildId: ${guildId}, userId: ${userId}`,
        );

        throw new NotFoundException();
      }

      this.logger.error(
        `Failed to fetch guild member for guildId: ${guildId}, userId: ${userId}`,
        error,
      );
      return null;
    } finally {
      await lock.release();
    }
  }
}
