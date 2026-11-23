import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { ApiRpcGroup } from "@lootlog/rpc/api";
import { makeRpcClient } from "@lootlog/rpc/client";
import type { RpcUnavailableError } from "@lootlog/rpc/errors";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { UserGuildPermissionsDtoSchema } from "@lootlog/schema/permissions";
import type { InternalUserPermissionsQuery } from "@lootlog/schema/internal-guilds";
import { Clock, Effect, Option, Result, Schema, Context, Layer } from "effect";
import type { RpcClientError } from "effect/rpc";
import {
  type GatewayConfiguration,
  GatewayConfig,
} from "#src/config/gateway-config";
import type { GetUserGuildsOptions, UserGuildData } from "#src/guilds/guild";
import { CACHE_TTL, getUserGuildsCacheKey } from "#src/guilds/cache-keys";
import { type RedisScriptReply, GatewayRedis } from "#src/platform/redis-store";
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
    Effect.timeout("10 seconds"),
    Effect.interruptible,
    Effect.mapError(() => failure("cache", { retryable: true })),
  );

interface ApiRpcClient {
  readonly getUserGuildPermissions: (
    input: InternalUserPermissionsQuery,
  ) => Effect.Effect<
    ReadonlyArray<UserGuildData>,
    RpcUnavailableError | RpcClientError.RpcClientError
  >;
}

export const makeGuildStore = (
  _config: Pick<GatewayConfiguration, "apiRpcUrl">,
  redis: {
    readonly command: {
      readonly get: (key: string) => Promise<string | null>;
      readonly set: (
        key: string,
        value: string,
        mode: "EX",
        seconds: number,
      ) => Promise<string | null>;
      readonly eval: (
        script: string,
        numKeys: number,
        ...args: (string | number)[]
      ) => Promise<RedisScriptReply>;
    };
  },
  apiRpc: ApiRpcClient,
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

    return yield* Effect.suspend(() =>
      apiRpc.getUserGuildPermissions(query),
    ).pipe(
      Effect.timeout("5 seconds"),
      Effect.retry({ times: 2 }),
      Effect.map((guilds) => [...guilds]),
      Effect.catchTags({
        TimeoutError: () =>
          Effect.fail(failure("timeout", { retryable: true })),
        RpcUnavailableError: () =>
          Effect.fail(failure("status", { retryable: true, status: 503 })),
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

  const isValidCache = (
    entry: typeof CachedGuildDataJson.Type | null,
  ): entry is Extract<typeof CachedGuildDataJson.Type, { guilds: unknown }> =>
    entry !== null && !("invalidated" in entry);

  const loadUserGuilds = Effect.fn("GuildStore_loadUserGuilds")(function* (
    options: GetUserGuildsOptions,
    readOptions?: { readonly freshness: "required" },
  ) {
    const cacheKey = getUserGuildsCacheKey(options.discordId, options.userId);
    const cached = yield* readCache(cacheKey);
    const now = yield* Clock.currentTimeMillis;
    const allowCached = readOptions?.freshness !== "required";

    const cacheAge = isValidCache(cached.entry)
      ? now - cached.entry.cachedAt
      : Number.POSITIVE_INFINITY;

    if (
      allowCached &&
      isValidCache(cached.entry) &&
      cacheAge < CACHE_TTL.USER_GUILDS * 1000
    ) {
      return [...cached.entry.guilds];
    }

    const fetchKey = allowCached
      ? `${cacheKey}:${cached.revision}`
      : `${cacheKey}:fresh:${cached.revision}`;

    if (
      allowCached &&
      isValidCache(cached.entry) &&
      cacheAge < CACHE_TTL.MAX_STALE_CACHE_AGE * 1000
    ) {
      yield* pendingFetches
        .run(
          fetchKey,
          fetchAndCommit(options, cacheKey, cached.revision, readOptions),
        )
        .pipe(Effect.ignore, Effect.forkDetach);

      return [...cached.entry.guilds];
    }

    const result = yield* Effect.result(
      pendingFetches.run(
        fetchKey,
        fetchAndCommit(options, cacheKey, cached.revision, readOptions),
      ),
    );

    if (Result.isSuccess(result)) return result.success;

    if (result.failure.reason === "invalidated" && allowCached) {
      const latest = yield* readCache(cacheKey);

      if (isValidCache(latest.entry)) return [...latest.entry.guilds];

      return yield* fetchAndCommit(
        options,
        cacheKey,
        latest.revision,
        readOptions,
      );
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
      const redis = yield* GatewayRedis;

      const apiRpc = yield* makeRpcClient(ApiRpcGroup, {
        url: config.apiRpcUrl,
        spanPrefix: "gateway.api-rpc",
      });

      return makeGuildStore(config, redis, apiRpc);
    }),
  );
}
