import {
  makeJsonCodec,
  type JsonCodec,
} from "@lootlog/database/redis-cache-fill";
import { type Cause, Clock, Effect, Schema } from "effect";
import type { RedisService } from "#src/redis/redis.service";

export interface StaleJson<T> {
  readonly value: T;
  readonly computedAt: string;
}

const REFRESH_LEASE_SECONDS = 300;

type CacheErrorHandler = (
  failure: Error | Cause.Cause<unknown>,
) => Effect.Effect<void>;

export type StaleJsonRedis = Pick<
  RedisService,
  "getOrSetJson" | "setNX" | "setJson"
>;

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
    const leased = yield* redis.setNX(
      `${options.key}:refresh`,
      "1",
      REFRESH_LEASE_SECONDS,
    );

    if (!leased) return;

    const fresh = yield* compute;

    yield* redis.setJson(options.key, fresh, options.retainSeconds, codec);
  }).pipe(Effect.catchCause(options.onError));

  return Effect.gen(function* () {
    const entry = yield* redis.getOrSetJson({
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
