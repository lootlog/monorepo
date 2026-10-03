import { boundedHttpGet } from "@lootlog/instrumentation/bounded-http-get";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { UserGuildPermissionsDtoSchema } from "@lootlog/schema/permissions";
import { Clock, Effect, Option, Result, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/http/HttpClient";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type { GetUserGuildsOptions, UserGuildData } from "#src/guilds/guild";
import { CACHE_TTL, getUserGuildsCacheKey } from "#src/guilds/cache-keys";
import type {
  RedisGatewayStore,
  RedisScriptReply,
} from "#src/platform/redis-store";
import { SingleFlight } from "#src/platform/single-flight";

const UserGuildsJson = Schema.fromJsonString(
  Schema.Array(UserGuildPermissionsDtoSchema),
);

const CachedGuildDataJson = Schema.fromJsonString(
  Schema.Union([
    Schema.Struct({
      guilds: Schema.Array(UserGuildPermissionsDtoSchema),
      cachedAt: Schema.Number,
      revision: Schema.optional(Schema.String),
    }),
    Schema.Struct({
      revision: Schema.String,
      invalidated: Schema.Literal(true),
    }),
  ]),
);

// Matches the Lua revision check even when the cached projection no longer decodes.
const CachedRevisionJson = Schema.fromJsonString(
  Schema.Struct({ revision: Schema.optional(Schema.String) }),
);

// The revision fences HTTP requests started on another gateway instance.
const cacheGuildsScript = `
local raw = redis.call("GET", KEYS[1])
local revision = ""
if raw then
  local valid, cached = pcall(cjson.decode, raw)
  if valid and type(cached) == "table" then revision = cached.revision or "" end
end
if revision ~= ARGV[1] then return 0 end
redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
return 1
`;

export class GuildStoreFailure extends TaggedErrorClass<GuildStoreFailure>()(
  "GuildStoreFailure",
  {
    reason: Schema.Literals([
      "invalid-response",
      "response-too-large",
      "status",
      "timeout",
      "transport",
      "cache",
      "invalidated",
    ]),
    retryable: Schema.Boolean,
    status: Schema.optional(Schema.Number),
  },
) {}

export interface GuildStore {
  readonly getUserGuilds: (
    options: GetUserGuildsOptions,
    readOptions?: { readonly freshness: "required" },
  ) => Effect.Effect<UserGuildData[], GuildStoreFailure>;
  readonly invalidate: (
    options: GetUserGuildsOptions,
  ) => Effect.Effect<void, GuildStoreFailure>;
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

const cacheCommand = <A>(command: () => Promise<A>) =>
  Effect.tryPromise({
    try: command,
    catch: () => failure("cache", { retryable: true }),
  }).pipe(
    Effect.timeoutOrElse({
      duration: "10 seconds",
      orElse: () => Effect.fail(failure("cache", { retryable: true })),
    }),
  );

export const makeGuildStore = (
  config: Pick<GatewayConfiguration, "apiUrl">,
  redis: {
    command: Pick<RedisGatewayStore["command"], "get" | "set"> & {
      eval(
        ...args: Parameters<RedisGatewayStore["command"]["eval"]>
      ): Promise<RedisScriptReply>;
    };
  },
  httpClient: HttpClientValue,
): GuildStore => {
  const fetchGuilds = Effect.fn("GuildStore_fetchUserGuilds")(function* (
    options: GetUserGuildsOptions,
    readOptions?: { readonly freshness: "required" },
  ) {
    const url = new URL(`${config.apiUrl}/internal/guilds/user-permissions`);
    url.searchParams.set("discordId", options.discordId);
    url.searchParams.set("userId", options.userId);

    if (readOptions?.freshness === "required")
      url.searchParams.set("freshness", "required");

    return yield* boundedHttpGet({
      client: httpClient,
      url,
      // Bounds how long one join can hold a command slot on a slow API.
      timeoutMilliseconds: 5000,
      retries: 2,
      operationId: "GuildStore_fetchUserGuilds",
      adapter: "api-user-permissions",
      response: "successful",
      failure: (reason, retryable, status) =>
        failure(reason, { retryable, status }),
      decode: decodeGuilds,
    });
  });

  const readCache = (key: string) =>
    cacheCommand(() => redis.command.get(key)).pipe(
      Effect.map((value) => ({
        entry: value
          ? Option.getOrNull(
              Schema.decodeUnknownOption(CachedGuildDataJson)(value),
            )
          : null,
        revision:
          Option.getOrUndefined(
            Schema.decodeUnknownOption(CachedRevisionJson)(value),
          )?.revision ?? "",
      })),
    );

  const fetchAndCommit = Effect.fn("GuildStore_fetchAndCommit")(function* (
    options: GetUserGuildsOptions,
    cacheKey: string,
    revision: string,
    readOptions?: { readonly freshness: "required" },
  ) {
    const guilds = yield* fetchGuilds(options, readOptions);
    const cachedAt = yield* Clock.currentTimeMillis;

    const committed = yield* cacheCommand(() =>
      redis.command.eval(
        cacheGuildsScript,
        1,
        cacheKey,
        revision,
        JSON.stringify({ guilds, cachedAt, revision }),
        CACHE_TTL.MAX_STALE_CACHE_AGE,
      ),
    );

    if (committed !== 1)
      return yield* Effect.fail(failure("invalidated", { retryable: true }));

    return guilds;
  });

  // A reconnect burst sends every socket of a user through one API request.
  // The revision is part of the key: a read that observed an invalidation
  // never waits for a request started before it.
  const pendingFetches = new SingleFlight<
    string,
    UserGuildData[],
    GuildStoreFailure
  >();

  const sharedFetch = (
    options: GetUserGuildsOptions,
    cacheKey: string,
    revision: string,
  ) =>
    pendingFetches.run(
      `${cacheKey}\n${revision}`,
      fetchAndCommit(options, cacheKey, revision),
    );

  const loadUserGuilds = Effect.fn("GuildStore_getUserGuilds")(function* (
    options: GetUserGuildsOptions,
    readOptions?: { readonly freshness: "required" },
  ) {
    const cacheKey = getUserGuildsCacheKey(options.discordId, options.userId);
    const { entry: cached, revision } = yield* readCache(cacheKey);

    // Revocation must never join a request that started before it.
    if (readOptions?.freshness === "required")
      return yield* fetchAndCommit(options, cacheKey, revision, readOptions);

    const now = yield* Clock.currentTimeMillis;

    if (cached && "guilds" in cached) {
      const age = now - cached.cachedAt;

      if (age <= CACHE_TTL.USER_GUILDS * 1_000) return [...cached.guilds];

      // A slow or failing API must not hold joins that already have a
      // projection nobody invalidated. Refresh it for the next join.
      if (age <= CACHE_TTL.MAX_STALE_CACHE_AGE * 1_000) {
        yield* sharedFetch(options, cacheKey, revision).pipe(
          Effect.catch((error) =>
            Effect.logWarning("Background permission refresh failed", error),
          ),
          Effect.forkDetach,
        );

        return [...cached.guilds];
      }
    }

    const result = yield* sharedFetch(options, cacheKey, revision).pipe(
      Effect.result,
    );

    if (Result.isSuccess(result)) return result.success;

    // Another gateway may have filled the projection while this request failed.
    const { entry: fallback } = yield* readCache(cacheKey);
    const fallbackAt = yield* Clock.currentTimeMillis;

    if (
      fallback &&
      "guilds" in fallback &&
      fallbackAt - fallback.cachedAt <= CACHE_TTL.MAX_STALE_CACHE_AGE * 1_000
    ) {
      return [...fallback.guilds];
    }

    return yield* Effect.fail(result.failure);
  });

  return {
    getUserGuilds: (options, readOptions) =>
      loadUserGuilds(options, readOptions).pipe(
        Effect.withSpan("GuildStore_getUserGuilds", {
          attributes: { adapter: "api-user-permissions", retryCount: 0 },
        }),
      ),
    invalidate: (options) =>
      cacheCommand(() =>
        redis.command.set(
          getUserGuildsCacheKey(options.discordId, options.userId),
          JSON.stringify({ revision: crypto.randomUUID(), invalidated: true }),
          "EX",
          CACHE_TTL.MAX_STALE_CACHE_AGE,
        ),
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("GuildStore_invalidate", {
          attributes: { adapter: "redis", retryCount: 0 },
        }),
      ),
  };
};
