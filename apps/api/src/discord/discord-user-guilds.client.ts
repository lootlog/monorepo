import {
  RateLimitError,
  RequestMethod,
  parseResponse,
  type REST,
} from "@discordjs/rest";
import { setTimeout as sleep } from "node:timers/promises";
import {
  ApplicationError,
  DependencyUnavailableError,
  AuthenticationRequiredError,
} from "#src/shared/http/http-errors";
import { RedisService } from "#src/redis/redis.service";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import { Routes, type APIGuild } from "discord-api-types/v10";
import { ExecutionError } from "redlock";
import { Schema } from "effect";
import { decodeJsonUnknown } from "#src/shared/schema/json";

const decodeFreshCompleteHandoff = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      guilds: Schema.Unknown,
      fresh: Schema.Literal(true),
      complete: Schema.Literal(true),
    }),
  ),
);
import {
  getFreshCompleteUserGuildsHandoffKey,
  getFreshCompleteUserGuildsLockKey,
  getFreshCompleteUserGuildsRequestKey,
  getLegacyUserGuildsCacheKeys,
  getUserGuildsCacheKey,
  getUserGuildsLockKey,
  isApiGuildArray,
} from "./discord-cache.util.js";
import { RedlockService } from "#src/lib/redlock/redlock.service";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service.js";
import {
  recordInvalidDiscordRequest,
  toDiscordRequestError,
  throwIfDiscordRateLimited,
} from "./discord-error.util.js";
import { DiscordRestClientFactory } from "./discord-rest-client.factory.js";
import { DiscordSyncDiagnosticsService } from "./discord-sync-diagnostics.service.js";

export interface FreshCompleteUserGuildsResult {
  guilds: APIGuild[];
  fresh: true;
  complete: true;
}

export class DiscordUserGuildsClient {
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
    private readonly logger: Logger,
    private readonly redisService: RedisService,
    private readonly rateLimiter: DiscordRateLimiterService,
    private readonly redlockService: RedlockService,
    private readonly diagnostics: DiscordSyncDiagnosticsService,
    private readonly restClientFactory: DiscordRestClientFactory,
    environment: RuntimeEnvironment,
  ) {
    this.isLocal = environment === RuntimeEnvironment.LOCAL;
  }

  initialize() {
    this.redlock = this.redlockService.createInstance({
      automaticExtensionThreshold: 3000,
    });
  }

  async getUserGuilds(userId: string, discordId: string): Promise<APIGuild[]> {
    const cacheTtl = this.getCacheTtl(
      this.guildsCacheTtlLocal,
      this.guildsCacheTtlProd,
    );
    const identity = { userId, discordId };
    const cacheKey = getUserGuildsCacheKey(identity);
    const lockKey = getUserGuildsLockKey(identity);

    const cached = await this.getCachedUserGuilds(cacheKey, userId);
    if (cached) {
      return cached;
    }

    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const cachedAfterLock = await this.getCachedUserGuilds(cacheKey, userId);
      if (cachedAfterLock) {
        return cachedAfterLock;
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
        throw new DependencyUnavailableError({
          message: "DISCORD_GUILDS_LOCK_UNAVAILABLE",
        });
      }

      if (error instanceof AuthenticationRequiredError) {
        this.logger.log({
          level: "warn",
          message: `User authentication failed for userId: ${userId}`,
          error,
        });
        throw error;
      }

      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.log({
        level: "error",
        message: `Failed to fetch user guilds for userId: ${userId}`,
        error,
      });
      throw toDiscordRequestError(error);
    } finally {
      await this.releaseLock(lock, {
        action: "getUserGuilds",
        lockKey,
        userId,
      });
    }
  }

  async getFreshCompleteUserGuilds(
    userId: string,
    discordId: string,
  ): Promise<FreshCompleteUserGuildsResult> {
    const identity = { userId, discordId };
    const requestKey = getFreshCompleteUserGuildsRequestKey(identity);
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

  async clearUserGuildIdsCache(options: {
    userId: string;
    discordId: string;
  }): Promise<void> {
    const { userId, discordId } = options;

    await Promise.all([
      this.redisService.del(getUserGuildsCacheKey({ userId, discordId })),
      ...getLegacyUserGuildsCacheKeys(userId).map((key) =>
        this.redisService.del(key),
      ),
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
      if (error instanceof AuthenticationRequiredError) {
        this.logger.log({
          level: "warn",
          message: `User authentication failed for userId: ${userId}`,
          error,
        });
        throw error;
      }

      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.log({
        level: "error",
        message: `Failed to fetch fresh user guilds for userId: ${userId}`,
        error,
      });
      throw toDiscordRequestError(error);
    }
  }

  private async fetchFreshCompleteUserGuildsWithDistributedSingleFlight(
    userId: string,
    discordId: string,
  ): Promise<FreshCompleteUserGuildsResult> {
    const identity = { userId, discordId };
    const handoffKey = getFreshCompleteUserGuildsHandoffKey(identity);
    const lockKey = getFreshCompleteUserGuildsLockKey(identity);
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
        throw new DependencyUnavailableError({
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
      await this.releaseLock(lock, {
        action: "getFreshCompleteUserGuilds",
        lockKey,
        userId,
      });
    }
  }

  private getCacheTtl(localTtl: number, prodTtl: number): number {
    return this.isLocal ? localTtl : prodTtl;
  }

  private async getFreshCompleteUserGuildsHandoff(
    key: string,
  ): Promise<FreshCompleteUserGuildsResult | null> {
    const cached = await this.redisService.get(key);

    if (!cached) {
      return null;
    }

    try {
      const parsed = decodeFreshCompleteHandoff(cached);
      if (isApiGuildArray(parsed.guilds)) {
        return { guilds: parsed.guilds, fresh: true, complete: true };
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

  private async getCachedUserGuilds(
    cacheKey: string,
    userId: string,
  ): Promise<APIGuild[] | null> {
    const cached = await this.redisService.get(cacheKey);
    if (!cached) {
      return null;
    }

    try {
      const parsed = decodeJsonUnknown(cached);
      if (isApiGuildArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      this.logger.log({
        level: "debug",
        message: "Failed to parse Discord guilds cache",
        userId,
        cacheKey,
        error,
      });
    }

    await this.redisService.del(cacheKey);
    return null;
  }

  private async releaseLock(
    lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null,
    context: { action: string; lockKey: string; userId: string },
  ): Promise<void> {
    if (!lock) {
      return;
    }

    try {
      await lock.release();
    } catch (error) {
      this.logger.log({
        level: "debug",
        message: "Failed to release Discord guilds lock",
        action: context.action,
        lockKey: context.lockKey,
        userId: context.userId,
        error,
      });
    }
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
      throw new DependencyUnavailableError({
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

      throw toDiscordRequestError(error);
    }
  }
}
