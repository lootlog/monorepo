import { RateLimitError, RequestMethod, parseResponse } from "@discordjs/rest";
import {
  ApplicationError,
  ResourceNotFoundError,
  DependencyUnavailableError,
  AuthenticationRequiredError,
} from "#src/shared/http/http-errors";
import { RedisService } from "#src/redis/redis.service";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import { Routes, type APIGuildMember } from "discord-api-types/v10";
import { ExecutionError } from "redlock";
import { decodeJsonUnknown } from "#src/shared/schema/json";
import {
  getGuildMemberCacheKeys,
  getLegacyGuildMemberCacheKeys,
  isApiGuildMember,
  type DiscordGuildMemberCacheKeys,
} from "./discord-cache.util.js";
import { RedlockService } from "#src/lib/redlock/redlock.service";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service.js";
import {
  isDiscordNotFoundError,
  recordInvalidDiscordRequest,
  toDiscordRequestError,
  throwIfDiscordRateLimited,
} from "./discord-error.util.js";
import { DiscordRestClientFactory } from "./discord-rest-client.factory.js";
import { DiscordSyncDiagnosticsService } from "./discord-sync-diagnostics.service.js";

export class DiscordGuildMemberClient {
  private redlock: ReturnType<RedlockService["createInstance"]>;

  private readonly lockTtl = 6000;
  private readonly memberCacheTtlLocal = 10;
  private readonly memberCacheTtlProd = 300;
  private readonly errorCacheTtlLocal = 5;
  private readonly errorCacheTtlProd = 60;
  private readonly notFoundCacheTtlLocal = 30;
  private readonly notFoundCacheTtlProd = 300;
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
    const cacheKeys = getGuildMemberCacheKeys({ guildId, userId, discordId });
    const legacyCacheKeys = getLegacyGuildMemberCacheKeys({ guildId, userId });

    const cached = await this.getCachedMember(cacheKeys.data);
    if (cached) {
      return cached;
    }

    await this.replayNegativeCache(cacheKeys);

    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([cacheKeys.lock], this.lockTtl);

      const cachedAfterLock = await this.getCachedMember(cacheKeys.data);
      if (cachedAfterLock) {
        return cachedAfterLock;
      }

      await this.replayNegativeCache(cacheKeys);
      await throwIfDiscordRateLimited(this.rateLimiter, userId, "guild-member");

      const member = await this.fetchGuildMemberFromDiscord({
        guildId,
        userId,
        discordId,
      });

