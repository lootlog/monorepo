import { RedisScriptCache } from "@lootlog/database/redis-script";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { type Cause, Effect, Exit, Schema } from "effect";
import * as Redis from "effect/unstable/persistence/Redis";

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
  serialization: {
    readonly parse: (text: string) => unknown;
    readonly stringify: (value: unknown) => string;
  } = {
    parse: decodeJsonUnknown,
    stringify: JSON.stringify,
  },
): JsonCodec<S["Type"]> => {
  const decodeValue = Schema.decodeUnknownSync(schema);
  return {
    stringify: serialization.stringify,
    parse: (text) => decodeValue(serialization.parse(text)),
  };
};

export interface RedisGetOrSetJsonOptions<T> {
  key: string;
  ttlSeconds: number;
  factory: () => Promise<T>;
  lockTtlSeconds?: number;
  waitTimeoutMs?: number;
  waitIntervalMs?: number;
  codec: JsonCodec<T>;
}

export interface RedisGetOrSetJsonBestEffortOptions<
  T,
> extends RedisGetOrSetJsonOptions<T> {
  onError?: (error: unknown) => void;
}

const DEFAULT_SCAN_COUNT = 500;
const DEFAULT_DELETE_BATCH_SIZE = 500;
const DEFAULT_SINGLE_FLIGHT_LOCK_TTL_SECONDS = 10;
const DEFAULT_SINGLE_FLIGHT_WAIT_TIMEOUT_MS = 2_000;
const DEFAULT_SINGLE_FLIGHT_WAIT_INTERVAL_MS = 50;

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

// Only ephemeral read caches participate. Wrapped and authorization caches retain
// their existing key and invalidation contracts.
const readCacheScopes = (key: string): string[] => {
  const match = /^(timer:list|loots:list|loot-stats):([^:]+):/.exec(key);
  if (match) return [`${match[1]}:${match[2]}`];
  const kills =
    /^kill-stats:(user-[^:]+|guild-[^:]+|member-kills):([^:]+):/.exec(key);
  if (kills)
    return [
      `kill-stats:${kills[1]?.startsWith("user-") ? "user" : "guild"}:${kills[2]}`,
    ];
  const event = /^event-read:v2:([^:]+):([^:]+):/.exec(key);
  return event
    ? [`event-read:v2:${event[1]}`, `event-read:v2:${event[1]}:${event[2]}`]
    : [];
};

const readCacheScopePattern = (pattern: string): string | undefined => {
  const kills = /^kill-stats:(user-\*|guild-\*|member-kills):([^:*]+):\*$/.exec(
    pattern,
  );
  if (kills)
    return `kill-stats:${kills[1] === "user-*" ? "user" : "guild"}:${kills[2]}`;
  return /^(?:(?:timer:list|loots:list|loot-stats):[^:*]+|event-read:v2:[^:*]+(?::[^:*]+)?):\*$/.test(
    pattern,
  )
    ? pattern.slice(0, -2)
    : undefined;
};

const READ_CACHE_GENERATIONS_SCRIPT = `
local versions = {}
for i, key in ipairs(KEYS) do
  local version = redis.call("GET", key)
  if not version then
    version = ARGV[i]
    redis.call("SET", key, version)
  end
  versions[i] = version
end
return versions
`;

export class RedisService {
  private readonly prefix: string;
  private readonly scripts = new RedisScriptCache();

  constructor(
    private readonly redis: Redis.Redis["Service"],
    options: { prefix?: string },
    private readonly run: <A>(
      effect: Effect.Effect<A, Redis.RedisError>,
    ) => Promise<A>,
  ) {
    this.prefix = options.prefix ?? "";
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

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const prefixedKey = this.prefixKey(key);
    if (ttlSeconds) {
      await this.run(
        this.redis.send("SET", prefixedKey, value, "EX", String(ttlSeconds)),
      );
    } else {
      await this.run(this.redis.send("SET", prefixedKey, value));
    }
  }

