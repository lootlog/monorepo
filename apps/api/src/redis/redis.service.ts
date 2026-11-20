import { RedisScriptCache } from "@lootlog/database/redis-script";
import { randomUUID } from "node:crypto";
import {
  CacheFillTimeoutError,
  fillJsonCache,
} from "@lootlog/database/redis-cache-fill";
import { type Cause, Effect, Exit, Schema } from "effect";
import * as Redis from "effect/persistence/Redis";
import { chunk } from "es-toolkit";

export interface JsonCodec<T> {
  stringify: (value: unknown) => string;
  parse: (text: string) => T;
}

const DEFAULT_JSON_SERIALIZER: Pick<JsonCodec<unknown>, "stringify"> = {
  stringify: (value) => JSON.stringify(value),
};

const decodeJsonUnknown = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Unknown),
);

export const makeJsonCodec = <S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
): JsonCodec<S["Type"]> => {
  const decodeValue = Schema.decodeUnknownSync(schema);

  return {
    stringify: JSON.stringify,
    parse: (text) => decodeValue(decodeJsonUnknown(text)),
  };
};

/** Caches a schema's decoded values, such as `Date`, in their canonical JSON form. */
export const makeTypeJsonCodec = <S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
): JsonCodec<S["Type"]> => {
  const codec = Schema.fromJsonString(
    Schema.toCodecJson(Schema.toType(schema)),
  );

  return {
    stringify: Schema.encodeUnknownSync(codec),
    parse: Schema.decodeUnknownSync(codec),
  };
};

export interface RedisGetOrSetJsonOptions<T, E> {
  readonly key: string;
  readonly scopes?: readonly string[];
  readonly ttlSeconds: number;
  readonly factory: Effect.Effect<T, E>;
  readonly lockTtlSeconds?: number;
  readonly waitTimeoutMs?: number;
  readonly waitIntervalMs?: number;
  readonly codec: JsonCodec<T>;
  /** Reports a Redis failure the read recovered from by running `factory`. */
  readonly onError?: (error: unknown) => void;
}

const DEFAULT_SCAN_COUNT = 500;

const DEFAULT_DELETE_BATCH_SIZE = 500;

// Reads renew active scopes; idle metadata expires. A missing scope gets a new
// random token, so expiry cannot make an old cache fill reachable again.
const READ_CACHE_GENERATION_TTL_SECONDS = 3_600;

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

const READ_CACHE_GENERATIONS_SCRIPT = `
local versions = {}
for i, key in ipairs(KEYS) do
  local version = redis.call("GET", key)
  if not version then
    version = ARGV[i]
    redis.call("SET", key, version)
  end
  redis.call("EXPIRE", key, ARGV[#KEYS + 1])
  versions[i] = version
end
return versions
`;

/**
 * The Redis commands Lootlog uses, as Effects that fail with `RedisError`.
 * Domain ports take a `Pick<>` of it.
 */
export interface RedisService {
  readonly get: (key: string) => Effect.Effect<string | null, Redis.RedisError>;
  readonly set: (
    key: string,
    value: string,
    ttlSeconds?: number,
  ) => Effect.Effect<void, Redis.RedisError>;
  readonly del: (key: string) => Effect.Effect<number, Redis.RedisError>;
  readonly setNX: (
    key: string,
    value: string,
    ttlSeconds?: number,
  ) => Effect.Effect<boolean, Redis.RedisError>;
  /**
   * Sets the key when it is missing and returns the value it already held, or
   * null when this call set it.
   */
  readonly setNxGet: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<string | null, Redis.RedisError>;
  /** Deletes the key only while it still holds `value`. */
  readonly deleteIfValue: (
    key: string,
    value: string,
  ) => Effect.Effect<number, Redis.RedisError>;
  readonly incr: (key: string) => Effect.Effect<number, Redis.RedisError>;
  readonly expire: (
    key: string,
    ttlSeconds: number,
  ) => Effect.Effect<number, Redis.RedisError>;
  /** Reads a JSON value; an entry the codec rejects is deleted and reads as null. */
  readonly getJson: <T>(
    key: string,
    codec: Pick<JsonCodec<T>, "parse">,
  ) => Effect.Effect<T | null, Redis.RedisError>;
  readonly setJson: <T>(
    key: string,
    value: T,
    ttlSeconds?: number,
    codec?: Pick<JsonCodec<T>, "stringify">,
  ) => Effect.Effect<void, Redis.RedisError>;
  /** Makes every read-cache entry filled under these scopes unreachable. */
  readonly invalidateScopes: (
    ...scopes: string[]
  ) => Effect.Effect<void, Redis.RedisError>;
  /** Lists the keys matching `pattern` with SCAN, without the key prefix. */
  readonly scan: (pattern: string) => Effect.Effect<string[], Redis.RedisError>;
  readonly deleteByPattern: (
    pattern: string,
    batchSize?: number,
  ) => Effect.Effect<number, Redis.RedisError>;
  readonly eval: <T = unknown>(
    script: string,
    keys: ReadonlyArray<string>,
    args?: ReadonlyArray<string | number>,
  ) => Effect.Effect<T, Redis.RedisError>;
  readonly rpush: (
    key: string,
    ...values: string[]
  ) => Effect.Effect<number, Redis.RedisError>;
  readonly ltrim: (
    key: string,
    start: number,
    stop: number,
  ) => Effect.Effect<"OK", Redis.RedisError>;
  readonly lrange: (
    key: string,
    start: number,
    stop: number,
  ) => Effect.Effect<string[], Redis.RedisError>;
  readonly lrem: (
    key: string,
    count: number,
    value: string,
  ) => Effect.Effect<number, Redis.RedisError>;
  /**
   * Reads a cached JSON value or fills it once across all API processes. Cache
   * failures fall back to the factory; only the factory's errors surface. A
   * caller that waits past `waitTimeoutMs` for another owner's fill dies with
   * `CacheFillTimeoutError` instead of starting a second fill.
   */
  readonly getOrSetJson: <T, E>(
    options: RedisGetOrSetJsonOptions<T, E>,
  ) => Effect.Effect<T, E>;
}

