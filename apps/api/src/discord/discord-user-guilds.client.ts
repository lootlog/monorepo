import {
  RateLimitError,
  RequestMethod,
  parseResponse,
  type REST,
} from "@discordjs/rest";
import {
  ApplicationError,
  DependencyUnavailableError,
  AuthenticationRequiredError,
} from "@lootlog/protocol/http/errors";
import type { RedisService } from "#src/redis/redis.service";
import {
  Routes,
  type RESTGetAPICurrentUserGuildsResult,
} from "discord-api-types/v10";
import type { LockRetry, RedisLockManager } from "#src/redis/redlock";
import { Clock, Deferred, Effect, Option, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { RedisError } from "effect/persistence/Redis";
import { decodeJsonUnknownEffect } from "#src/shared/schema/json";
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
import type { DiscordRateLimiter } from "./discord-rate-limiter.service.js";
import {
  discordRest,
  DiscordRestFailure,
  failIfDiscordRateLimited,
  recordInvalidDiscordRequest,
  toDiscordRequestError,
} from "./discord-error.util.js";
import type { DiscordRestClients } from "./discord-rest-client.factory.js";
import type { DiscordSyncDiagnostics } from "./discord-sync-diagnostics.service.js";

const decodeCompleteUserGuildsEntry = Schema.decodeUnknownEffect(
  Schema.fromJsonString(
    Schema.Struct({ guilds: Schema.Unknown, fetchedAt: Schema.Finite }),
  ),
);

interface CompleteUserGuildsResult {
  guilds: RESTGetAPICurrentUserGuildsResult;
  fresh: boolean;
  stale: boolean;
}

interface CompleteUserGuildsEntry {
  guilds: RESTGetAPICurrentUserGuildsResult;
  fetchedAt: number;
}

interface UserIdentity {
  readonly userId: string;
  readonly discordId: string;
}

type DiscordGuildsError = ApplicationError | RedisError;

export interface DiscordUserGuildsClient {
  readonly getUserGuilds: (
    userId: string,
    discordId: string,
  ) => Effect.Effect<RESTGetAPICurrentUserGuildsResult, DiscordGuildsError>;
  readonly getFreshCompleteUserGuilds: (
    userId: string,
    discordId: string,
  ) => Effect.Effect<CompleteUserGuildsResult, DiscordGuildsError>;
  readonly getCachedCompleteUserGuilds: (
    userId: string,
    discordId: string,
  ) => Effect.Effect<CompleteUserGuildsResult, DiscordGuildsError>;
  readonly clearUserGuildIdsCache: (
    identity: UserIdentity,
  ) => Effect.Effect<void, RedisError>;
}

const LOCK_TTL_MS = 6000;

const USER_GUILDS_PAGE_LIMIT = 200;

const GUILDS_CACHE_TTL_LOCAL_SECONDS = 10;

const GUILDS_CACHE_TTL_PROD_SECONDS = 300;

const COMPLETE_GUILDS_LOCK_TTL_MS = 15000;

const COMPLETE_GUILDS_MAX_AGE_MS = 15 * 60 * 1000;

const COMPLETE_GUILDS_STALE_TTL_SECONDS = 24 * 60 * 60;

const COMPLETE_GUILDS_FRESH_MAX_AGE_MS = 2000;

const LOCK_WAIT: LockRetry = {
  retryCount: 3,
  retryDelay: 100,
  retryJitter: 50,
};

const COMPLETE_GUILDS_LOCK_WAIT: LockRetry = {
  retryCount: 18,
  retryDelay: 100,
  retryJitter: 0,
};

class GuildsLockUnavailable extends TaggedErrorClass<
  GuildsLockUnavailable,
  { readonly brand: unique symbol }
>()("GuildsLockUnavailable", {}) {}

const toCompleteUserGuildsResult = (
  entry: CompleteUserGuildsEntry,
): Effect.Effect<CompleteUserGuildsResult> =>
  Effect.map(Clock.currentTimeMillis, (now) => {
    const age = now - entry.fetchedAt;

    return {
      guilds: entry.guilds,
      fresh: age <= COMPLETE_GUILDS_FRESH_MAX_AGE_MS,
      stale: age > COMPLETE_GUILDS_MAX_AGE_MS,
    };
  });

export const makeDiscordUserGuildsClient = (dependencies: {
  readonly redis: Pick<RedisService, "get" | "set" | "del">;
  readonly rateLimiter: DiscordRateLimiter;
  readonly locks: Pick<RedisLockManager, "singleFlight">;
  readonly diagnostics: Pick<
    DiscordSyncDiagnostics,
    "recordInvalidDiscordRequest"
  >;
  readonly restClients: DiscordRestClients;
  readonly environment: RuntimeEnvironment;
}): DiscordUserGuildsClient => {
  const { redis, rateLimiter, locks, diagnostics, restClients } = dependencies;

  const guildsCacheTtl =
    dependencies.environment === RuntimeEnvironment.LOCAL
      ? GUILDS_CACHE_TTL_LOCAL_SECONDS
      : GUILDS_CACHE_TTL_PROD_SECONDS;

  const completeUserGuildRequests = new Map<
    string,
    Deferred.Deferred<CompleteUserGuildsEntry, DiscordGuildsError>
  >();

  const fetchUserGuildsPage = (userId: string, rest: REST, after?: string) => {
    const query = new URLSearchParams({
      limit: USER_GUILDS_PAGE_LIMIT.toString(),
    });

    if (after) {
      query.set("after", after);
    }

    return Effect.gen(function* () {
      const response = yield* discordRest(() =>
        rest.queueRequest({
          fullRoute: Routes.userGuilds(),
          method: RequestMethod.Get,
          query,
        }),
      );

      yield* rateLimiter.updateRateLimitFromHeaders(
        userId,
        "guilds",
        response.headers,
      );

      const guilds = yield* discordRest(() => parseResponse(response));

      if (!isApiGuildArray(guilds))
        return yield* new DiscordRestFailure({
          cause: new TypeError("Invalid Discord guild list response"),
        });

      return guilds;
    }).pipe(
      Effect.catch((error) =>
        Effect.gen(function* () {
          const cause =
            error instanceof DiscordRestFailure ? error.cause : error;

          yield* recordInvalidDiscordRequest(diagnostics, "guilds", cause);

          if (cause instanceof RateLimitError) {
            yield* rateLimiter.setRateLimitForUser(
              userId,
              "guilds",
              cause.retryAfter,
            );
          }

          return yield* toDiscordRequestError(cause);
        }),
      ),
    );
  };

  const fetchUserGuildPages = (userId: string, rest: REST) =>
    Effect.gen(function* () {
      const guilds: RESTGetAPICurrentUserGuildsResult = [];
      let after: string | undefined;

      while (true) {
        const page = yield* fetchUserGuildsPage(userId, rest, after);
        guilds.push(...page);

        if (page.length < USER_GUILDS_PAGE_LIMIT) {
          return guilds;
        }

        const lastGuild = page[page.length - 1];

        if (!lastGuild || lastGuild.id === after) {
          return yield* new DependencyUnavailableError({
            code: "DISCORD_GUILDS_PAGINATION_INCOMPLETE",
          });
        }

        after = lastGuild.id;
      }
    });

  const fetchUserGuildsFromDiscord = (userId: string, discordId: string) =>
    Effect.gen(function* () {
      yield* failIfDiscordRateLimited(rateLimiter, userId, "guilds");

      const guilds = yield* restClients.withRestClient(
        userId,
        discordId,
        (rest) => fetchUserGuildPages(userId, rest),
      );

      if (guilds.length === 0) {
        yield* Effect.logWarning({
          message: `No guilds found for user: ${userId}`,
        });
      }

      return guilds;
    });

  const getCachedUserGuilds = (cacheKey: string, userId: string) =>
    Effect.gen(function* () {
      const cached = yield* redis.get(cacheKey);

      if (!cached) {
        return null;
      }

      const parsed = yield* decodeJsonUnknownEffect(cached).pipe(
        Effect.catch((error) =>
          Effect.logDebug({
            message: "Failed to parse Discord guilds cache",
            userId,
            cacheKey,
            error,
          }),
        ),
      );

      if (isApiGuildArray(parsed)) {
        return parsed;
      }

      yield* redis.del(cacheKey);

      return null;
    });

  const getCompleteUserGuildsEntry = (key: string, maxAgeMs: number) =>
    Effect.gen(function* () {
      const cached = yield* redis.get(key);

      if (!cached) {
        return null;
      }

      const parsed = yield* decodeCompleteUserGuildsEntry(cached).pipe(
        Effect.catch((error) =>
          Effect.as(
            Effect.logDebug({
              message: "Failed to parse complete guild cache",
              key,
              error,
            }),
            null,
          ),
        ),
      );

      if (parsed && isApiGuildArray(parsed.guilds)) {
        const now = yield* Clock.currentTimeMillis;

        return now - parsed.fetchedAt <= maxAgeMs
          ? { guilds: parsed.guilds, fetchedAt: parsed.fetchedAt }
          : null;
      }

      yield* redis.del(key);

      return null;
    });

  const failUnavailable = (
    message: string,
    level: "error" | "warn",
    userId: string,
    code: string,
  ) =>
    (level === "error" ? Effect.logError : Effect.logWarning)({
      message,
      userId,
    }).pipe(
      Effect.andThen(Effect.fail(new DependencyUnavailableError({ code }))),
    );

  const fetchCompleteUserGuilds = (userId: string, discordId: string) =>
    fetchUserGuildsFromDiscord(userId, discordId).pipe(
      Effect.catch((error) => {
        if (error instanceof AuthenticationRequiredError) {
          return Effect.logWarning({
            message: `User authentication failed for userId: ${userId}`,
            error,
          }).pipe(Effect.andThen(Effect.fail(error)));
        }

        if (error instanceof ApplicationError) {
          return Effect.fail(error);
        }

        return Effect.logError({
          message: `Failed to fetch fresh user guilds for userId: ${userId}`,
          error,
        }).pipe(Effect.andThen(Effect.fail(toDiscordRequestError(error))));
      }),
    );

  const fetchCompleteUserGuildsWithDistributedSingleFlight = (
    identity: UserIdentity,
    maxAgeMs: number,
  ): Effect.Effect<CompleteUserGuildsEntry, DiscordGuildsError> => {
    const { userId, discordId } = identity;
    const cacheKey = getCompleteUserGuildsCacheKey(identity);

    return locks
      .singleFlight(
        {
          resource: getCompleteUserGuildsLockKey(identity),
          duration: COMPLETE_GUILDS_LOCK_TTL_MS,
          wait: COMPLETE_GUILDS_LOCK_WAIT,
          unavailable: () => new GuildsLockUnavailable(),
        },
        getCompleteUserGuildsEntry(cacheKey, maxAgeMs).pipe(
          Effect.map(Option.fromNullishOr),
        ),
        Effect.gen(function* () {
          const guilds = yield* fetchCompleteUserGuilds(userId, discordId);
          const entry = { guilds, fetchedAt: yield* Clock.currentTimeMillis };

          yield* redis.set(
            cacheKey,
            JSON.stringify(entry),
            COMPLETE_GUILDS_STALE_TTL_SECONDS,
          );

          return entry;
        }),
      )
      .pipe(
        Effect.catchTag("GuildsLockUnavailable", () =>
          failUnavailable(
            "Complete guild lookup is already in progress",
            "warn",
            userId,
            "DISCORD_GUILDS_SINGLE_FLIGHT_LOCK_UNAVAILABLE",
          ),
        ),
      );
  };

  const fetchCompleteUserGuildsOnce = (
    identity: UserIdentity,
    maxAgeMs: number,
  ) =>
    Effect.uninterruptibleMask((restore) =>
      Effect.suspend(() => {
        const requestKey = `${getCompleteUserGuildsRequestKey(identity)}:${maxAgeMs}`;
        const inFlightRequest = completeUserGuildRequests.get(requestKey);

        if (inFlightRequest) {
          return restore(Deferred.await(inFlightRequest));
        }

        const request = Deferred.makeUnsafe<
          CompleteUserGuildsEntry,
          DiscordGuildsError
        >();

        completeUserGuildRequests.set(requestKey, request);

        return fetchCompleteUserGuildsWithDistributedSingleFlight(
          identity,
          maxAgeMs,
        ).pipe(
          Effect.onExit((exit) =>
            Effect.sync(() => {
              if (completeUserGuildRequests.get(requestKey) === request) {
                completeUserGuildRequests.delete(requestKey);
              }
            }).pipe(Effect.andThen(Deferred.done(request, exit))),
          ),
          Effect.forkDetach,
          Effect.andThen(restore(Deferred.await(request))),
        );
      }),
    );

  const refreshStaleCompleteUserGuilds = (
    identity: UserIdentity,
    cacheKey: string,
  ) =>
    fetchCompleteUserGuildsOnce(identity, COMPLETE_GUILDS_MAX_AGE_MS).pipe(
      Effect.catch((error) =>
        Effect.gen(function* () {
          if (error instanceof AuthenticationRequiredError) {
            yield* redis.del(cacheKey).pipe(Effect.ignore);
          }

          yield* Effect.logDebug({
            message: "Background complete guild refresh failed",
            userId: identity.userId,
            error,
          });
        }),
      ),
    );

  return {
    getUserGuilds: (userId, discordId) => {
      const identity = { userId, discordId };
      const cacheKey = getUserGuildsCacheKey(identity);

      return Effect.gen(function* () {
        const cached = yield* getCachedUserGuilds(cacheKey, userId);

        if (cached) {
          return cached;
        }

        return yield* locks
          .singleFlight(
            {
              resource: getUserGuildsLockKey(identity),
              duration: LOCK_TTL_MS,
              wait: LOCK_WAIT,
              unavailable: () => new GuildsLockUnavailable(),
            },
            getCachedUserGuilds(cacheKey, userId).pipe(
              Effect.map(Option.fromNullishOr),
            ),
            Effect.gen(function* () {
              const guilds = yield* fetchUserGuildsFromDiscord(
                userId,
                discordId,
              );

              yield* redis.set(
                cacheKey,
                JSON.stringify(guilds),
                guildsCacheTtl,
              );

              return guilds;
            }),
          )
          .pipe(
            Effect.catchTag("GuildsLockUnavailable", () =>
              failUnavailable(
                "Lock acquisition failed for getUserGuilds",
                "error",
                userId,
                "DISCORD_GUILDS_LOCK_UNAVAILABLE",
              ),
            ),
            Effect.catch((error) => {
              if (error instanceof AuthenticationRequiredError) {
                return Effect.logWarning({
                  message: `User authentication failed for userId: ${userId}`,
                  error,
                }).pipe(Effect.andThen(Effect.fail(error)));
              }

              if (error instanceof ApplicationError) {
                return Effect.fail(error);
              }

              return Effect.logError({
                message: `Failed to fetch user guilds for userId: ${userId}`,
                error,
              }).pipe(
                Effect.andThen(Effect.fail(toDiscordRequestError(error))),
              );
            }),
          );
      });
    },
    getFreshCompleteUserGuilds: (userId, discordId) =>
      Effect.gen(function* () {
        const identity = { userId, discordId };

        const entry =
          (yield* getCompleteUserGuildsEntry(
            getCompleteUserGuildsCacheKey(identity),
            COMPLETE_GUILDS_FRESH_MAX_AGE_MS,
          )) ??
          (yield* fetchCompleteUserGuildsOnce(
            identity,
            COMPLETE_GUILDS_FRESH_MAX_AGE_MS,
          ));

        return yield* toCompleteUserGuildsResult(entry);
      }),
    getCachedCompleteUserGuilds: (userId, discordId) =>
      Effect.gen(function* () {
        const identity = { userId, discordId };
        const cacheKey = getCompleteUserGuildsCacheKey(identity);

        const entry = yield* getCompleteUserGuildsEntry(
          cacheKey,
          COMPLETE_GUILDS_STALE_TTL_SECONDS * 1000,
        );

        if (!entry) {
          return yield* toCompleteUserGuildsResult(
            yield* fetchCompleteUserGuildsOnce(
              identity,
              COMPLETE_GUILDS_MAX_AGE_MS,
            ),
          );
        }

        const now = yield* Clock.currentTimeMillis;

        if (now - entry.fetchedAt > COMPLETE_GUILDS_MAX_AGE_MS) {
          yield* Effect.forkDetach(
            refreshStaleCompleteUserGuilds(identity, cacheKey),
          );
        }

        return yield* toCompleteUserGuildsResult(entry);
      }),
    clearUserGuildIdsCache: ({ userId, discordId }) =>
      Effect.all(
        [
          redis.del(getUserGuildsCacheKey({ userId, discordId })),
          ...getLegacyUserGuildsCacheKeys(userId).map((key) => redis.del(key)),
        ],
        { concurrency: "unbounded", discard: true },
      ),
  };
};