  async get(key: string): Promise<string | null> {
    return this.run(this.redis.send("GET", this.prefixKey(key)));
  }

  async getJson<T>(key: string, codec: JsonCodec<T>): Promise<T | null> {
    const cached = await this.get(key);

    if (cached === null) {
      return null;
    }

    try {
      return codec.parse(cached);
    } catch {
      await this.del(key);
      return null;
    }
  }

  async setJson<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
    codec: Pick<JsonCodec<T>, "stringify"> = DEFAULT_JSON_SERIALIZER,
  ): Promise<void> {
    await this.set(key, codec.stringify(value), ttlSeconds);
  }

  async getOrSetJson<T>({
    key,
    ttlSeconds,
    factory,
    lockTtlSeconds = DEFAULT_SINGLE_FLIGHT_LOCK_TTL_SECONDS,
    waitTimeoutMs = DEFAULT_SINGLE_FLIGHT_WAIT_TIMEOUT_MS,
    waitIntervalMs = DEFAULT_SINGLE_FLIGHT_WAIT_INTERVAL_MS,
    codec,
  }: RedisGetOrSetJsonOptions<T>): Promise<T> {
    const scopes = readCacheScopes(key);
    if (scopes.length > 0) {
      const generations = await this.eval<string[]>(
        READ_CACHE_GENERATIONS_SCRIPT,
        scopes.map((scope) => `cache-generation:v1:${scope}`),
        scopes.map(() => randomUUID()),
      );
      // Capture before loading: an invalidated in-flight fill stays unreachable.
      key = `read-cache:v1:${generations.join(":")}:${key}`;
    }
    const cached = await this.getJson<T>(key, codec);

    if (cached !== null) {
      return cached;
    }

    const lockKey = `${key}:single-flight`;
    const lockToken = randomUUID();
    const lockAcquired = await this.setNX(lockKey, lockToken, lockTtlSeconds);

    if (!lockAcquired) {
      const cachedAfterWait = await this.waitForJsonCache<T>(
        key,
        waitTimeoutMs,
        waitIntervalMs,
        codec,
      );

      if (cachedAfterWait !== null) {
        return cachedAfterWait;
      }

      const value = await factory();
      await this.setJson(key, value, ttlSeconds, codec);
      return value;
    }

    try {
      const cachedAfterLock = await this.getJson<T>(key, codec);

      if (cachedAfterLock !== null) {
        return cachedAfterLock;
      }

      const value = await factory();
      await this.setJson(key, value, ttlSeconds, codec);
      return value;
    } finally {
      await this.releaseSingleFlightLock(lockKey, lockToken);
    }
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
    options: Omit<RedisGetOrSetJsonBestEffortOptions<T>, "factory"> & {
      factory: Effect.Effect<T, E>;
    },
  ): Effect.Effect<T, E> {
    return Effect.gen(
      function* (this: RedisService) {
        const context = yield* Effect.context();
        let failure: Cause.Cause<E> | undefined;
        return yield* Effect.tryPromise({
          try: (signal) =>
            this.getOrSetJsonBestEffort({
              ...options,
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

  private async waitForJsonCache<T>(
    key: string,
    waitTimeoutMs: number,
    waitIntervalMs: number,
    codec: JsonCodec<T>,
  ): Promise<T | null> {
    const deadline = Date.now() + waitTimeoutMs;

    while (Date.now() < deadline) {
      await sleep(waitIntervalMs);

      const cached = await this.getJson<T>(key, codec);

      if (cached !== null) {
        return cached;
      }
    }

    return null;
  }

  private async releaseSingleFlightLock(
    lockKey: string,
    lockToken: string,
  ): Promise<void> {
    try {
      await this.eval<number>(RELEASE_LOCK_SCRIPT, [lockKey], [lockToken]);
    } catch {
      // The lock has a short TTL; a release failure should not fail the read.
    }
  }

  async del(key: string): Promise<number> {
    return this.run(this.redis.send("DEL", this.prefixKey(key)));
  }

  async deleteByPattern(
    pattern: string,
    batchSize = DEFAULT_DELETE_BATCH_SIZE,
  ): Promise<number> {
    const scope = readCacheScopePattern(pattern);
    if (scope !== undefined) {
      await this.set(`cache-generation:v1:${scope}`, randomUUID());
      // Entries expire by TTL; no keys are physically deleted on this path.
      return 0;
    }
    const prefixedPattern = this.prefixKey(pattern);
    let cursor = "0";
    let deletedCount = 0;

    do {
      const [nextCursor, matchedKeys] = await this.run(
        this.redis.send<[string, string[]]>(
          "SCAN",
          cursor,
          "MATCH",
          prefixedPattern,
          "COUNT",
          String(DEFAULT_SCAN_COUNT),
        ),
      );
      cursor = nextCursor;

      for (let index = 0; index < matchedKeys.length; index += batchSize) {
        const batch = matchedKeys.slice(index, index + batchSize);

        if (batch.length > 0) {
          deletedCount += await this.run(
            this.redis.send<number>("DEL", ...batch),
          );
        }
      }
    } while (cursor !== "0");

    return deletedCount;
  }

  async setNX(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<boolean> {
    const prefixedKey = this.prefixKey(key);
    if (ttlSeconds) {
      const result = await this.run(
        this.redis.send(
          "SET",
          prefixedKey,
          value,
          "EX",
          String(ttlSeconds),
          "NX",
        ),
      );
      return result === "OK";
    }
    const result = await this.run(
      this.redis.send<number>("SETNX", prefixedKey, value),
    );
    return result === 1;
  }

  async incr(key: string): Promise<number> {
    return this.run(this.redis.send("INCR", this.prefixKey(key)));
  }

  async decr(key: string): Promise<number> {
    return this.run(this.redis.send("DECR", this.prefixKey(key)));
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
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

  async eval<TResult = unknown>(
    script: string,
    keys: string[],
    args: Array<string | number> = [],
  ): Promise<TResult> {
    const prefixedKeys = keys.map((k) => this.prefixKey(k));
    const descriptor = this.scripts.get<TResult>(script, prefixedKeys.length);
    return this.run(
      this.redis.eval(descriptor)(...prefixedKeys, ...args.map(String)),
    );
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.run(this.redis.send("HSET", this.prefixKey(key), field, value));
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.run(this.redis.send("HGET", this.prefixKey(key), field));
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.run(this.redis.send("HGETALL", this.prefixKey(key)));
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.run(this.redis.send("HDEL", this.prefixKey(key), field));
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.run(this.redis.send("RPUSH", this.prefixKey(key), ...values));
  }

  async ltrim(key: string, start: number, stop: number): Promise<"OK"> {
    return this.run(
      this.redis.send(
        "LTRIM",
        this.prefixKey(key),
        String(start),
        String(stop),
      ),
    );
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.run(
      this.redis.send(
        "LRANGE",
        this.prefixKey(key),
        String(start),
        String(stop),
      ),
    );
  }

  async lset(key: string, index: number, value: string): Promise<"OK"> {
    return this.run(
      this.redis.send("LSET", this.prefixKey(key), String(index), value),
    );
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    return this.run(
      this.redis.send("LREM", this.prefixKey(key), String(count), value),
    );
  }

  async llen(key: string): Promise<number> {
    return this.run(this.redis.send("LLEN", this.prefixKey(key)));
  }

  async scan(pattern: string): Promise<string[]> {
    const prefixedPattern = this.prefixKey(pattern);
    const keys: string[] = [];
    let cursor = "0";

    do {
      const [nextCursor, matchedKeys] = await this.run(
        this.redis.send<[string, string[]]>(
          "SCAN",
          cursor,
          "MATCH",
          prefixedPattern,
          "COUNT",
          String(DEFAULT_SCAN_COUNT),
        ),
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== "0");

    return keys.map((key) => this.unprefixKey(key));
  }
}
