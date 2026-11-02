import {
  DiscordAPIError,
  RateLimitError,
  RequestMethod,
  parseResponse,
} from "@discordjs/rest";
import {
  ApplicationError,
  ResourceNotFoundError,
  AuthenticationRequiredError,
  DependencyUnavailableError,
  HttpStatus,
} from "#src/shared/http/http-errors";
import { RedisService } from "#src/redis/redis.service";
import type { ApplicationLogger as Logger } from "#src/shared/application-logger";
import { Routes, type APIGuildMember } from "discord-api-types/v10";
import {
  getGuildMemberForbiddenCacheKey,
  getGuildMemberNotFoundCacheKey,
  isApiGuildMember,
} from "./discord-cache.util.js";
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

/**
 * Reads the caller's own guild membership from Discord. Member sync stores
 * the result with its sync time and runs under the per-user refresh lock, so
 * every call asks Discord: a cached answer would be stored as a fresh sync.
 * Only refusals are cached: Discord counts each 404 and 403 against its
 * invalid-request limit, and neither is stored as a sync.
 */
export class DiscordGuildMemberClient {
  private readonly refusalCacheTtlLocal = 30;
  private readonly refusalCacheTtlProd = 300;
  private readonly isLocal: boolean;

  constructor(
    private readonly logger: Logger,
    private readonly redisService: RedisService,
    private readonly rateLimiter: DiscordRateLimiterService,
    private readonly diagnostics: DiscordSyncDiagnosticsService,
    private readonly restClientFactory: DiscordRestClientFactory,
    environment: RuntimeEnvironment,
  ) {
    this.isLocal = environment === RuntimeEnvironment.LOCAL;
  }

  async getGuildMember(options: {
    guildId: string;
    userId: string;
    discordId: string;
  }): Promise<APIGuildMember> {
    const { guildId, userId } = options;
    const notFoundKey = getGuildMemberNotFoundCacheKey(options);
    const forbiddenKey = getGuildMemberForbiddenCacheKey(options);

    const refusalCacheTtl = this.isLocal
      ? this.refusalCacheTtlLocal
      : this.refusalCacheTtlProd;

    try {
      if (await this.redisService.get(notFoundKey)) {
        throw new ResourceNotFoundError();
      }

      if (await this.redisService.get(forbiddenKey)) {
        throw discordForbiddenError();
      }

      await throwIfDiscordRateLimited(this.rateLimiter, userId, "guild-member");

      return await this.fetchGuildMemberFromDiscord(options);
    } catch (error: unknown) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }

      if (isDiscordNotFoundError(error)) {
        this.logger.log({
          level: "debug",
          message: `Guild member not found for guildId: ${guildId}, userId: ${userId}`,
        });
        await this.redisService.set(notFoundKey, "1", refusalCacheTtl);
        throw new ResourceNotFoundError();
      }

      if (
        error instanceof DiscordAPIError &&
        error.status === HttpStatus.FORBIDDEN
      ) {
        this.logger.log({
          level: "warn",
          message: "Discord refused the guild member request",
          guildId,
          userId,
          discordCode: error.code,
        });
        await this.redisService.set(forbiddenKey, "1", refusalCacheTtl);
        throw discordForbiddenError();
      }

      if (error instanceof AuthenticationRequiredError) {
        this.logger.log({
          level: "warn",
          message: `User authentication failed for guildId: ${guildId}, userId: ${userId}`,
          error,
        });
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
    }
  }

  async clearGuildMemberCache(options: {
    guildId: string;
    userId: string;
    discordId: string;
  }): Promise<void> {
    await Promise.all([
      this.redisService.del(getGuildMemberNotFoundCacheKey(options)),
      this.redisService.del(getGuildMemberForbiddenCacheKey(options)),
    ]);
  }

  private fetchGuildMemberFromDiscord(options: {
    guildId: string;
    userId: string;
    discordId: string;
  }): Promise<APIGuildMember> {
    const { guildId, userId, discordId } = options;
    const path = Routes.userGuildMember(guildId);

    return this.restClientFactory.withRestClient(
      userId,
      discordId,
      async (rest) => {
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

          const member = await parseResponse(response);

          if (!isApiGuildMember(member))
            throw new TypeError("Invalid Discord guild member response");
          this.logger.log({
            level: "debug",
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

          if (
            isDiscordNotFoundError(error) ||
            (error instanceof DiscordAPIError &&
              error.status === HttpStatus.FORBIDDEN)
          ) {
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
      },
    );
  }
}

// The shape toDiscordRequestError gives any Discord 4xx without its own error.
function discordForbiddenError(): DependencyUnavailableError {
  return new DependencyUnavailableError({
    message: "DISCORD_HTTP_ERROR",
    status: HttpStatus.FORBIDDEN,
  });
}
