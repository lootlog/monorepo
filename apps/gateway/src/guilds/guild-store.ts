import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { ApiRpcGroup } from "@lootlog/rpc/api";
import {
  boundedRpcCall,
  makeRpcClient,
  type ServiceRpcClient,
} from "@lootlog/rpc/client";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { UserGuildPermissionsDtoSchema } from "@lootlog/schema/permissions";
import type { InternalUserPermissionsQuery } from "@lootlog/schema/internal-guilds";
import { Clock, Effect, Option, Result, Schema, Context, Layer } from "effect";
import { GatewayConfig } from "#src/config/gateway-config";
import type { GetUserGuildsOptions, UserGuildData } from "#src/guilds/guild";
import { CACHE_TTL, getUserGuildsCacheKey } from "#src/guilds/cache-keys";
import {
  type RedisGatewayStore,
  type RedisScriptReply,
  GatewayRedis,
} from "#src/platform/redis-store";
import { SingleFlight } from "#src/platform/single-flight";

const CachedGuildDataJson = Schema.fromJsonString(
  Schema.Union([
    Schema.Struct({
      guilds: Schema.Array(UserGuildPermissionsDtoSchema),
      cachedAt: Schema.Finite,
      revision: Schema.optional(Schema.String),
    }),
    Schema.Struct({
      revision: Schema.String,
      invalidated: Schema.Literal(true),
    }),
  ]),
);

const CachedRevisionJson = Schema.fromJsonString(
  Schema.Struct({ revision: Schema.optional(Schema.String) }),
);

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

export class GuildStoreFailure extends TaggedErrorClass<
  GuildStoreFailure,
  { readonly brand: unique symbol }
>()("GuildStoreFailure", {
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
  status: Schema.optional(Schema.Finite),
}) {}

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

const fetchPermissions = boundedRpcCall({ timeout: "5 seconds", retries: 2 });

export const makeGuildStore = (
  redis: {
    command: Pick<RedisGatewayStore["command"], "get" | "set"> & {
      eval(
        ...args: Parameters<RedisGatewayStore["command"]["eval"]>
      ): Promise<RedisScriptReply>;
    };
  },
  apiRpc: Pick<ServiceRpcClient<typeof ApiRpcGroup>, "getUserGuildPermissions">,
): GuildStore => {
  const fetchGuilds = Effect.fn("GuildStore_fetchUserGuilds")(function* (
    options: GetUserGuildsOptions,
    readOptions?: { readonly freshness: "required" },
  ) {
    const query: InternalUserPermissionsQuery = {
      discordId: options.discordId,
      userId: options.userId,
      ...(readOptions?.freshness === "required" && { freshness: "required" }),
    };

    return yield* fetchPermissions(() =>
      apiRpc.getUserGuildPermissions(query),
    ).pipe(
      Effect.map((guilds) => [...guilds]),
      Effect.catchTags({
        TimeoutError: () =>
          Effect.fail(failure("timeout", { retryable: true })),
        RpcUnavailableError: () =>
          Effect.fail(failure("status", { retryable: true, status: 503 })),
        RpcCallerRejectedError: () =>
          Effect.fail(failure("status", { retryable: false, status: 401 })),
        RpcClientError: () =>
          Effect.fail(failure("transport", { retryable: true })),
      }),
    );
  });

  const readCache = (key: string) =>
    cacheCommand(() => redis.command.get(key)).pipe(
      Effect.map((value) => ({
        entry: value
          ? Option.getOrNull(Schema.decodeOption(CachedGuildDataJson)(value))
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
      return yield* failure("invalidated", { retryable: true });

    return guilds;
  });

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

    if (readOptions?.freshness === "required")
      return yield* fetchAndCommit(options, cacheKey, revision, readOptions);

    const now = yield* Clock.currentTimeMillis;

    if (cached && "guilds" in cached) {
      const age = now - cached.cachedAt;

      if (age <= CACHE_TTL.USER_GUILDS * 1_000) return [...cached.guilds];

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

    const { entry: fallback } = yield* readCache(cacheKey);
    const fallbackAt = yield* Clock.currentTimeMillis;

    if (
      fallback &&
      "guilds" in fallback &&
      fallbackAt - fallback.cachedAt <= CACHE_TTL.MAX_STALE_CACHE_AGE * 1_000
    ) {
      return [...fallback.guilds];
    }

    return yield* result.failure;
  });

  return {
    getUserGuilds: (options, readOptions) =>
      loadUserGuilds(options, readOptions).pipe(
        withAdapterSpan("GuildStore_getUserGuilds", "api-user-permissions"),
      ),
    invalidate: (options) =>
      cacheCommand(() =>
        redis.command.set(
          getUserGuildsCacheKey(options.discordId, options.userId),
          JSON.stringify({ revision: crypto.randomUUID(), invalidated: true }),
          "EX",
          CACHE_TTL.MAX_STALE_CACHE_AGE,
        ),
      ).pipe(Effect.asVoid, withAdapterSpan("GuildStore_invalidate", "redis")),
  };
};

export class Guilds extends Context.Service<Guilds, GuildStore>()(
  "@lootlog/gateway/guilds/Guilds",
) {
  static readonly layer = Layer.effect(
    Guilds,
    Effect.gen(function* () {
      const config = yield* GatewayConfig;

      return makeGuildStore(
        yield* GatewayRedis,
        yield* makeRpcClient(ApiRpcGroup, {
          ...config.rpc.api,
          spanPrefix: "gateway.api-rpc",
        }),
      );
    }),
  );
}
