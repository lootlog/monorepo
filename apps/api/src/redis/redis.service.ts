import { RedisScriptCache } from "@lootlog/database/redis-script";
import { randomUUID } from "node:crypto";
import {
  type CacheFillOptions,
  type CacheFillStore,
  getOrFillJson,
  type JsonCodec,
} from "@lootlog/database/redis-cache-fill";
import { Effect, Schema } from "effect";
import * as Redis from "effect/persistence/Redis";
import { chunk } from "es-toolkit";

const DEFAULT_JSON_SERIALIZER: Pick<JsonCodec<unknown>, "stringify"> = {
  stringify: (value) => JSON.stringify(value),
};

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

export interface RedisGetOrSetJsonOptions<T, E> extends CacheFillOptions<
  T,
  E,
  never
> {
  readonly scopes?: readonly string[];
}

const DEFAULT_SCAN_COUNT = 500;

const DEFAULT_DELETE_BATCH_SIZE = 500;

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
  readonly setNxGet: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<string | null, Redis.RedisError>;
  readonly deleteIfValue: (
    key: string,
    value: string,
  ) => Effect.Effect<number, Redis.RedisError>;
  readonly incr: (key: string) => Effect.Effect<number, Redis.RedisError>;
  readonly expire: (
    key: string,
    ttlSeconds: number,
  ) => Effect.Effect<number, Redis.RedisError>;
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
  readonly invalidateScopes: (
    ...scopes: string[]
  ) => Effect.Effect<void, Redis.RedisError>;
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
  readonly getOrSetJson: <T, E>(
    options: RedisGetOrSetJsonOptions<T, E>,
  ) => Effect.Effect<T, E>;
}

export interface RedisCommandTransport {
  readonly send: (
    command: string,
    ...args: ReadonlyArray<string>
  ) => Effect.Effect<unknown, Redis.RedisError>;
  readonly eval: Redis.Redis["Service"]["eval"];
}

const ScanReply = Schema.Tuple([
  Schema.String,
  Schema.mutable(Schema.Array(Schema.String)),
]);

const StringListReply = Schema.mutable(Schema.Array(Schema.String));

const NullableStringReply = Schema.NullOr(Schema.String);

const IntegerReply = Schema.Int;

const OkReply = Schema.Literal("OK");

export const makeRedisService = (
  redis: RedisCommandTransport,
  options: { readonly prefix?: string } = {},
): RedisService => {
  const prefix = options.prefix ?? "";
  const scripts = new RedisScriptCache();

  const send = <S extends Schema.Decoder<unknown>>(
    reply: S,
    command: string,
    ...args: ReadonlyArray<string>
  ): Effect.Effect<S["Type"], Redis.RedisError> =>
    redis.send(command, ...args).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(reply)),
      Effect.mapError((cause) =>
        cause instanceof Redis.RedisError
          ? cause
          : new Redis.RedisError({ cause }),
      ),
    );

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
        const [nextCursor, matchedKeys] = yield* send(
          ScanReply,
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

  const get: RedisService["get"] = (key) =>
    send(NullableStringReply, "GET", prefixKey(key));

  const set: RedisService["set"] = (key, value, ttlSeconds) =>
    (ttlSeconds
      ? redis.send("SET", prefixKey(key), value, "EX", String(ttlSeconds))
      : redis.send("SET", prefixKey(key), value)
    ).pipe(Effect.asVoid);

  const del: RedisService["del"] = (key) =>
    send(IntegerReply, "DEL", prefixKey(key));

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
      ? redis
          .send("SET", prefixKey(key), value, "EX", String(ttlSeconds), "NX")
          .pipe(Effect.map((result) => result === "OK"))
      : send(IntegerReply, "SETNX", prefixKey(key), value).pipe(
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

  const cacheFillStore: CacheFillStore<Redis.RedisError> = {
    getJson,
    setNX,
    eval: evalScript,
  };

  const getOrSetJson = <T, E>({
    key,
    scopes = [],
    ...options
  }: RedisGetOrSetJsonOptions<T, E>): Effect.Effect<T, E> => {
    if (scopes.length === 0)
      return getOrFillJson(cacheFillStore, { ...options, key });

    return evalScript<string[]>(
      READ_CACHE_GENERATIONS_SCRIPT,
      scopes.map((scope) => `cache-generation:v1:${scope}`),
      [...scopes.map(() => randomUUID()), READ_CACHE_GENERATION_TTL_SECONDS],
    ).pipe(
      Effect.matchEffect({
        onFailure: (error) =>
          (options.onError?.(error) ?? Effect.void).pipe(
            Effect.andThen(options.factory),
          ),
        onSuccess: (generations) =>
          getOrFillJson(cacheFillStore, {
            ...options,
            key: `read-cache:v1:${generations.join(":")}:${key}`,
          }),
      }),
    );
  };

  return {
    get,
    set,
    del,
    eval: evalScript,
    setNX,
    setNxGet: (key, value, ttlSeconds) =>
      send(
        NullableStringReply,
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
    incr: (key) => send(IntegerReply, "INCR", prefixKey(key)),
    expire: (key, ttlSeconds) =>
      send(IntegerReply, "EXPIRE", prefixKey(key), String(ttlSeconds)),
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
    scan: (pattern) =>
      Effect.suspend(() => {
        const keys: string[] = [];

        return forEachScanBatch(pattern, (matchedKeys) =>
          Effect.sync(() => {
            keys.push(...matchedKeys);
          }),
        ).pipe(Effect.map(() => keys.map(unprefixKey)));
      }),
    deleteByPattern: (pattern, batchSize = DEFAULT_DELETE_BATCH_SIZE) =>
      Effect.suspend(() => {
        let deletedCount = 0;

        return forEachScanBatch(pattern, (matchedKeys) =>
          Effect.forEach(chunk(matchedKeys, batchSize), (batch) =>
            send(IntegerReply, "DEL", ...batch).pipe(
              Effect.map((deleted) => {
                deletedCount += deleted;
              }),
            ),
          ).pipe(Effect.asVoid),
        ).pipe(Effect.map(() => deletedCount));
      }),
    rpush: (key, ...values) =>
      send(IntegerReply, "RPUSH", prefixKey(key), ...values),
    ltrim: (key, start, stop) =>
      send(OkReply, "LTRIM", prefixKey(key), String(start), String(stop)),
    lrange: (key, start, stop) =>
      send(
        StringListReply,
        "LRANGE",
        prefixKey(key),
        String(start),
        String(stop),
      ),
    lrem: (key, count, value) =>
      send(IntegerReply, "LREM", prefixKey(key), String(count), value),
    getOrSetJson,
  };
};