      await Promise.all([
        this.redisService.set(cacheKeys.data, JSON.stringify(member), cacheTtl),
        this.redisService.del(cacheKeys.notFound),
        this.redisService.del(cacheKeys.unauthorized),
        this.redisService.del(legacyCacheKeys.data),
        this.redisService.del(legacyCacheKeys.notFound),
        this.redisService.del(legacyCacheKeys.unauthorized),
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
        throw new DependencyUnavailableError({
          message: "DISCORD_MEMBER_LOCK_UNAVAILABLE",
        });
      }

      if (isDiscordNotFoundError(error)) {
        this.logger.log({
          level: "debug",
          message: `Guild member not found for guildId: ${guildId}, userId: ${userId}`,
        });
        await Promise.all([
          this.redisService.del(cacheKeys.data),
          this.redisService.del(legacyCacheKeys.data),
          this.redisService.del(cacheKeys.unauthorized),
          this.redisService.del(legacyCacheKeys.unauthorized),
          this.redisService.set(
            cacheKeys.notFound,
            "1",
            this.getCacheTtl(
              this.notFoundCacheTtlLocal,
              this.notFoundCacheTtlProd,
            ),
          ),
        ]);
        throw new ResourceNotFoundError();
      }

      if (error instanceof AuthenticationRequiredError) {
        this.logger.log({
          level: "warn",
          message: `User authentication failed for guildId: ${guildId}, userId: ${userId}`,
          error,
        });
        await Promise.all([
          this.redisService.del(cacheKeys.data),
          this.redisService.del(legacyCacheKeys.data),
          this.redisService.del(cacheKeys.notFound),
          this.redisService.del(legacyCacheKeys.notFound),
          this.redisService.set(
            cacheKeys.unauthorized,
            "1",
            this.getCacheTtl(this.errorCacheTtlLocal, this.errorCacheTtlProd),
          ),
        ]);
        throw error;
      }

      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.log({
        level: "error",
        message: `Failed to fetch guild member for guildId: ${guildId}, userId: ${userId}`,
        error,
      });

      throw toDiscordRequestError(error);
    } finally {
      await this.releaseLock(lock, {
        action: "getGuildMember",
        guildId,
        lockKey: cacheKeys.lock,
        userId,
      });
    }
  }

  async clearGuildMemberDataCache(options: {
    guildId: string;
    userId: string;
    discordId: string;
  }): Promise<void> {
    const { guildId, userId, discordId } = options;
    const cacheKeys = getGuildMemberCacheKeys({ guildId, userId, discordId });
    const legacyCacheKeys = getLegacyGuildMemberCacheKeys({ guildId, userId });

    await Promise.all([
      this.redisService.del(cacheKeys.data),
      this.redisService.del(cacheKeys.notFound),
      this.redisService.del(cacheKeys.unauthorized),
      this.redisService.del(legacyCacheKeys.data),
      this.redisService.del(legacyCacheKeys.notFound),
      this.redisService.del(legacyCacheKeys.unauthorized),
    ]);
  }

  private async fetchGuildMemberFromDiscord(options: {
    guildId: string;
    userId: string;
    discordId: string;
  }): Promise<APIGuildMember> {
    const { guildId, userId, discordId } = options;
    const rest = await this.restClientFactory.getRestClient(userId, discordId);
    const path = Routes.userGuildMember(guildId);

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

      const member = (await parseResponse(response)) as APIGuildMember;
      this.logger.log({
        level: "info",
        message: "Discord API returned member data",
        path,
      });

      return member;
    } catch (error: unknown) {
      await recordInvalidDiscordRequest(
        this.diagnostics,
        "guild-member",
        error,
      );

      if (isDiscordNotFoundError(error)) {
        throw error;
      }

      if (error instanceof RateLimitError) {
        await this.rateLimiter.setRateLimitForUser(
          userId,
          "guild-member",
          error.retryAfter,
        );
      }

      throw toDiscordRequestError(error);
    }
  }

  private async getCachedMember(
    cacheKey: string,
  ): Promise<APIGuildMember | null> {
    const cached = await this.redisService.get(cacheKey);

    if (!cached) {
      return null;
    }

    const cachedMember = this.parseCachedGuildMember(cached);
    if (cachedMember) {
      return cachedMember;
    }

    await this.redisService.del(cacheKey);
    return null;
  }

  private async replayNegativeCache(
    cacheKeys: Pick<DiscordGuildMemberCacheKeys, "notFound" | "unauthorized">,
  ): Promise<void> {
    if (await this.redisService.get(cacheKeys.notFound)) {
      throw new ResourceNotFoundError();
    }

    if (await this.redisService.get(cacheKeys.unauthorized)) {
      throw new AuthenticationRequiredError({
        message: "DISCORD_UNAUTHORIZED",
        requiresReauth: true,
      });
    }
  }

  private getCacheTtl(localTtl: number, prodTtl: number): number {
    return this.isLocal ? localTtl : prodTtl;
  }

  private parseCachedGuildMember(cached: string): APIGuildMember | null {
    try {
      const parsed = decodeJsonUnknown(cached);
      if (isApiGuildMember(parsed)) {
        return parsed;
      }
    } catch (error) {
      this.logger.log({
        level: "debug",
        message: "Failed to parse Discord guild member cache",
        error,
      });
    }

    return null;
  }

  private async releaseLock(
    lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null,
    context: {
      action: string;
      guildId: string;
      lockKey: string;
      userId: string;
    },
  ): Promise<void> {
    if (!lock) {
      return;
    }

    try {
      await lock.release();
    } catch (error) {
      this.logger.log({
        level: "debug",
        message: "Failed to release Discord member lock",
        action: context.action,
        guildId: context.guildId,
        lockKey: context.lockKey,
        userId: context.userId,
        error,
      });
    }
  }
}
