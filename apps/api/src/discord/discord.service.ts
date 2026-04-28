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
  HttpException,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleInit,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { AuthService } from "src/auth/auth.service";
import {
  Routes,
  type APIGuild,
  type APIGuildMember,
} from "discord-api-types/v10";
import { ExecutionError } from "redlock";
import { RedisService } from "@lootlog/nest-shared/redis";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service";
import {
  DiscordSyncDiagnosticsService,
  type DiscordInvalidRequestEndpoint,
  type DiscordInvalidRequestStatus,
} from "./discord-sync-diagnostics.service";
import { RedlockService } from "src/lib/redlock/redlock.service";
import {
  TokenExpiredError,
  AuthServiceUnavailableError,
  InvalidScopesError,
  AccountNotFoundError,
  AuthBadRequestError,
} from "src/auth/errors";
import { serviceConfig } from "src/config/service.config";
import { RuntimeEnvironment } from "src/types/runtime.types";
import { DISCORD_AUTH_SCOPES } from "@lootlog/types";

export interface FreshCompleteUserGuildsResult {
  guilds: APIGuild[];
  fresh: true;
  complete: true;
}

@Injectable()
export class DiscordService implements OnModuleInit {
  private redlock: ReturnType<RedlockService["createInstance"]>;

  private readonly lockTtl = 6000;
  private readonly userGuildsPageLimit = 200;

  private readonly guildsCacheTtlLocal = 10;
  private readonly guildsCacheTtlProd = 300;
  private readonly memberCacheTtlLocal = 10;
  private readonly memberCacheTtlProd = 300;
  private readonly errorCacheTtlLocal = 5;
  private readonly errorCacheTtlProd = 60;
  private readonly notFoundCacheTtlLocal = 30;
  private readonly notFoundCacheTtlProd = 300;
  private readonly freshCompleteGuildsLockTtl = 15000;
  private readonly freshCompleteGuildsHandoffTtlSeconds = 2;
  private readonly freshCompleteGuildsHandoffWaitMs = 1500;
  private readonly freshCompleteGuildsHandoffPollMs = 100;
  private readonly freshCompleteUserGuildRequests = new Map<
    string,
    Promise<FreshCompleteUserGuildsResult>
  >();

  private readonly restTimeout = 5000;

