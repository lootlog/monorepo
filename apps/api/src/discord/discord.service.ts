import {
  REST,
  RateLimitError,
  RequestMethod,
  parseResponse,
} from "@discordjs/rest";
import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleInit,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "src/auth/auth.service";
import {
  Routes,
  type APIGuild,
  type APIGuildMember,
} from "discord-api-types/v10";
import { ExecutionError } from "redlock";
import { RedisService } from "@lootlog/nest-shared";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service";
import { RedlockService } from "src/lib/redlock/redlock.service";
import {
  TokenExpiredError,
  AuthServiceUnavailableError,
  InvalidScopesError,
  AccountNotFoundError,
  AuthBadRequestError,
} from "src/auth/errors";
import { ConfigKey } from "src/config/config-key.enum";
import type { ServiceConfig } from "src/config/service.config";
import { RuntimeEnvironment } from "src/types/runtime.types";
import { DISCORD_AUTH_SCOPES } from "@lootlog/types";

@Injectable()
export class DiscordService implements OnModuleInit {
  private redlock: ReturnType<RedlockService["createInstance"]>;

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

  private readonly restTimeout = 5000;

  private isLocal: boolean;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
    private readonly rateLimiter: DiscordRateLimiterService,
    private readonly configService: ConfigService,
    private readonly redlockService: RedlockService,
  ) {
    const serviceConfig = this.configService.get<ServiceConfig>(
      ConfigKey.SERVICE,
    );
    this.isLocal = serviceConfig?.env === RuntimeEnvironment.LOCAL;
  }

  onModuleInit() {
    this.redlock = this.redlockService.createInstance({
      automaticExtensionThreshold: 3000,
    });
  }

  private getCacheTtl(localTtl: number, prodTtl: number): number {
    return this.isLocal ? localTtl : prodTtl;
  }

  async getRestClient(userId: string, discordId: string) {
    try {
      const token = await this.authService.getIdpToken(userId, discordId);

      if (!DISCORD_AUTH_SCOPES.every((scope) => token.scopes.includes(scope))) {
        throw new InvalidScopesError(DISCORD_AUTH_SCOPES, token.scopes);
      }

      const rest = new REST({
        version: "10",
        authPrefix: "Bearer",
        timeout: this.restTimeout,
        rejectOnRateLimit: ["/users"],
      }).setToken(token.accessToken);

      return rest;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException({
          message: "TOKEN_EXPIRED",
          requiresReauth: true,
        });
      }

      if (error instanceof AccountNotFoundError) {
        throw new UnauthorizedException({
          message: "ACCOUNT_NOT_FOUND",
          requiresReauth: true,
        });
      }

      if (error instanceof InvalidScopesError) {
        throw new UnauthorizedException({
          message: "INVALID_SCOPES",
          required: error.required,
          actual: error.actual,
        });
      }

      if (error instanceof AuthBadRequestError) {
        throw new BadRequestException({
          message: "AUTH_BAD_REQUEST",
        });
      }

      if (error instanceof AuthServiceUnavailableError) {
        throw new ServiceUnavailableException({
          message: "AUTH_SERVICE_UNAVAILABLE",
          retryAfter: 60,
        });
      }

      throw error;
    }
  }

  async getUserGuilds(userId: string, discordId: string): Promise<APIGuild[]> {
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

      const isRateLimited = await this.rateLimiter.checkRateLimitForUser(
        userId,
        "guilds",
      );

      if (isRateLimited) {
        const staleData = await this.redisService.get(staleCacheKey);
        if (staleData) {
          this.logger.log({
            level: "info",
            message: `Returning stale guilds data due to rate limit for user ${userId}`,
          });
          return JSON.parse(staleData) as APIGuild[];
        }

        this.logger.log({
          level: "warn",
          message: `Rate limited and no stale data available for user ${userId}`,
        });
        return [];
      }

      const rest = await this.getRestClient(userId, discordId);
      const path = Routes.userGuilds();

      let guilds: APIGuild[];
      try {
        const response = await rest.queueRequest({
          fullRoute: path,
          method: RequestMethod.Get,
        });
        await this.rateLimiter.updateRateLimitFromHeaders(
          userId,
          "guilds",
          response.headers,
        );
        guilds = (await parseResponse(response)) as APIGuild[];
      } catch (error: unknown) {
        if (error instanceof RateLimitError) {
          await this.rateLimiter.setRateLimitForUser(
            userId,
            "guilds",
            error.retryAfter,
          );

          const staleData = await this.redisService.get(staleCacheKey);
          if (staleData) {
            this.logger.log({
              level: "info",
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
          level: "warn",
          message: `No guilds found for user: ${userId}`,
        });
        return [];
      }

      await Promise.all([
        this.redisService.set(cacheKey, JSON.stringify(guilds), cacheTtl),
        this.redisService.set(
          staleCacheKey,
          JSON.stringify(guilds),
          this.staleCacheTtl,
        ),
      ]);

      return guilds;
    } catch (error: unknown) {
      if (error instanceof ExecutionError) {
        this.logger.log({
          level: "error",
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
          level: "warn",
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
        level: "error",
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
    discordId: string;
  }): Promise<APIGuildMember | null> {
    const cacheTtl = this.getCacheTtl(
      this.memberCacheTtlLocal,
      this.memberCacheTtlProd,
    );
    const { guildId, userId, discordId } = options;
    const cacheKey = `guild:${guildId}:member:${userId}:data`;
    const staleCacheKey = `guild:${guildId}:member:${userId}:stale`;
    const lockKey = `guild:${guildId}:member:${userId}:lock`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed as APIGuildMember | null;
    }

    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        const parsed = JSON.parse(cachedAfterLock);
        return parsed as APIGuildMember | null;
      }

      const isRateLimited = await this.rateLimiter.checkRateLimitForUser(
        userId,
        "guild-member",
      );

      if (isRateLimited) {
        const staleData = await this.redisService.get(staleCacheKey);
        if (staleData) {
          const parsed = JSON.parse(staleData);
          this.logger.log({
            level: "info",
            message: `Returning stale member data due to rate limit for guild ${guildId}, user ${userId}`,
          });
          return parsed as APIGuildMember | null;
        }

        this.logger.log({
          level: "warn",
          message: `Rate limited and no stale data available for guild ${guildId}, user ${userId}`,
        });
        return null;
      }

      const rest = await this.getRestClient(userId, discordId);
      const path = Routes.userGuildMember(guildId);

      let member: APIGuildMember;
      try {
        const response = await rest.queueRequest({
          fullRoute: path,
          method: RequestMethod.Get,
        });
        await this.rateLimiter.updateRateLimitFromHeaders(
          userId,
          "guild-member",
          response.headers,
        );
        member = (await parseResponse(response)) as APIGuildMember;
        this.logger.log({
          level: "info",
          message: "Discord API returned member data",
          path,
        });
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          error.status === 404
        ) {
          throw error;
        }

        if (error instanceof RateLimitError) {
          await this.rateLimiter.setRateLimitForUser(
            userId,
            "guild-member",
            error.retryAfter,
          );

          const staleData = await this.redisService.get(staleCacheKey);
          if (staleData) {
            const parsed = JSON.parse(staleData);
            this.logger.log({
              level: "info",
              message: `Returning stale member data after rate limit error for guild ${guildId}, user ${userId}`,
            });
            return parsed as APIGuildMember | null;
          }

          throw error;
        }
        throw error;
      }

      await Promise.all([
        this.redisService.set(cacheKey, JSON.stringify(member), cacheTtl),
        this.redisService.set(
          staleCacheKey,
          JSON.stringify(member),
          this.staleCacheTtl,
        ),
      ]);

      return member;
    } catch (error: unknown) {
      if (error instanceof ExecutionError) {
        this.logger.log({
          level: "error",
          message: `Lock acquisition failed for getGuildMember`,
          guildId,
          userId,
        });
        return null;
      }

      if (error instanceof RateLimitError) {
        throw error;
      }

      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 404
      ) {
        this.logger.log({
          level: "debug",
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
          level: "warn",
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
        level: "error",
        message: `Failed to fetch guild member for guildId: ${guildId}, userId: ${userId}`,
        error,
      });

      return null;
    } finally {
      await lock?.release();
    }
  }
}
