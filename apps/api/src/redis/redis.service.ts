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

export interface RedisGetOrSetJsonOptions<T> {
  key: string;
  scopes?: readonly string[];
  ttlSeconds: number;
  factory: () => Promise<T>;
  lockTtlSeconds?: number;
  waitTimeoutMs?: number;
  waitIntervalMs?: number;
  signal?: AbortSignal;
  codec: JsonCodec<T>;
}

export interface RedisGetOrSetJsonBestEffortOptions<
  T,
> extends RedisGetOrSetJsonOptions<T> {
  onError?: (error: unknown) => void;
}

export type RedisGetOrSetJsonEffectOptions<T, E> = Omit<
  RedisGetOrSetJsonBestEffortOptions<T>,
  "factory"
> & {
  factory: Effect.Effect<T, E>;
};

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
export interface RedisEffects {
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
   * failures fall back to the factory; only the factory's errors surface.
   */
  readonly getOrSetJson: <T, E>(
    options: RedisGetOrSetJsonEffectOptions<T, E>,
  ) => Effect.Effect<T, E>;
}

export class RedisService {
  private readonly prefix: string;
  private readonly scripts = new RedisScriptCache();
  readonly effect: RedisEffects;

  constructor(
    private readonly redis: Redis.Redis["Service"],
    options: { prefix?: string },
    private readonly run: <A>(
      effect: Effect.Effect<A, Redis.RedisError>,
    ) => Promise<A>,
  ) {
    this.prefix = options.prefix ?? "";
    this.effect = this.makeEffects();
  }

  private prefixKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  private unprefixKey(key: string): string {
    const prefix = `${this.prefix}:`;

    return this.prefix && key.startsWith(prefix)
      ? key.slice(prefix.length)
      : key;
  }

