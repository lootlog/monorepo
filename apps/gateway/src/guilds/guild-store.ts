import { boundedHttpGet } from "@lootlog/instrumentation/bounded-http-get";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { UserGuildPermissionsDtoSchema } from "@lootlog/schema/permissions";
import { Clock, Effect, Option, Result, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type { GetUserGuildsOptions, UserGuildData } from "#src/guilds/guild";
import { CACHE_TTL, getUserGuildsCacheKey } from "#src/guilds/cache-keys";
import type {
  RedisGatewayStore,
  RedisScriptReply,
} from "#src/platform/redis-store";

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
  ) {
    const url = new URL(`${config.apiUrl}/internal/guilds/user-permissions`);
    url.searchParams.set("discordId", options.discordId);
    url.searchParams.set("userId", options.userId);

    return yield* boundedHttpGet({
      client: httpClient,
      url,
      timeoutMilliseconds: 10000,
      retries: 3,
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

  const loadUserGuilds = Effect.fn("GuildStore_getUserGuilds")(function* (
    options: GetUserGuildsOptions,
    readOptions?: { readonly freshness: "required" },
  ) {
    const cacheKey = getUserGuildsCacheKey(options.discordId, options.userId);
    const { entry: cached, revision } = yield* readCache(cacheKey);
    const now = yield* Clock.currentTimeMillis;

    if (
      readOptions?.freshness !== "required" &&
      cached &&
      "guilds" in cached &&
      now - cached.cachedAt <= CACHE_TTL.USER_GUILDS * 1_000
    ) {
      return [...cached.guilds];
    }

    const result = yield* fetchGuilds(options).pipe(Effect.result);

    if (Result.isFailure(result)) {
      if (readOptions?.freshness === "required")
        return yield* Effect.fail(result.failure);

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
    }

    const cachedAt = yield* Clock.currentTimeMillis;

    const committed = yield* cacheCommand(() =>
      redis.command.eval(
        cacheGuildsScript,
        1,
        cacheKey,
        revision,
        JSON.stringify({ guilds: result.success, cachedAt, revision }),
        CACHE_TTL.MAX_STALE_CACHE_AGE,
      ),
    );

    if (committed !== 1)
      return yield* Effect.fail(failure("invalidated", { retryable: true }));

    return result.success;
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
