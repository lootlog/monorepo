import { Clock, Effect, Schema } from "effect";
import {
  makeJsonCodec,
  type JsonCodec,
  type RedisGetOrSetJsonBestEffortOptions,
  type RedisService,
} from "#src/redis/redis.service";

/** A cached value and the instant it was computed. */
export interface StaleJson<T> {
  readonly value: T;
  readonly computedAt: string;
}

/** Another reader refreshes a stale entry at most once per lease. */
const REFRESH_LEASE_SECONDS = 300;

type CacheErrorHandler = NonNullable<
  RedisGetOrSetJsonBestEffortOptions<never>["onError"]
>;

export type StaleJsonRedis = Pick<
  RedisService,
  "getOrSetJsonEffect" | "setNX" | "setJson"
>;

/**
 * Serves an entry until `retainSeconds` after it was computed, and recomputes
 * it in the background once it is older than `freshSeconds`: the reader that
 * finds it stale gets the old value at once and a single lease holder
 * refreshes it. Only a missing entry makes a reader wait for the factory. A
 * failed refresh keeps the old entry and is retried after the lease expires.
 */
export const getOrSetStaleJson = <
  S extends Schema.ConstraintDecoder<unknown>,
  E,
>(
  redis: StaleJsonRedis,
  options: {
    readonly key: string;
    readonly schema: S;
    readonly freshSeconds: number;
    readonly retainSeconds: number;
    readonly factory: Effect.Effect<S["Type"], E>;
    readonly onError: CacheErrorHandler;
  },
): Effect.Effect<StaleJson<S["Type"]>, E> => {
  // SAFETY: the codec parses exactly the struct that `StaleJson<S["Type"]>`
  // describes; only the generic schema type hides that from the compiler.
  const codec = makeJsonCodec(
    Schema.Struct({ value: options.schema, computedAt: Schema.String }),
  ) as JsonCodec<StaleJson<S["Type"]>>;

  const compute = Effect.map(
    Effect.zip(options.factory, Clock.currentTimeMillis),
    ([value, now]): StaleJson<S["Type"]> => ({
      value,
      computedAt: new Date(now).toISOString(),
    }),
  );

  const refresh = Effect.gen(function* () {
    const leased = yield* Effect.tryPromise({
      try: () =>
        redis.setNX(`${options.key}:refresh`, "1", REFRESH_LEASE_SECONDS),
      catch: (error) => error,
    });

    if (!leased) return;

    const fresh = yield* compute;

    yield* Effect.tryPromise({
      try: () =>
        redis.setJson(options.key, fresh, options.retainSeconds, codec),
      catch: (error) => error,
    });
  }).pipe(
    Effect.catchCause((cause) => Effect.sync(() => options.onError(cause))),
  );

  return Effect.gen(function* () {
    const entry = yield* redis.getOrSetJsonEffect({
      key: options.key,
      ttlSeconds: options.retainSeconds,
      codec,
      factory: compute,
      onError: options.onError,
    });

    const now = yield* Clock.currentTimeMillis;

    if (now - Date.parse(entry.computedAt) > options.freshSeconds * 1000) {
      yield* Effect.forkDetach(refresh);
    }

    return entry;
  });
};
