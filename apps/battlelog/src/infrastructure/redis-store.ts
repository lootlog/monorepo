import { RedisScriptCache } from "@lootlog/database/redis-script";
import {
  CacheFillTimeoutError,
  fillJsonCache,
} from "@lootlog/database/redis-cache-fill";
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
  stringify(value: T): string;
  parse(text: string): T;
}

export interface RedisGetOrSetJsonOptions<T> {
  readonly key: string;
  readonly ttlSeconds: number;
  readonly factory: () => Promise<T>;
  readonly lockTtlSeconds?: number;
  readonly waitTimeoutMs?: number;
  readonly waitIntervalMs?: number;
  readonly signal?: AbortSignal;
  readonly codec: JsonCodec<T>;
}

export interface RedisGetOrSetJsonBestEffortOptions<
  T,
> extends RedisGetOrSetJsonOptions<T> {
  readonly onError?: (cause: unknown) => void;
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

export const makeRedisStore = (
  redis: Redis.Redis["Service"],
  runEffect: <A>(effect: Effect.Effect<A, Redis.RedisError>) => Promise<A>,
  options: Pick<RedisOptions, "prefix"> = {},
) => {
  const { prefix } = options;
  const keyPrefix = prefix ?? "";
  const run = runEffect;
  const scripts = new RedisScriptCache();

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

    getOrSetJson<T>(options: RedisGetOrSetJsonOptions<T>): Promise<T> {
      return fillJsonCache<T>(redisStore, options);
    },

    async getOrSetJsonBestEffort<T>({
      onError,
      ...options
    }: RedisGetOrSetJsonBestEffortOptions<T>): Promise<T> {
      let factoryResult: { readonly value: T } | undefined;
      let factoryError: unknown;
      let factoryRejected = false;

      try {
        return await redisStore.getOrSetJson({
          ...options,
          factory: async () => {
            try {
              const value = await options.factory();
              factoryResult = { value };

              return value;
            } catch (error) {
              factoryRejected = true;
              factoryError = error;
              throw error;
            }
          },
        });
      } catch (error) {
        options.signal?.throwIfAborted();

        if (error instanceof CacheFillTimeoutError) throw error;

        if (factoryRejected) throw factoryError;
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
      const descriptor = scripts.get<TResult>(script, prefixedKeys.length);

      return run(redis.eval(descriptor)(...prefixedKeys, ...args.map(String)));
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
