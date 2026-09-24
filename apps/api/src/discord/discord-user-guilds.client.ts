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
import type { ApplicationLogger as Logger } from "#src/shared/application-logger";
import {
  Routes,
  type RESTGetAPICurrentUserGuildsResult,
} from "discord-api-types/v10";
import { ExecutionError, RedlockService } from "#src/redis/redlock";
import { Schema } from "effect";
import { decodeJsonUnknown } from "#src/shared/schema/json";

const decodeCompleteUserGuildsEntry = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({ guilds: Schema.Unknown, fetchedAt: Schema.Number }),
  ),
);

import {
  getCompleteUserGuildsCacheKey,
  getCompleteUserGuildsLockKey,
  getCompleteUserGuildsRequestKey,
  getLegacyUserGuildsCacheKeys,
  getUserGuildsCacheKey,
  getUserGuildsLockKey,
  isApiGuildArray,
} from "./discord-cache.util.js";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service.js";
import {
  recordInvalidDiscordRequest,
  toDiscordRequestError,
  throwIfDiscordRateLimited,
} from "./discord-error.util.js";
import { DiscordRestClientFactory } from "./discord-rest-client.factory.js";
import { DiscordSyncDiagnosticsService } from "./discord-sync-diagnostics.service.js";

export interface CompleteUserGuildsResult {
  guilds: RESTGetAPICurrentUserGuildsResult;
  /**
   * Discord returned the list within the last two seconds. A list served from
   * the long-lived cache may miss a server the user has joined since.
   */
  fresh: boolean;
}

interface CompleteUserGuildsEntry {
  guilds: RESTGetAPICurrentUserGuildsResult;
  fetchedAt: number;
}

export class DiscordUserGuildsClient {
  private redlock: ReturnType<RedlockService["createInstance"]>;

  private readonly lockTtl = 6000;
  private readonly userGuildsPageLimit = 200;
  private readonly guildsCacheTtlLocal = 10;
  private readonly guildsCacheTtlProd = 300;
  private readonly completeGuildsLockTtl = 15000;
  private readonly completeGuildsCacheTtlSeconds = 15 * 60;
  private readonly completeGuildsFreshMaxAgeMs = 2000;
  private readonly completeGuildsWaitMs = 1500;
  private readonly completeGuildsPollMs = 100;
  private readonly completeUserGuildRequests = new Map<
    string,
    Promise<CompleteUserGuildsEntry>
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