export const makeRedisService = (
  redis: Redis.Redis["Service"],
  options: { readonly prefix?: string } = {},
): RedisService => {
  const prefix = options.prefix ?? "";
  const scripts = new RedisScriptCache();

  const send: Redis.Redis["Service"]["send"] = (command, ...args) =>
    redis.send(command, ...args);

  const prefixKey = (key: string): string =>
    prefix ? `${prefix}:${key}` : key;

  const unprefixKey = (key: string): string =>
    prefix && key.startsWith(`${prefix}:`) ? key.slice(prefix.length + 1) : key;

  const forEachScanBatch = (
    pattern: string,
    onBatch: (keys: string[]) => Effect.Effect<void, Redis.RedisError>,
  ): Effect.Effect<void, Redis.RedisError> =>
    Effect.gen(function* () {
      const prefixedPattern = prefixKey(pattern);
      let cursor = "0";

      do {
        const [nextCursor, matchedKeys] = yield* send<[string, string[]]>(
          "SCAN",
          cursor,
          "MATCH",
          prefixedPattern,
          "COUNT",
          String(DEFAULT_SCAN_COUNT),
        );

        cursor = nextCursor;
        yield* onBatch(matchedKeys);
      } while (cursor !== "0");
    });

  const get: RedisService["get"] = (key) => send("GET", prefixKey(key));

  const set: RedisService["set"] = (key, value, ttlSeconds) =>
    (ttlSeconds
      ? send("SET", prefixKey(key), value, "EX", String(ttlSeconds))
      : send("SET", prefixKey(key), value)
    ).pipe(Effect.asVoid);

  const del: RedisService["del"] = (key) => send("DEL", prefixKey(key));

  const evalScript = <T = unknown>(
    script: string,
    keys: ReadonlyArray<string>,
    args: ReadonlyArray<string | number> = [],
  ) => {
    const prefixedKeys = keys.map(prefixKey);

    return redis.eval(scripts.get<T>(script, prefixedKeys.length))(
      ...prefixedKeys,
      ...args.map(String),
    );
  };

  const setNX: RedisService["setNX"] = (key, value, ttlSeconds) =>
    ttlSeconds
      ? send("SET", prefixKey(key), value, "EX", String(ttlSeconds), "NX").pipe(
          Effect.map((result) => result === "OK"),
        )
      : send<number>("SETNX", prefixKey(key), value).pipe(
          Effect.map((result) => result === 1),
        );

  const getJson: RedisService["getJson"] = (key, codec) =>
    get(key).pipe(
      Effect.flatMap((cached) =>
        cached === null
          ? Effect.succeed(null)
          : Effect.try({
              try: () => codec.parse(cached),
              catch: () => null,
            }).pipe(Effect.catch(() => del(key).pipe(Effect.as(null)))),
      ),
    );

  const getOrSetJson = <T, E>({
    key,
    scopes = [],
    factory,
    onError,
    ...fillOptions
  }: RedisGetOrSetJsonOptions<T, E>): Effect.Effect<T, E> =>
    Effect.gen(function* () {
      const context = yield* Effect.context<never>();
      const run = Effect.runPromiseWith(context);
      let filled: { readonly value: T } | undefined;
      let factoryFailure: Cause.Cause<E> | undefined;

      // fillJsonCache is shared with battlelog and drives its own Promise loop.
      const store = {
        getJson: <A>(cacheKey: string, codec: { parse(text: string): A }) =>
          run(getJson(cacheKey, codec)),
        setNX: (cacheKey: string, token: string, ttlSeconds: number) =>
          run(setNX(cacheKey, token, ttlSeconds)),
        eval: <A>(
          script: string,
          keys: string[],
          args: Array<string | number>,
        ) => run(evalScript<A>(script, keys, args)),
      };

      return yield* Effect.tryPromise({
        try: async (signal) => {
          let cacheKey = key;

          if (scopes.length > 0) {
            const generations = await run(
              evalScript<string[]>(
                READ_CACHE_GENERATIONS_SCRIPT,
                scopes.map((scope) => `cache-generation:v1:${scope}`),
                [
                  ...scopes.map(() => randomUUID()),
                  READ_CACHE_GENERATION_TTL_SECONDS,
                ],
              ),
            );

            // Capture before loading: an invalidated in-flight fill stays unreachable.
            cacheKey = `read-cache:v1:${generations.join(":")}:${key}`;
          }

          return fillJsonCache<T>(store, {
            ...fillOptions,
            key: cacheKey,
            signal,
            factory: async () => {
              const exit = await Effect.runPromiseExitWith(context)(factory, {
                signal,
              });

              if (Exit.isFailure(exit)) {
                factoryFailure = exit.cause;
                throw exit.cause;
              }

              filled = { value: exit.value };

              return exit.value;
            },
          });
        },
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) => {
          if (factoryFailure !== undefined)
            return Effect.failCause(factoryFailure);

          if (error instanceof CacheFillTimeoutError) return Effect.die(error);

          onError?.(error);

          return filled === undefined ? factory : Effect.succeed(filled.value);
        }),
      );
    });

  return {
    get,
    set,
    del,
    eval: evalScript,
    setNX,
    setNxGet: (key, value, ttlSeconds) =>
      send<string | null>(
        "SET",
        prefixKey(key),
        value,
        "NX",
        "GET",
        "EX",
        String(ttlSeconds),
      ),
    deleteIfValue: (key, value) =>
      evalScript<number>(RELEASE_LOCK_SCRIPT, [key], [value]),
    incr: (key) => send<number>("INCR", prefixKey(key)),
    expire: (key, ttlSeconds) =>
      send<number>("EXPIRE", prefixKey(key), String(ttlSeconds)),
    getJson,
    setJson: (key, value, ttlSeconds, codec = DEFAULT_JSON_SERIALIZER) =>
      set(key, codec.stringify(value), ttlSeconds),
    invalidateScopes: (...scopes) =>
      Effect.forEach(
        scopes,
        (scope) =>
          set(
            `cache-generation:v1:${scope}`,
            randomUUID(),
            READ_CACHE_GENERATION_TTL_SECONDS,
          ),
        { concurrency: "unbounded", discard: true },
      ),
    scan: (pattern) => {
      const keys: string[] = [];

      return forEachScanBatch(pattern, (matchedKeys) =>
        Effect.sync(() => {
          keys.push(...matchedKeys);
        }),
      ).pipe(Effect.map(() => keys.map(unprefixKey)));
    },
    deleteByPattern: (pattern, batchSize = DEFAULT_DELETE_BATCH_SIZE) => {
      let deletedCount = 0;

      return forEachScanBatch(pattern, (matchedKeys) =>
        Effect.forEach(chunk(matchedKeys, batchSize), (batch) =>
          send<number>("DEL", ...batch).pipe(
            Effect.map((deleted) => {
              deletedCount += deleted;
            }),
          ),
        ).pipe(Effect.asVoid),
      ).pipe(Effect.map(() => deletedCount));
    },
    rpush: (key, ...values) => send("RPUSH", prefixKey(key), ...values),
    ltrim: (key, start, stop) =>
      send("LTRIM", prefixKey(key), String(start), String(stop)),
    lrange: (key, start, stop) =>
      send("LRANGE", prefixKey(key), String(start), String(stop)),
    lrem: (key, count, value) =>
      send("LREM", prefixKey(key), String(count), value),
    getOrSetJson,
  };
};
