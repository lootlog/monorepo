import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { Effect, Schema } from "effect";
import * as Redis from "effect/unstable/persistence/Redis";

export interface RedisOptions {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
  readonly username?: string;
  readonly prefix?: string;
  readonly lazyConnect?: boolean;
}

export interface JsonCodec<T> {
  stringify(value: unknown): string;
  parse(text: string): T;
}

export interface RedisGetOrSetJsonOptions<T> {
  readonly key: string;
  readonly ttlSeconds: number;
  readonly factory: () => Promise<T>;
  readonly lockTtlSeconds?: number;
  readonly waitTimeoutMs?: number;
  readonly waitIntervalMs?: number;
  readonly codec: JsonCodec<T>;
}

export interface RedisGetOrSetJsonBestEffortOptions<
  T,
> extends RedisGetOrSetJsonOptions<T> {
  readonly onError?: (error: unknown) => void;
}

const decodeJsonUnknown = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Unknown),
);

export const makeJsonCodec = <S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
): JsonCodec<S["Type"]> => {
  const decodeValue = Schema.decodeUnknownSync(schema);
  return {
    stringify: (value) => JSON.stringify(value),
    parse: (text) => decodeValue(decodeJsonUnknown(text)),
  };
};

const releaseLockScript = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export const makeRedisStore = (
  redis: Redis.Redis["Service"],
  runEffect: <A>(effect: Effect.Effect<A, Redis.RedisError>) => Promise<A>,
  options: Pick<RedisOptions, "prefix"> = {},
) => {
  const { prefix } = options;
  const keyPrefix = prefix ?? "";
  const run = runEffect;
  const scripts = new Map<string, Redis.Script<any>>();
  const prefixKey = (key: string): string =>
    keyPrefix ? `${keyPrefix}:${key}` : key;

  const redisStore = {
    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
      const prefixedKey = prefixKey(key);
      if (ttlSeconds !== undefined) {
        await run(
          redis.send("SET", prefixedKey, value, "EX", String(ttlSeconds)),
        );
        return;
      }
      await run(redis.send("SET", prefixedKey, value));
    },

    get(key: string): Promise<string | null> {
      return run(redis.send("GET", prefixKey(key)));
    },

    async getJson<T>(key: string, codec: JsonCodec<T>): Promise<T | null> {
      const cached = await redisStore.get(key);
      if (cached === null) return null;

      try {
        return codec.parse(cached);
      } catch {
        await run(redis.send("DEL", prefixKey(key)));
        return null;
      }
    },

    async setJson<T>(
      key: string,
      value: T,
      ttlSeconds?: number,
      codec?: JsonCodec<T>,
    ): Promise<void> {
      await redisStore.set(
        key,
        codec?.stringify(value) ?? JSON.stringify(value),
        ttlSeconds,
      );
    },

    async getOrSetJson<T>({
      key,
      ttlSeconds,
      factory,
      lockTtlSeconds = 10,
      waitTimeoutMs = 2_000,
      waitIntervalMs = 50,
      codec,
    }: RedisGetOrSetJsonOptions<T>): Promise<T> {
      const cached = await redisStore.getJson<T>(key, codec);
      if (cached !== null) return cached;

      const lockKey = `${key}:single-flight`;
      const lockToken = randomUUID();
      const lockAcquired = await redisStore.setNX(
        lockKey,
        lockToken,
        lockTtlSeconds,
      );

      if (!lockAcquired) {
        const deadline = Date.now() + waitTimeoutMs;
        while (Date.now() < deadline) {
          await sleep(waitIntervalMs);
          const cachedAfterWait = await redisStore.getJson<T>(key, codec);
          if (cachedAfterWait !== null) return cachedAfterWait;
        }
        const value = await factory();
        await redisStore.setJson(key, value, ttlSeconds, codec);
        return value;
      }

      try {
        const cachedAfterLock = await redisStore.getJson<T>(key, codec);
        if (cachedAfterLock !== null) return cachedAfterLock;
        const value = await factory();
        await redisStore.setJson(key, value, ttlSeconds, codec);
        return value;
      } finally {
        try {
          await redisStore.eval<number>(
            releaseLockScript,
            [lockKey],
            [lockToken],
          );
        } catch {
          // The lock expires after its bounded TTL.
        }
      }
    },

    async getOrSetJsonBestEffort<T>({
      onError,
      ...options
    }: RedisGetOrSetJsonBestEffortOptions<T>): Promise<T> {
      let factoryResult: { readonly value: T } | undefined;
      let factoryError: unknown;

      try {
        return await redisStore.getOrSetJson({
          ...options,
          factory: async () => {
            try {
              const value = await options.factory();
              factoryResult = { value };
              return value;
            } catch (error) {
              factoryError = error;
              throw error;
            }
          },
        });
      } catch (error) {
        if (factoryError !== undefined) throw factoryError;
        onError?.(error);
        if (factoryResult !== undefined) return factoryResult.value;
        return options.factory();
      }
    },

    async deleteByPattern(pattern: string, batchSize = 500): Promise<number> {
      const prefixedPattern = prefixKey(pattern);
      let cursor = "0";
      let deletedCount = 0;
      do {
        const [nextCursor, keys] = await run(
          redis.send<[string, string[]]>(
            "SCAN",
            cursor,
            "MATCH",
            prefixedPattern,
            "COUNT",
            "500",
          ),
        );
        cursor = nextCursor;
        for (let index = 0; index < keys.length; index += batchSize) {
          const batch = keys.slice(index, index + batchSize);
          if (batch.length > 0) {
            deletedCount += await run(redis.send<number>("DEL", ...batch));
          }
        }
      } while (cursor !== "0");
      return deletedCount;
    },

    async setNX(
      key: string,
      value: string,
      ttlSeconds?: number,
    ): Promise<boolean> {
      const prefixedKey = prefixKey(key);
      if (ttlSeconds !== undefined) {
        return (
          (await run(
            redis.send(
              "SET",
              prefixedKey,
              value,
              "EX",
              String(ttlSeconds),
              "NX",
            ),
          )) === "OK"
        );
      }
      return (await run(redis.send<number>("SETNX", prefixedKey, value))) === 1;
    },

    eval<TResult = unknown>(
      script: string,
      keys: readonly string[],
      args: ReadonlyArray<string | number> = [],
    ): Promise<TResult> {
      const prefixedKeys = keys.map((key) => prefixKey(key));
      const cacheKey = `${prefixedKeys.length}:${script}`;
      let descriptor = scripts.get(cacheKey);
      if (descriptor === undefined) {
        descriptor = Redis.script(
          (...parameters: ReadonlyArray<unknown>) => parameters,
          { lua: script, numberOfKeys: prefixedKeys.length },
        ).withReturnType<TResult>();
        scripts.set(cacheKey, descriptor);
      }
      return run(
        redis.eval(descriptor)(...prefixedKeys, ...args.map(String)),
      ) as Promise<TResult>;
    },

    del(...keys: string[]): Promise<number> {
      return run(redis.send("DEL", ...keys.map(prefixKey)));
    },

    zadd(key: string, score: number, member: string): Promise<number> {
      return run(redis.send("ZADD", prefixKey(key), String(score), member));
    },

    zcard(key: string): Promise<number> {
      return run(redis.send("ZCARD", prefixKey(key)));
    },

    zrange(key: string, start: number, stop: number): Promise<string[]> {
      return run(
        redis.send("ZRANGE", prefixKey(key), String(start), String(stop)),
      );
    },

    zrem(key: string, ...members: string[]): Promise<number> {
      return run(redis.send("ZREM", prefixKey(key), ...members));
    },

    zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
      return run(
        redis.send(
          "ZREMRANGEBYRANK",
          prefixKey(key),
          String(start),
          String(stop),
        ),
      );
    },
  };

  return redisStore;
};

export type RedisStore = ReturnType<typeof makeRedisStore>;
