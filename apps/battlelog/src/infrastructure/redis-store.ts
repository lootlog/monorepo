import { RedisScriptCache } from "@lootlog/database/redis-script";
import {
  type CacheFillOptions,
  type CacheFillStore,
  getOrFillJson,
  type JsonCodec,
} from "@lootlog/database/redis-cache-fill";
import { Effect } from "effect";
import type * as Redis from "effect/persistence/Redis";

export const makeRedisStore = (redis: Redis.Redis["Service"]) => {
  const scripts = new RedisScriptCache();

  const set = (key: string, value: string, ttlSeconds?: number) =>
    (ttlSeconds === undefined
      ? redis.send("SET", key, value)
      : redis.send("SET", key, value, "EX", String(ttlSeconds))
    ).pipe(Effect.asVoid);

  const get = (key: string) => redis.send<string | null>("GET", key);

  const del = (...keys: string[]) => redis.send<number>("DEL", ...keys);

  const getJson = <T>(key: string, codec: Pick<JsonCodec<T>, "parse">) =>
    get(key).pipe(
      Effect.flatMap((cached) =>
        cached === null
          ? Effect.succeed(null)
          : Effect.try(() => codec.parse(cached)).pipe(
              Effect.catch(() => del(key).pipe(Effect.as(null))),
            ),
      ),
    );

  const setNX = (key: string, value: string, ttlSeconds: number) =>
    redis
      .send("SET", key, value, "EX", String(ttlSeconds), "NX")
      .pipe(Effect.map((reply) => reply === "OK"));

  const evalScript = <TResult>(
    script: string,
    keys: readonly string[],
    args: ReadonlyArray<string | number> = [],
  ) =>
    redis.eval(scripts.get<TResult>(script, keys.length))(
      ...keys,
      ...args.map(String),
    );

  const cacheFillStore: CacheFillStore<Redis.RedisError> = {
    getJson,
    setNX,
    eval: evalScript,
  };

  /**
   * Reads a JSON value, or lets one caller fill it while the others wait. A
   * Redis failure runs `factory` uncached; a `factory` failure fails the read.
   */
  const getOrSetJson = <T, E, R>(
    options: CacheFillOptions<T, E, R>,
  ): Effect.Effect<T, E, R> => getOrFillJson(cacheFillStore, options);

  return {
    set,
    get,
    del,
    getJson,
    setJson: <T>(key: string, value: T, ttlSeconds?: number) =>
      set(key, JSON.stringify(value), ttlSeconds),
    setNX,
    evalScript,
    getOrSetJson,
    expire: (key: string, ttlSeconds: number) =>
      redis.send<number>("EXPIRE", key, String(ttlSeconds)),
    zremrangebyscore: (key: string, min: number | "-inf", max: number) =>
      redis.send<number>("ZREMRANGEBYSCORE", key, String(min), String(max)),
    zadd: (key: string, score: number, member: string) =>
      redis.send<number>("ZADD", key, String(score), member),
    zcard: (key: string) => redis.send<number>("ZCARD", key),
    zrange: (key: string, start: number, stop: number) =>
      redis.send<string[]>("ZRANGE", key, String(start), String(stop)),
    zrem: (key: string, ...members: string[]) =>
      redis.send<number>("ZREM", key, ...members),
  };
};

export type RedisStore = ReturnType<typeof makeRedisStore>;
