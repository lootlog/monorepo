import { RateLimitError, RequestMethod, parseResponse } from "@discordjs/rest";
import {
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  type OnModuleInit,
} from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { Routes, type APIGuildMember } from "discord-api-types/v10";
import { ExecutionError } from "redlock";
import { serviceConfig } from "src/config/service.config";
import { RedlockService } from "src/lib/redlock/redlock.service";
import { RuntimeEnvironment } from "src/types/runtime.types";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service";
import {
  isDiscordNotFoundError,
  recordInvalidDiscordRequest,
  toDiscordRequestException,
  throwIfDiscordRateLimited,
} from "./discord-error.util";
import { DiscordRestClientFactory } from "./discord-rest-client.factory";
import { DiscordSyncDiagnosticsService } from "./discord-sync-diagnostics.service";

@Injectable()
export class DiscordGuildMemberClient implements OnModuleInit {
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

    const cached = await this.getCachedMember(cacheKey);
    if (cached) {
      return cached;
    }

    await this.replayNegativeCache(notFoundCacheKey, unauthorizedCacheKey);

    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const cachedAfterLock = await this.getCachedMember(cacheKey);
      if (cachedAfterLock) {
        return cachedAfterLock;
      }

      await this.replayNegativeCache(notFoundCacheKey, unauthorizedCacheKey);
      await throwIfDiscordRateLimited(this.rateLimiter, userId, "guild-member");

      const member = await this.fetchGuildMemberFromDiscord({
        guildId,
        userId,
        discordId,
      });

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

      if (isDiscordNotFoundError(error)) {
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

      throw toDiscordRequestException(error);
    } finally {
      await lock?.release();
    }
  }

  async clearGuildMemberDataCache(options: {
    guildId: string;
    userId: string;
  }): Promise<void> {
    const { guildId, userId } = options;

    await this.redisService.del(`guild:${guildId}:member:${userId}:data`);
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

      throw toDiscordRequestException(error);
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
    notFoundCacheKey: string,
    unauthorizedCacheKey: string,
  ): Promise<void> {
    if (await this.redisService.get(notFoundCacheKey)) {
      throw new NotFoundException();
    }

    if (await this.redisService.get(unauthorizedCacheKey)) {
      throw new UnauthorizedException({
        message: "DISCORD_UNAUTHORIZED",
        requiresReauth: true,
      });
    }
  }

  private getCacheTtl(localTtl: number, prodTtl: number): number {
    return this.isLocal ? localTtl : prodTtl;
  }

  private parseCachedGuildMember(cached: string): APIGuildMember | null {
    const parsed = JSON.parse(cached) as APIGuildMember | null;
    return parsed ?? null;
  }
}
