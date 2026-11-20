import {
  DiscordAPIError,
  RateLimitError,
  RequestMethod,
  parseResponse,
} from "@discordjs/rest";
import {
  ApplicationError,
  ResourceNotFoundError,
  DependencyUnavailableError,
  HttpStatus,
} from "@lootlog/protocol/http/errors";
import type { RedisService } from "#src/redis/redis.service";
import { Routes, type APIGuildMember } from "discord-api-types/v10";
import { Effect } from "effect";
import type { RedisError } from "effect/persistence/Redis";
import {
  getGuildMemberForbiddenCacheKey,
  getGuildMemberNotFoundCacheKey,
  isApiGuildMember,
} from "./discord-cache.util.js";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import type { DiscordRateLimiter } from "./discord-rate-limiter.service.js";
import {
  failIfDiscordRateLimited,
  isDiscordNotFoundError,
  recordInvalidDiscordRequest,
  toDiscordRequestError,
} from "./discord-error.util.js";
import type { DiscordRestClients } from "./discord-rest-client.factory.js";
import type { DiscordSyncDiagnostics } from "./discord-sync-diagnostics.service.js";

const REFUSAL_CACHE_TTL_LOCAL_SECONDS = 30;

const REFUSAL_CACHE_TTL_PROD_SECONDS = 300;

interface GuildMemberIdentity {
  readonly guildId: string;
  readonly userId: string;
  readonly discordId: string;
}

/**
 * Reads the caller's own guild membership from Discord. Member sync stores
 * the result with its sync time and runs under the per-user refresh lock, so
 * every call asks Discord: a cached answer would be stored as a fresh sync.
 * Only refusals are cached: Discord counts each 404 and 403 against its
 * invalid-request limit, and neither is stored as a sync.
 */
export interface DiscordGuildMemberClient {
  readonly getGuildMember: (
    options: GuildMemberIdentity,
  ) => Effect.Effect<APIGuildMember, ApplicationError | RedisError>;
  /** Discord refused this member recently, so asking again would be refused. */
  readonly isGuildMemberRefused: (
    options: GuildMemberIdentity,
  ) => Effect.Effect<boolean, RedisError>;
  readonly clearGuildMemberCache: (
    options: GuildMemberIdentity,
  ) => Effect.Effect<void, RedisError>;
}

const isDiscordForbidden = (error: unknown): error is DiscordAPIError =>
  error instanceof DiscordAPIError && error.status === HttpStatus.FORBIDDEN;

// The shape toDiscordRequestError gives any Discord 4xx without its own error.
const discordForbiddenError = (): DependencyUnavailableError =>
  new DependencyUnavailableError({
    code: "DISCORD_HTTP_ERROR",
    details: { status: HttpStatus.FORBIDDEN },
  });

export const makeDiscordGuildMemberClient = (dependencies: {
  readonly redis: Pick<RedisService, "get" | "set" | "del">;
  readonly rateLimiter: DiscordRateLimiter;
  readonly diagnostics: Pick<
    DiscordSyncDiagnostics,
    "recordInvalidDiscordRequest"
  >;
  readonly restClients: DiscordRestClients;
  readonly environment: RuntimeEnvironment;
}): DiscordGuildMemberClient => {
  const { redis, rateLimiter, diagnostics, restClients } = dependencies;

  const refusalCacheTtl =
    dependencies.environment === RuntimeEnvironment.LOCAL
      ? REFUSAL_CACHE_TTL_LOCAL_SECONDS
      : REFUSAL_CACHE_TTL_PROD_SECONDS;

  const fetchGuildMemberFromDiscord = ({
    guildId,
    userId,
    discordId,
  }: GuildMemberIdentity) => {
    const path = Routes.userGuildMember(guildId);

    return restClients.withRestClient(userId, discordId, (rest) =>
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: () =>
            rest.queueRequest({
              fullRoute: path,
              method: RequestMethod.Get,
            }),
          catch: (error) => error,
        });

        yield* rateLimiter.updateRateLimitFromHeaders(
          userId,
          "guild-member",
          response.headers,
        );

        const member = yield* Effect.tryPromise({
          try: () => parseResponse(response),
          catch: (error) => error,
        });

        if (!isApiGuildMember(member))
          return yield* Effect.fail(
            new TypeError("Invalid Discord guild member response"),
          );

        yield* Effect.logDebug({
          message: "Discord API returned member data",
          path,
        });

        return member;
      }).pipe(
        Effect.catch((error) =>
          Effect.gen(function* () {
            yield* recordInvalidDiscordRequest(
              diagnostics,
              "guild-member",
              error,
            );

            if (isDiscordNotFoundError(error) || isDiscordForbidden(error)) {
              return yield* Effect.fail(error);
            }

            if (error instanceof RateLimitError) {
              yield* rateLimiter.setRateLimitForUser(
                userId,
                "guild-member",
                error.retryAfter,
              );
            }

            return yield* Effect.fail(toDiscordRequestError(error));
          }),
        ),
      ),
    );
  };

  return {
    getGuildMember: (options) => {
      const { guildId, userId } = options;
      const notFoundKey = getGuildMemberNotFoundCacheKey(options);
      const forbiddenKey = getGuildMemberForbiddenCacheKey(options);

      return Effect.gen(function* () {
        if (yield* redis.get(notFoundKey)) {
          return yield* Effect.fail(new ResourceNotFoundError());
        }

        if (yield* redis.get(forbiddenKey)) {
          return yield* Effect.fail(discordForbiddenError());
        }

        yield* failIfDiscordRateLimited(rateLimiter, userId, "guild-member");

        return yield* fetchGuildMemberFromDiscord(options);
      }).pipe(
        Effect.catch((error) =>
          Effect.gen(function* () {
            if (error instanceof ResourceNotFoundError) {
              return yield* Effect.fail(error);
            }

            if (isDiscordNotFoundError(error)) {
              yield* Effect.logDebug({
                message: `Guild member not found for guildId: ${guildId}, userId: ${userId}`,
              });
              yield* redis.set(notFoundKey, "1", refusalCacheTtl);

              return yield* Effect.fail(new ResourceNotFoundError());
            }

            if (isDiscordForbidden(error)) {
              yield* Effect.logWarning({
                message: "Discord refused the guild member request",
                guildId,
                userId,
                discordCode: error.code,
              });
              yield* redis.set(forbiddenKey, "1", refusalCacheTtl);

              return yield* Effect.fail(discordForbiddenError());
            }

            if (error instanceof ApplicationError) {
              return yield* Effect.fail(error);
            }

            yield* Effect.logError({
              message: `Failed to fetch guild member for guildId: ${guildId}, userId: ${userId}`,
              error,
            });

            return yield* Effect.fail(toDiscordRequestError(error));
          }),
        ),
      );
    },
    isGuildMemberRefused: (options) =>
      redis
        .get(getGuildMemberForbiddenCacheKey(options))
        .pipe(Effect.map(Boolean)),
    clearGuildMemberCache: (options) =>
      Effect.all(
        [
          redis.del(getGuildMemberNotFoundCacheKey(options)),
          redis.del(getGuildMemberForbiddenCacheKey(options)),
        ],
        { concurrency: "unbounded", discard: true },
      ),
  };
};