  private isLocal: boolean;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
    private readonly rateLimiter: DiscordRateLimiterService,
    private readonly redlockService: RedlockService,
    private readonly diagnostics: DiscordSyncDiagnosticsService,
  ) {
    this.isLocal = serviceConfig.env === RuntimeEnvironment.LOCAL;
  }

  onModuleInit() {
    this.redlock = this.redlockService.createInstance({
      automaticExtensionThreshold: 3000,
    });
  }

  private getCacheTtl(localTtl: number, prodTtl: number): number {
    return this.isLocal ? localTtl : prodTtl;
  }

  private isNotFoundStatus(error: unknown): boolean {
    return this.getHttpStatus(error) === HttpStatus.NOT_FOUND;
  }

  private getHttpStatus(error: unknown): number | null {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    return typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
      ? error.status
      : null;
  }

  private createRateLimitException(retryAfterMs?: number): HttpException {
    const retryAfterSeconds =
      retryAfterMs === undefined ? undefined : Math.ceil(retryAfterMs / 1000);

    return new HttpException(
      {
        message: "DISCORD_RATE_LIMITED",
        retryAfter: retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private toDiscordRequestException(error: unknown): Error {
    if (error instanceof RateLimitError) {
      return this.createRateLimitException(error.retryAfter);
    }

    if (error instanceof HttpException) {
      return error;
    }

    const status = this.getHttpStatus(error);
    if (status === HttpStatus.UNAUTHORIZED) {
      return new UnauthorizedException({
        message: "DISCORD_UNAUTHORIZED",
        requiresReauth: true,
      });
    }

    if (status === HttpStatus.NOT_FOUND) {
      return new NotFoundException();
    }

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      return this.createRateLimitException();
    }

    if (status !== null && status >= 500) {
      return new ServiceUnavailableException({
        message: "DISCORD_SERVICE_UNAVAILABLE",
        status,
      });
    }

    if (status !== null) {
      return new HttpException(
        {
          message: "DISCORD_HTTP_ERROR",
          status,
        },
        status,
      );
    }

    return new ServiceUnavailableException({
      message: "DISCORD_REQUEST_FAILED",
    });
  }

  private async throwIfRateLimited(
    userId: string,
    endpoint: string,
  ): Promise<void> {
    const isRateLimited = await this.rateLimiter.checkRateLimitForUser(
      userId,
      endpoint,
    );

    if (!isRateLimited) {
      return;
    }

    const nextAvailableAt = await this.rateLimiter.getNextAvailableAtForUser(
      userId,
      endpoint,
    );
    const retryAfterMs = nextAvailableAt
      ? Math.max(nextAvailableAt.getTime() - Date.now(), 0)
      : undefined;

    throw this.createRateLimitException(retryAfterMs);
  }

  private parseCachedGuildMember(cached: string): APIGuildMember | null {
    const parsed = JSON.parse(cached) as APIGuildMember | null;
    return parsed ?? null;
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
    const cacheKey = this.getUserGuildsCacheKey(userId);
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

      const guilds = await this.fetchUserGuildsFromDiscord(userId, discordId);

      await this.redisService.set(cacheKey, JSON.stringify(guilds), cacheTtl);

      return guilds;
    } catch (error: unknown) {
      if (error instanceof ExecutionError) {
        this.logger.log({
          level: "error",
          message: `Lock acquisition failed for getUserGuilds`,
          userId,
        });
        throw new ServiceUnavailableException({
          message: "DISCORD_GUILDS_LOCK_UNAVAILABLE",
        });
      }

      if (error instanceof UnauthorizedException) {
        this.logger.log({
          level: "warn",
          message: `User authentication failed for userId: ${userId}`,
          error,
        });
        throw error;
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.log({
        level: "error",
        message: `Failed to fetch user guilds for userId: ${userId}`,
        error,
      });
      throw this.toDiscordRequestException(error);
    } finally {
      await lock?.release();
    }
  }

  async getFreshCompleteUserGuilds(
    userId: string,
    discordId: string,
  ): Promise<FreshCompleteUserGuildsResult> {
    const requestKey = this.getFreshCompleteUserGuildsRequestKey(
      userId,
      discordId,
    );
    const inFlightRequest = this.freshCompleteUserGuildRequests.get(requestKey);

    if (inFlightRequest) {
      return inFlightRequest;
    }

    const request =
      this.fetchFreshCompleteUserGuildsWithDistributedSingleFlight(
        userId,
        discordId,
      );
    this.freshCompleteUserGuildRequests.set(requestKey, request);

    try {
      return await request;
    } finally {
      if (this.freshCompleteUserGuildRequests.get(requestKey) === request) {
        this.freshCompleteUserGuildRequests.delete(requestKey);
      }
    }
  }

  private async fetchFreshCompleteUserGuilds(
    userId: string,
    discordId: string,
  ): Promise<FreshCompleteUserGuildsResult> {
    try {
      const guilds = await this.fetchUserGuildsFromDiscord(userId, discordId);

      return {
        guilds,
        fresh: true,
        complete: true,
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        this.logger.log({
          level: "warn",
          message: `User authentication failed for userId: ${userId}`,
          error,
        });
        throw error;
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.log({
        level: "error",
        message: `Failed to fetch fresh user guilds for userId: ${userId}`,
        error,
      });
      throw this.toDiscordRequestException(error);
    }
  }

  private async fetchFreshCompleteUserGuildsWithDistributedSingleFlight(
    userId: string,
    discordId: string,
  ): Promise<FreshCompleteUserGuildsResult> {
    const handoffKey = this.getFreshCompleteUserGuildsHandoffKey(
      userId,
      discordId,
    );
    const lockKey = this.getFreshCompleteUserGuildsLockKey(userId, discordId);
    const cachedHandoff =
      await this.getFreshCompleteUserGuildsHandoff(handoffKey);

    if (cachedHandoff) {
      return cachedHandoff;
    }

    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire(
        [lockKey],
        this.freshCompleteGuildsLockTtl,
      );
    } catch (error) {
      if (error instanceof ExecutionError) {
        const waitedHandoff =
          await this.waitForFreshCompleteUserGuildsHandoff(handoffKey);

        if (waitedHandoff) {
          return waitedHandoff;
        }

        this.logger.log({
          level: "warn",
          message: "Fresh complete guild lookup is already in progress",
          userId,
        });
        throw new ServiceUnavailableException({
          message: "DISCORD_GUILDS_SINGLE_FLIGHT_LOCK_UNAVAILABLE",
        });
      }

      throw error;
    }

    try {
      const handoffAfterLock =
        await this.getFreshCompleteUserGuildsHandoff(handoffKey);

      if (handoffAfterLock) {
        return handoffAfterLock;
      }

      const result = await this.fetchFreshCompleteUserGuilds(userId, discordId);
      await this.redisService.set(
        handoffKey,
        JSON.stringify(result),
        this.freshCompleteGuildsHandoffTtlSeconds,
      );

      return result;
    } finally {
      await lock?.release();
    }
  }

  async clearUserGuildIdsCache(userId: string) {
    await Promise.all([
      this.redisService.del(this.getUserGuildsCacheKey(userId)),
      this.redisService.del(`user:${userId}:discord-guilds:data`),
    ]);
  }

  async clearGuildMemberDataCache(options: {
    guildId: string;
    userId: string;
  }): Promise<void> {
    const { guildId, userId } = options;

    await this.redisService.del(`guild:${guildId}:member:${userId}:data`);
  }

  private getUserGuildsCacheKey(userId: string): string {
    return `user:${userId}:discord-guilds:v2:data`;
  }

  private getFreshCompleteUserGuildsRequestKey(
    userId: string,
    discordId: string,
  ): string {
    return `user:${userId}:discord:${discordId}:fresh-complete-guilds`;
  }

  private getFreshCompleteUserGuildsLockKey(
    userId: string,
    discordId: string,
  ): string {
    return `${this.getFreshCompleteUserGuildsRequestKey(userId, discordId)}:lock`;
  }

  private getFreshCompleteUserGuildsHandoffKey(
    userId: string,
    discordId: string,
  ): string {
    return `${this.getFreshCompleteUserGuildsRequestKey(userId, discordId)}:handoff`;
  }

  private async getFreshCompleteUserGuildsHandoff(
    key: string,
  ): Promise<FreshCompleteUserGuildsResult | null> {
    const cached = await this.redisService.get(key);

    if (!cached) {
      return null;
    }

    try {
      const parsed = JSON.parse(cached) as FreshCompleteUserGuildsResult;
      if (
        parsed.fresh === true &&
        parsed.complete === true &&
        Array.isArray(parsed.guilds)
      ) {
        return parsed;
      }
    } catch (error) {
      this.logger.log({
        level: "debug",
        message: "Failed to parse fresh complete guild handoff cache",
        key,
        error,
      });
    }

    await this.redisService.del(key);
    return null;
  }

  private async waitForFreshCompleteUserGuildsHandoff(
    key: string,
  ): Promise<FreshCompleteUserGuildsResult | null> {
    const deadline = Date.now() + this.freshCompleteGuildsHandoffWaitMs;

    while (Date.now() < deadline) {
      await this.sleep(this.freshCompleteGuildsHandoffPollMs);

      const handoff = await this.getFreshCompleteUserGuildsHandoff(key);
      if (handoff) {
        return handoff;
      }
    }

    return null;
  }

  private async fetchUserGuildsFromDiscord(
    userId: string,
    discordId: string,
  ): Promise<APIGuild[]> {
    await this.throwIfRateLimited(userId, "guilds");

    const rest = await this.getRestClient(userId, discordId);
    const guilds = await this.fetchUserGuildPages(userId, rest);

    if (guilds.length === 0) {
      this.logger.log({
        level: "warn",
        message: `No guilds found for user: ${userId}`,
      });
    }

    return guilds;
  }

  private async fetchUserGuildPages(
    userId: string,
    rest: REST,
    after?: string,
    guilds: APIGuild[] = [],
  ): Promise<APIGuild[]> {
    const page = await this.fetchUserGuildsPage(userId, rest, after);
    guilds.push(...page);

    if (page.length < this.userGuildsPageLimit) {
      return guilds;
    }

    const lastGuild = page[page.length - 1];
    if (!lastGuild || lastGuild.id === after) {
      throw new ServiceUnavailableException({
        message: "DISCORD_GUILDS_PAGINATION_INCOMPLETE",
      });
    }

    return this.fetchUserGuildPages(userId, rest, lastGuild.id, guilds);
  }

  private async fetchUserGuildsPage(
    userId: string,
    rest: REST,
    after?: string,
  ): Promise<APIGuild[]> {
    const path = Routes.userGuilds();
    const query = new URLSearchParams({
      limit: this.userGuildsPageLimit.toString(),
    });

    if (after) {
      query.set("after", after);
    }

    try {
      const response = await rest.queueRequest({
        fullRoute: path,
        method: RequestMethod.Get,
        query,
      });
      await this.rateLimiter.updateRateLimitFromHeaders(
        userId,
        "guilds",
        response.headers,
      );

      return (await parseResponse(response)) as APIGuild[];
    } catch (error: unknown) {
      await this.recordInvalidDiscordRequest("guilds", error);

      if (error instanceof RateLimitError) {
        await this.rateLimiter.setRateLimitForUser(
          userId,
          "guilds",
          error.retryAfter,
        );
      }

      throw this.toDiscordRequestException(error);
    }
  }

  async getGuildMember(options: {
    guildId: string;
    userId: string;
    discordId: string;
  }): Promise<APIGuildMember> {
    const cacheTtl = this.getCacheTtl(
      this.memberCacheTtlLocal,
      this.memberCacheTtlProd,
    );
    const { guildId, userId, discordId } = options;
    const cacheKey = `guild:${guildId}:member:${userId}:data`;
    const notFoundCacheKey = `guild:${guildId}:member:${userId}:not-found`;
    const unauthorizedCacheKey = `guild:${guildId}:member:${userId}:unauthorized`;
    const lockKey = `guild:${guildId}:member:${userId}:lock`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      const cachedMember = this.parseCachedGuildMember(cached);
      if (cachedMember) {
        return cachedMember;
      }

      await this.redisService.del(cacheKey);
    }

    // Negative cache replays definitive Discord answers. A cached `null` would
    // be ambiguous with rate limits and transient failures.
    if (await this.redisService.get(notFoundCacheKey)) {
      throw new NotFoundException();
    }

    if (await this.redisService.get(unauthorizedCacheKey)) {
      throw new UnauthorizedException({
        message: "DISCORD_UNAUTHORIZED",
        requiresReauth: true,
      });
    }

    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        const cachedMember = this.parseCachedGuildMember(cachedAfterLock);
        if (cachedMember) {
          return cachedMember;
        }

        await this.redisService.del(cacheKey);
      }

      if (await this.redisService.get(notFoundCacheKey)) {
        throw new NotFoundException();
      }

      if (await this.redisService.get(unauthorizedCacheKey)) {
        throw new UnauthorizedException({
          message: "DISCORD_UNAUTHORIZED",
          requiresReauth: true,
        });
      }

      await this.throwIfRateLimited(userId, "guild-member");

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
        await this.recordInvalidDiscordRequest("guild-member", error);

        if (this.isNotFoundStatus(error)) {
          throw error;
        }

        if (error instanceof RateLimitError) {
          await this.rateLimiter.setRateLimitForUser(
            userId,
            "guild-member",
            error.retryAfter,
          );
        }

        throw this.toDiscordRequestException(error);
      }

      await Promise.all([
        this.redisService.set(cacheKey, JSON.stringify(member), cacheTtl),
        this.redisService.del(notFoundCacheKey),
        this.redisService.del(unauthorizedCacheKey),
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
        throw new ServiceUnavailableException({
          message: "DISCORD_MEMBER_LOCK_UNAVAILABLE",
        });
      }

      if (this.isNotFoundStatus(error)) {
        this.logger.log({
          level: "debug",
          message: `Guild member not found for guildId: ${guildId}, userId: ${userId}`,
        });
        await Promise.all([
          this.redisService.del(cacheKey),
          this.redisService.set(
            notFoundCacheKey,
            "1",
            this.getCacheTtl(
              this.notFoundCacheTtlLocal,
              this.notFoundCacheTtlProd,
            ),
          ),
        ]);
        throw new NotFoundException();
      }

      if (error instanceof UnauthorizedException) {
        this.logger.log({
          level: "warn",
          message: `User authentication failed for guildId: ${guildId}, userId: ${userId}`,
          error,
        });
        await Promise.all([
          this.redisService.del(cacheKey),
          this.redisService.set(
            unauthorizedCacheKey,
            "1",
            this.getCacheTtl(this.errorCacheTtlLocal, this.errorCacheTtlProd),
          ),
        ]);
        throw error;
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.log({
        level: "error",
        message: `Failed to fetch guild member for guildId: ${guildId}, userId: ${userId}`,
        error,
      });

      throw this.toDiscordRequestException(error);
    } finally {
      await lock?.release();
    }
  }

  private async recordInvalidDiscordRequest(
    endpoint: DiscordInvalidRequestEndpoint,
    error: unknown,
  ): Promise<void> {
    const status = this.getInvalidRequestStatus(error);

    if (status === null) {
      return;
    }

    await this.diagnostics.recordInvalidDiscordRequest({
      endpoint,
      status,
      source: "discord-service",
    });
  }

  private getInvalidRequestStatus(
    error: unknown,
  ): DiscordInvalidRequestStatus | null {
    if (error instanceof RateLimitError) {
      return 429;
    }

    const status = this.getHttpStatus(error);
    if (status === HttpStatus.UNAUTHORIZED) {
      return 401;
    }

    if (status === HttpStatus.FORBIDDEN) {
      return 403;
    }

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      return 429;
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
