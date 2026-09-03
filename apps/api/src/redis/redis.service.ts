import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { Effect, Schema } from "effect";
import * as Redis from "effect/unstable/persistence/Redis";

export const REDIS_MODULE_OPTIONS = Symbol("REDIS_MODULE_OPTIONS");

export interface RedisModuleOptions {
  host: string;
  port: number;
  password?: string;
  username?: string;
  prefix?: string;
}

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

export class RedisService {
  private readonly prefix: string;
  private readonly scripts = new Map<string, Redis.Script<any>>();

  constructor(
    private readonly redis: Redis.Redis["Service"],
    options: Pick<RedisModuleOptions, "prefix">,
    private readonly runEffect: <A>(
      effect: Effect.Effect<A, Redis.RedisError>,
    ) => Promise<A>,
  ) {
    this.prefix = options.prefix ?? "";
  }

  private run<A>(effect: Effect.Effect<A, Redis.RedisError>): Promise<A> {
    return this.runEffect(effect);
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
    const cacheKey = `${prefixedKeys.length}:${script}`;
    let descriptor = this.scripts.get(cacheKey);
    if (descriptor === undefined) {
      descriptor = Redis.script(
        (...parameters: ReadonlyArray<unknown>) => parameters,
        { lua: script, numberOfKeys: prefixedKeys.length },
      ).withReturnType<TResult>();
      this.scripts.set(cacheKey, descriptor);
    }
    return this.run(
      this.redis.eval(descriptor)(...prefixedKeys, ...args.map(String)),
    ) as Promise<TResult>;
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
