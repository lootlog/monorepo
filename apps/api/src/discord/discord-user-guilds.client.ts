import {
  RateLimitError,
  RequestMethod,
  parseResponse,
  type REST,
} from "@discordjs/rest";
import { setTimeout as sleep } from "node:timers/promises";
import {
  HttpException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  type OnModuleInit,
} from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { Routes, type APIGuild } from "discord-api-types/v10";
import { ExecutionError } from "redlock";
import { serviceConfig } from "src/config/service.config";
import { RedlockService } from "src/lib/redlock/redlock.service";
import { RuntimeEnvironment } from "src/types/runtime.types";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service";
import {
  recordInvalidDiscordRequest,
  toDiscordRequestException,
  throwIfDiscordRateLimited,
} from "./discord-error.util";
import { DiscordRestClientFactory } from "./discord-rest-client.factory";
import { DiscordSyncDiagnosticsService } from "./discord-sync-diagnostics.service";

export interface FreshCompleteUserGuildsResult {
  guilds: APIGuild[];
  fresh: true;
  complete: true;
}

@Injectable()
export class DiscordUserGuildsClient implements OnModuleInit {
  private redlock: ReturnType<RedlockService["createInstance"]>;

  private readonly lockTtl = 6000;
  private readonly userGuildsPageLimit = 200;
  private readonly guildsCacheTtlLocal = 10;
  private readonly guildsCacheTtlProd = 300;
  private readonly freshCompleteGuildsLockTtl = 15000;
  private readonly freshCompleteGuildsHandoffTtlSeconds = 2;
  private readonly freshCompleteGuildsHandoffWaitMs = 1500;
  private readonly freshCompleteGuildsHandoffPollMs = 100;
  private readonly freshCompleteUserGuildRequests = new Map<
    string,
    Promise<FreshCompleteUserGuildsResult>
  >();
  private readonly isLocal: boolean;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redisService: RedisService,
    private readonly rateLimiter: DiscordRateLimiterService,
    private readonly redlockService: RedlockService,
    private readonly diagnostics: DiscordSyncDiagnosticsService,
    private readonly restClientFactory: DiscordRestClientFactory,
  ) {
    this.isLocal = serviceConfig.env === RuntimeEnvironment.LOCAL;
  }

  onModuleInit() {
    this.redlock = this.redlockService.createInstance({
      automaticExtensionThreshold: 3000,
    });
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
      throw toDiscordRequestException(error);
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

  async clearUserGuildIdsCache(userId: string): Promise<void> {
    await Promise.all([
      this.redisService.del(this.getUserGuildsCacheKey(userId)),
      this.redisService.del(`user:${userId}:discord-guilds:data`),
    ]);
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
      throw toDiscordRequestException(error);
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

  private getCacheTtl(localTtl: number, prodTtl: number): number {
    return this.isLocal ? localTtl : prodTtl;
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
    deadline = Date.now() + this.freshCompleteGuildsHandoffWaitMs,
  ): Promise<FreshCompleteUserGuildsResult | null> {
    if (Date.now() >= deadline) {
      return null;
    }

    await sleep(this.freshCompleteGuildsHandoffPollMs);
    const handoff = await this.getFreshCompleteUserGuildsHandoff(key);

    return handoff ?? this.waitForFreshCompleteUserGuildsHandoff(key, deadline);
  }

  private async fetchUserGuildsFromDiscord(
    userId: string,
    discordId: string,
  ): Promise<APIGuild[]> {
    await throwIfDiscordRateLimited(this.rateLimiter, userId, "guilds");

    const rest = await this.restClientFactory.getRestClient(userId, discordId);
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
      await recordInvalidDiscordRequest(this.diagnostics, "guilds", error);

      if (error instanceof RateLimitError) {
        await this.rateLimiter.setRateLimitForUser(
          userId,
          "guilds",
          error.retryAfter,
        );
      }

      throw toDiscordRequestException(error);
    }
  }
}