  private forEachScanBatch(
    pattern: string,
    onBatch: (keys: string[]) => Effect.Effect<void, Redis.RedisError>,
  ): Effect.Effect<void, Redis.RedisError> {
    return Effect.gen({ self: this }, function* () {
      const prefixedPattern = this.prefixKey(pattern);
      let cursor = "0";

      do {
        const [nextCursor, matchedKeys] = yield* this.redis.send<
          [string, string[]]
        >(
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
  }

  private makeEffects(): RedisEffects {
    const send: Redis.Redis["Service"]["send"] = (command, ...args) =>
      this.redis.send(command, ...args);

    const get: RedisEffects["get"] = (key) => send("GET", this.prefixKey(key));

    const set: RedisEffects["set"] = (key, value, ttlSeconds) =>
      (ttlSeconds
        ? send("SET", this.prefixKey(key), value, "EX", String(ttlSeconds))
        : send("SET", this.prefixKey(key), value)
      ).pipe(Effect.asVoid);

    const del: RedisEffects["del"] = (key) => send("DEL", this.prefixKey(key));

    const evalScript = <T = unknown>(
      script: string,
      keys: ReadonlyArray<string>,
      args: ReadonlyArray<string | number> = [],
    ) => {
      const prefixedKeys = keys.map((key) => this.prefixKey(key));

      return this.redis.eval(this.scripts.get<T>(script, prefixedKeys.length))(
        ...prefixedKeys,
        ...args.map(String),
      );
    };

    return {
      get,
      set,
      del,
      eval: evalScript,
      setNX: (key, value, ttlSeconds) =>
        ttlSeconds
          ? send(
              "SET",
              this.prefixKey(key),
              value,
              "EX",
              String(ttlSeconds),
              "NX",
            ).pipe(Effect.map((result) => result === "OK"))
          : send<number>("SETNX", this.prefixKey(key), value).pipe(
              Effect.map((result) => result === 1),
            ),
      setNxGet: (key, value, ttlSeconds) =>
        send<string | null>(
          "SET",
          this.prefixKey(key),
          value,
          "NX",
          "GET",
          "EX",
          String(ttlSeconds),
        ),
      deleteIfValue: (key, value) =>
        evalScript<number>(RELEASE_LOCK_SCRIPT, [key], [value]),
      getJson: (key, codec) =>
        get(key).pipe(
          Effect.flatMap((cached) =>
            cached === null
              ? Effect.succeed(null)
              : Effect.try({
                  try: () => codec.parse(cached),
                  catch: () => null,
                }).pipe(Effect.catch(() => del(key).pipe(Effect.as(null)))),
          ),
        ),
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
      deleteByPattern: (pattern, batchSize = DEFAULT_DELETE_BATCH_SIZE) => {
        let deletedCount = 0;

        return this.forEachScanBatch(pattern, (matchedKeys) =>
          Effect.forEach(chunk(matchedKeys, batchSize), (batch) =>
            send<number>("DEL", ...batch).pipe(
              Effect.map((deleted) => {
                deletedCount += deleted;
              }),
            ),
          ).pipe(Effect.asVoid),
        ).pipe(Effect.map(() => deletedCount));
      },
      rpush: (key, ...values) => send("RPUSH", this.prefixKey(key), ...values),
      ltrim: (key, start, stop) =>
        send("LTRIM", this.prefixKey(key), String(start), String(stop)),
      lrange: (key, start, stop) =>
        send("LRANGE", this.prefixKey(key), String(start), String(stop)),
      lrem: (key, count, value) =>
        send("LREM", this.prefixKey(key), String(count), value),
      getOrSetJson: (options) => this.getOrSetJsonEffect(options),
    };
  }

  set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    return this.run(this.effect.set(key, value, ttlSeconds));
  }

  get(key: string): Promise<string | null> {
    return this.run(this.effect.get(key));
  }

  getJson<T>(key: string, codec: JsonCodec<T>): Promise<T | null> {
    return this.run(this.effect.getJson(key, codec));
  }

  setJson<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
    codec: Pick<JsonCodec<T>, "stringify"> = DEFAULT_JSON_SERIALIZER,
  ): Promise<void> {
    return this.run(this.effect.setJson(key, value, ttlSeconds, codec));
  }

  async getOrSetJson<T>({
    key,
    scopes = [],
    ttlSeconds,
    factory,
    ...options
  }: RedisGetOrSetJsonOptions<T>): Promise<T> {
    if (scopes.length > 0) {
      const generations = await this.eval<string[]>(
        READ_CACHE_GENERATIONS_SCRIPT,
        scopes.map((scope) => `cache-generation:v1:${scope}`),
        [...scopes.map(() => randomUUID()), READ_CACHE_GENERATION_TTL_SECONDS],
      );

      // Capture before loading: an invalidated in-flight fill stays unreachable.
      key = `read-cache:v1:${generations.join(":")}:${key}`;
    }

    return fillJsonCache<T>(this, { key, ttlSeconds, factory, ...options });
  }

  async getOrSetJsonBestEffort<T>({
    onError,
    ...options
  }: RedisGetOrSetJsonBestEffortOptions<T>): Promise<T> {
    let factoryResult: { value: T } | null = null;
    let factoryRejected = false;
    let factoryError: unknown;

    const guardedFactory = async () => {
      try {
        const value = await options.factory();
        factoryResult = { value };

        return value;
      } catch (error) {
        factoryRejected = true;
        factoryError = error;
        throw error;
      }
    };

    try {
      return await this.getOrSetJson({
        ...options,
        factory: guardedFactory,
      });
    } catch (error) {
      options.signal?.throwIfAborted();

      if (error instanceof CacheFillTimeoutError) throw error;

      if (factoryRejected) {
        return Promise.reject(factoryError);
      }

      onError?.(error);

      if (factoryResult) {
        return factoryResult.value;
      }

      return options.factory();
    }
  }

  getOrSetJsonEffect<T, E>(
    options: RedisGetOrSetJsonEffectOptions<T, E>,
  ): Effect.Effect<T, E> {
    return Effect.gen(
      function* (this: RedisService) {
        const context = yield* Effect.context();
        let failure: Cause.Cause<E> | undefined;

        return yield* Effect.tryPromise({
          try: (signal) =>
            this.getOrSetJsonBestEffort({
              ...options,
              signal,
              factory: async () => {
                const exit = await Effect.runPromiseExitWith(context)(
                  options.factory,
                  { signal },
                );

                if (Exit.isFailure(exit)) {
                  failure = exit.cause;
                  throw exit.cause;
                }

                return exit.value;
              },
            }),
          catch: (error) => error,
        }).pipe(
          Effect.catch((error) =>
            failure === undefined
              ? Effect.die(error)
              : Effect.failCause(failure),
          ),
        );
      }.bind(this),
    );
  }

  deleteIfValue(key: string, value: string): Promise<number> {
    return this.run(this.effect.deleteIfValue(key, value));
  }

  del(key: string): Promise<number> {
    return this.run(this.effect.del(key));
  }

  invalidateScopes(...scopes: string[]): Promise<void> {
    return this.run(this.effect.invalidateScopes(...scopes));
  }

  deleteByPattern(pattern: string, batchSize?: number): Promise<number> {
    return this.run(this.effect.deleteByPattern(pattern, batchSize));
  }

  setNX(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    return this.run(this.effect.setNX(key, value, ttlSeconds));
  }

  setNxGet(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<string | null> {
    return this.run(this.effect.setNxGet(key, value, ttlSeconds));
  }

  incr(key: string): Promise<number> {
    return this.run(this.redis.send("INCR", this.prefixKey(key)));
  }

  expire(key: string, ttlSeconds: number): Promise<number> {
    return this.run(
      this.redis.send("EXPIRE", this.prefixKey(key), String(ttlSeconds)),
    );
  }

  flushall(): Promise<"OK"> {
    return this.run(this.redis.send("FLUSHALL"));
  }

  pttl(key: string): Promise<number> {
    return this.run(this.redis.send("PTTL", this.prefixKey(key)));
  }

  pexpire(key: string, ttlMilliseconds: number): Promise<number> {
    return this.run(
      this.redis.send("PEXPIRE", this.prefixKey(key), String(ttlMilliseconds)),
    );
  }

  eval<TResult = unknown>(
    script: string,
    keys: string[],
    args: Array<string | number> = [],
  ): Promise<TResult> {
    return this.run(this.effect.eval<TResult>(script, keys, args));
  }

  rpush(key: string, ...values: string[]): Promise<number> {
    return this.run(this.effect.rpush(key, ...values));
  }

  ltrim(key: string, start: number, stop: number): Promise<"OK"> {
    return this.run(this.effect.ltrim(key, start, stop));
  }

  lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.run(this.effect.lrange(key, start, stop));
  }

  lrem(key: string, count: number, value: string): Promise<number> {
    return this.run(this.effect.lrem(key, count, value));
  }

  async scan(pattern: string): Promise<string[]> {
    const keys: string[] = [];

    await this.run(
      this.forEachScanBatch(pattern, (matchedKeys) =>
        Effect.sync(() => {
          keys.push(...matchedKeys);
        }),
      ),
    );

    return keys.map((key) => this.unprefixKey(key));
  }
}
