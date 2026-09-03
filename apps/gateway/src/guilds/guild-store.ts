import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { UserGuildPermissionsDtoSchema } from "@lootlog/schema/permissions";
import { Clock, Effect, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type { GetUserGuildsOptions, UserGuildData } from "#src/guilds/guild";
import { CACHE_TTL, getUserGuildsCacheKey } from "#src/guilds/cache-keys";
import type { RedisGatewayStore } from "#src/platform/redis-store";

const RESPONSE_LIMIT_BYTES = 1024 * 1024;
const UserGuildsJson = Schema.fromJsonString(
  Schema.Array(UserGuildPermissionsDtoSchema),
);
const CachedGuildDataJson = Schema.fromJsonString(
  Schema.Struct({
    guilds: Schema.Array(UserGuildPermissionsDtoSchema),
    cachedAt: Schema.Number,
  }),
);

export class GuildStoreFailure extends TaggedErrorClass<GuildStoreFailure>()(
  "GuildStoreFailure",
  {
    reason: Schema.Literals([
      "invalid-response",
      "response-too-large",
      "status",
      "timeout",
      "transport",
    ]),
    retryable: Schema.Boolean,
    status: Schema.optional(Schema.Number),
  },
) {}

export interface GuildStore {
  readonly getUserGuilds: (
    options: GetUserGuildsOptions,
  ) => Effect.Effect<UserGuildData[]>;
  readonly invalidate: (options: GetUserGuildsOptions) => Effect.Effect<void>;
}

const failure = (
  reason: GuildStoreFailure["reason"],
  options?: { readonly retryable?: boolean; readonly status?: number },
) =>
  new GuildStoreFailure({
    reason,
    retryable: options?.retryable ?? false,
    status: options?.status,
  });

const decodeGuilds = (body: ArrayBuffer): UserGuildData[] => {
  return [
    ...Schema.decodeUnknownSync(UserGuildsJson)(new TextDecoder().decode(body)),
  ];
};

export const makeGuildStore = (
  config: GatewayConfiguration,
  redis: RedisGatewayStore,
  httpClient: HttpClientValue,
): GuildStore => {
  const fetchGuilds = Effect.fn("GuildStore_fetchUserGuilds")(function* (
    options: GetUserGuildsOptions,
  ) {
    const url = new URL(`${config.apiUrl}/internal/guilds/user-permissions`);
    url.searchParams.set("discordId", options.discordId);
    url.searchParams.set("userId", options.userId);
    let retryCount = 0;
    const attempt = Effect.suspend(() => {
      const currentRetryCount = retryCount;
      retryCount += 1;
      return httpClient.get(url.toString()).pipe(
        Effect.timeout("10 seconds"),
        Effect.mapError((error) =>
          failure(error._tag === "TimeoutError" ? "timeout" : "transport", {
            retryable: true,
          }),
        ),
        Effect.flatMap((response) => {
          if (response.status < 200 || response.status >= 300) {
            return Effect.fail(
              failure("status", {
                retryable: response.status >= 500,
                status: response.status,
              }),
            );
          }
          return response.arrayBuffer.pipe(
            Effect.mapError(() => failure("invalid-response")),
            Effect.flatMap((body) =>
              body.byteLength <= RESPONSE_LIMIT_BYTES
                ? Effect.succeed(body)
                : Effect.fail(failure("response-too-large")),
            ),
          );
        }),
        Effect.flatMap((body) =>
          Effect.try({
            try: () => decodeGuilds(body),
            catch: () => failure("invalid-response"),
          }),
        ),
        Effect.withSpan("GuildStore_fetchUserGuilds.attempt", {
          attributes: {
            adapter: "api-user-permissions",
            retryCount: currentRetryCount,
          },
        }),
      );
    });
    return yield* attempt.pipe(
      Effect.retry({ times: 3, while: (error) => error.retryable }),
    );
  });

  const readCache = (key: string) =>
    Effect.tryPromise(() => redis.command.get(key)).pipe(
      Effect.flatMap((value) =>
        Effect.try({
          try: () => {
            if (!value) return null;
            return Schema.decodeUnknownSync(CachedGuildDataJson)(value);
          },
          catch: () => null,
        }),
      ),
      Effect.catch(() => Effect.succeed(null)),
    );

  const loadUserGuilds = Effect.fn("GuildStore_getUserGuilds")(function* (
    options: GetUserGuildsOptions,
  ) {
    const now = yield* Clock.currentTimeMillis;
    const cacheKey = getUserGuildsCacheKey(options.discordId, options.userId);
    const cached = yield* readCache(cacheKey);
    if (cached && now - cached.cachedAt <= CACHE_TTL.USER_GUILDS * 1_000) {
      return [...cached.guilds];
    }

    const guilds = yield* fetchGuilds(options).pipe(Effect.option);
    if (guilds._tag === "Some") {
      const value = JSON.stringify({
        guilds: guilds.value,
        cachedAt: now,
      });
      yield* Effect.tryPromise(() =>
        redis.command.set(cacheKey, value, "EX", CACHE_TTL.USER_GUILDS * 2),
      ).pipe(Effect.ignore);
      return guilds.value;
    }
    if (
      cached &&
      now - cached.cachedAt <= CACHE_TTL.MAX_STALE_CACHE_AGE * 1_000
    ) {
      return [...cached.guilds];
    }
    return [];
  });

  return {
    getUserGuilds: (options) =>
      loadUserGuilds(options).pipe(
        Effect.withSpan("GuildStore_getUserGuilds", {
          attributes: { adapter: "api-user-permissions", retryCount: 0 },
        }),
      ),
    invalidate: (options) =>
      Effect.tryPromise(() =>
        redis.command.del(
          getUserGuildsCacheKey(options.discordId, options.userId),
        ),
      ).pipe(
        Effect.asVoid,
        Effect.orDie,
        Effect.withSpan("GuildStore_invalidate", {
          attributes: { adapter: "redis", retryCount: 0 },
        }),
      ),
  };
};
