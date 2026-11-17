import { RedisScriptCache } from "@lootlog/database/redis-script";
import {
  CacheFillTimeoutError,
  fillJsonCache,
} from "@lootlog/database/redis-cache-fill";
import { Cause, Effect, Exit, Schema } from "effect";
import type * as Redis from "effect/persistence/Redis";

export interface JsonCodec<T> {
  stringify(value: T): string;
  parse(text: string): T;
}

export interface RedisGetOrSetJsonOptions<T, E, R> {
  readonly key: string;
  readonly ttlSeconds: number;
  readonly factory: Effect.Effect<T, E, R>;
  readonly codec: JsonCodec<T>;
  readonly lockTtlSeconds?: number;
  readonly waitTimeoutMs?: number;
  readonly waitIntervalMs?: number;
  /** Reports a Redis failure the read recovered from by running `factory`. */
  readonly onError: (cause: unknown) => void;
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

  // fillJsonCache is shared with apps/api and drives its own Promise loop.
  const cacheFillStore = {
    getJson: <T>(key: string, codec: { parse(text: string): T }) =>
      Effect.runPromise(getJson(key, codec)),
    setNX: (key: string, token: string, ttlSeconds: number) =>
      Effect.runPromise(setNX(key, token, ttlSeconds)),
    eval: <TResult>(
      script: string,
      keys: string[],
      args: Array<string | number>,
    ) => Effect.runPromise(evalScript<TResult>(script, keys, args)),
  };

  /**
   * Reads a JSON value, or lets one caller fill it while the others wait. A
   * Redis failure runs `factory` uncached; a `factory` failure fails the read.
   */
  const getOrSetJsonBestEffort = <T, E, R>({
    factory,
    onError,
    ...options
  }: RedisGetOrSetJsonOptions<T, E, R>): Effect.Effect<T, E, R> =>
    Effect.gen(function* () {
      const context = yield* Effect.context<R>();
      let filled: { readonly value: T } | undefined;
      let factoryFailure: Cause.Cause<E> | undefined;

      return yield* Effect.tryPromise({
        try: (signal) =>
          fillJsonCache<T>(cacheFillStore, {
            ...options,
            signal,
            factory: async () => {
              const exit = await Effect.runPromiseExitWith(context)(factory, {
                signal,
              });

              if (Exit.isFailure(exit)) {
                factoryFailure = exit.cause;
                throw Cause.squash(exit.cause);
              }

              filled = { value: exit.value };

              return exit.value;
            },
          }),
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) => {
          if (factoryFailure !== undefined)
            return Effect.failCause(factoryFailure);

          if (error instanceof CacheFillTimeoutError) return Effect.die(error);
          onError(error);

          return filled === undefined ? factory : Effect.succeed(filled.value);
        }),
      );
    });

  return {
    set,
    get,
    del,
    getJson,
    setJson: <T>(key: string, value: T, ttlSeconds?: number) =>
      set(key, JSON.stringify(value), ttlSeconds),
    setNX,
    evalScript,
    getOrSetJsonBestEffort,
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