  async getUserGuilds(
    userId: string,
    discordId: string,
  ): Promise<RESTGetAPICurrentUserGuildsResult> {
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

  /**
   * Returns the complete list as Discord reported it within the last two
   * seconds, sharing one Discord request between concurrent callers.
   */
  getFreshCompleteUserGuilds(
    userId: string,
    discordId: string,
  ): Promise<CompleteUserGuildsResult> {
    return this.getCompleteUserGuilds(
      { userId, discordId },
      this.completeGuildsFreshMaxAgeMs,
    );
  }

  /**
   * Returns the complete list fetched within the last 15 minutes, asking
   * Discord only when none is cached.
   */
  getCachedCompleteUserGuilds(
    userId: string,
    discordId: string,
  ): Promise<CompleteUserGuildsResult> {
    return this.getCompleteUserGuilds(
      { userId, discordId },
      this.completeGuildsCacheTtlSeconds * 1000,
    );
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

  private async getCompleteUserGuilds(
    identity: { userId: string; discordId: string },
    maxAgeMs: number,
  ): Promise<CompleteUserGuildsResult> {
    const entry =
      (await this.getCompleteUserGuildsEntry(
        getCompleteUserGuildsCacheKey(identity),
        maxAgeMs,
      )) ?? (await this.fetchCompleteUserGuildsOnce(identity, maxAgeMs));

    return {
      guilds: entry.guilds,
      fresh: Date.now() - entry.fetchedAt <= this.completeGuildsFreshMaxAgeMs,
    };
  }

  private async fetchCompleteUserGuildsOnce(
    identity: { userId: string; discordId: string },
    maxAgeMs: number,
  ): Promise<CompleteUserGuildsEntry> {
    // A fresh caller must not reuse a lookup that accepts a cached list.
    const requestKey = `${getCompleteUserGuildsRequestKey(identity)}:${maxAgeMs}`;
    const inFlightRequest = this.completeUserGuildRequests.get(requestKey);

    if (inFlightRequest) {
      return inFlightRequest;
    }

    const request = this.fetchCompleteUserGuildsWithDistributedSingleFlight(
      identity,
      maxAgeMs,
    );

    this.completeUserGuildRequests.set(requestKey, request);

    try {
      return await request;
    } finally {
      if (this.completeUserGuildRequests.get(requestKey) === request) {
        this.completeUserGuildRequests.delete(requestKey);
      }
    }
  }

  private async fetchCompleteUserGuilds(
    userId: string,
    discordId: string,
  ): Promise<RESTGetAPICurrentUserGuildsResult> {
    try {
      return await this.fetchUserGuildsFromDiscord(userId, discordId);
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

  private async fetchCompleteUserGuildsWithDistributedSingleFlight(
    identity: { userId: string; discordId: string },
    maxAgeMs: number,
  ): Promise<CompleteUserGuildsEntry> {
    const { userId, discordId } = identity;
    const cacheKey = getCompleteUserGuildsCacheKey(identity);
    const lockKey = getCompleteUserGuildsLockKey(identity);
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.completeGuildsLockTtl);
    } catch (error) {
      if (error instanceof ExecutionError) {
        const waitedEntry = await this.waitForCompleteUserGuildsEntry(
          cacheKey,
          maxAgeMs,
        );

        if (waitedEntry) {
          return waitedEntry;
        }

        this.logger.log({
          level: "warn",
          message: "Complete guild lookup is already in progress",
          userId,
        });
        throw new DependencyUnavailableError({
          message: "DISCORD_GUILDS_SINGLE_FLIGHT_LOCK_UNAVAILABLE",
        });
      }

      throw error;
    }

    try {
      const entryAfterLock = await this.getCompleteUserGuildsEntry(
        cacheKey,
        maxAgeMs,
      );

      if (entryAfterLock) {
        return entryAfterLock;
      }

      const guilds = await this.fetchCompleteUserGuilds(userId, discordId);
      const entry = { guilds, fetchedAt: Date.now() };
      await this.redisService.set(
        cacheKey,
        JSON.stringify(entry),
        this.completeGuildsCacheTtlSeconds,
      );

      return entry;
    } finally {
      await this.releaseLock(lock, {
        action: "getCompleteUserGuilds",
        lockKey,
        userId,
      });
    }
  }

  private getCacheTtl(localTtl: number, prodTtl: number): number {
    return this.isLocal ? localTtl : prodTtl;
  }

  private async getCompleteUserGuildsEntry(
    key: string,
    maxAgeMs: number,
  ): Promise<CompleteUserGuildsEntry | null> {
    const cached = await this.redisService.get(key);

    if (!cached) {
      return null;
    }

    try {
      const parsed = decodeCompleteUserGuildsEntry(cached);

      if (isApiGuildArray(parsed.guilds)) {
        return Date.now() - parsed.fetchedAt <= maxAgeMs
          ? { guilds: parsed.guilds, fetchedAt: parsed.fetchedAt }
          : null;
      }
    } catch (error) {
      this.logger.log({
        level: "debug",
        message: "Failed to parse complete guild cache",
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
  ): Promise<RESTGetAPICurrentUserGuildsResult | null> {
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

  private async waitForCompleteUserGuildsEntry(
    key: string,
    maxAgeMs: number,
    deadline = Date.now() + this.completeGuildsWaitMs,
  ): Promise<CompleteUserGuildsEntry | null> {
    if (Date.now() >= deadline) {
      return null;
    }

    await sleep(this.completeGuildsPollMs);
    const entry = await this.getCompleteUserGuildsEntry(key, maxAgeMs);

    return (
      entry ?? this.waitForCompleteUserGuildsEntry(key, maxAgeMs, deadline)
    );
  }

  private async fetchUserGuildsFromDiscord(
    userId: string,
    discordId: string,
  ): Promise<RESTGetAPICurrentUserGuildsResult> {
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
    guilds: RESTGetAPICurrentUserGuildsResult = [],
  ): Promise<RESTGetAPICurrentUserGuildsResult> {
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
  ): Promise<RESTGetAPICurrentUserGuildsResult> {
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

      const guilds = await parseResponse(response);

      if (!isApiGuildArray(guilds))
        throw new TypeError("Invalid Discord guild list response");

      return guilds;
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
