import { Duration, Effect, Exit, Schema } from "effect";

export class CacheFillTimeoutError extends Error {
  constructor() {
    super("Cache fill wait timed out");
    this.name = "CacheFillTimeoutError";
  }
}

/**
 * How a cache entry is written and read. `stringify` serializes any JSON
 * value, so a domain value can be stored in its wire form and read back as it.
 */
export interface JsonCodec<T> {
  stringify: (value: unknown) => string;
  parse: (text: string) => T;
}

const decodeJsonUnknown = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Unknown),
);

/** Stores plain JSON and decodes what it reads with `schema`. */
export const makeJsonCodec = <S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
): JsonCodec<S["Type"]> => {
  const decodeValue = Schema.decodeUnknownSync(schema);

  return {
    stringify: (value) => JSON.stringify(value),
    parse: (text) => decodeValue(decodeJsonUnknown(text)),
  };
};

/** The Redis commands a cache fill runs, failing with the store's error. */
export interface CacheFillStore<E extends Error> {
  /** Reads a JSON value; an entry the codec rejects reads as null. */
  readonly getJson: <T>(
    key: string,
    codec: Pick<JsonCodec<T>, "parse">,
  ) => Effect.Effect<T | null, E>;
  readonly setNX: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<boolean, E>;
  readonly eval: <A>(
    script: string,
    keys: string[],
    args: Array<string | number>,
  ) => Effect.Effect<A, E>;
}

export interface CacheFillOptions<T, E, R> {
  readonly key: string;
  readonly ttlSeconds: number;
  readonly factory: Effect.Effect<T, E, R>;
  readonly codec: JsonCodec<T>;
  readonly lockTtlSeconds?: number;
  readonly waitTimeoutMs?: number;
  readonly waitIntervalMs?: number;
  /** Reports a Redis failure the read recovered from by running `factory`. */
  readonly onError?: (error: Error) => Effect.Effect<void>;
}

const PUBLISH_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  redis.call("SET", KEYS[2], ARGV[2], "EX", ARGV[3])
  return 1
end
return 0
`;

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

// Deadlines need a monotonic clock: a wall-clock jump must not end a wait.
const now = Effect.sync(() => performance.now());

/**
 * Reads a JSON value, or lets one caller fill it while the others wait. One
 * fill runs per Redis lease, and an expired owner cannot publish over its
 * successor. A Redis failure runs `factory` uncached; a `factory` failure
 * fails the read; a waiter that outlives `waitTimeoutMs` dies with
 * `CacheFillTimeoutError`.
 */
export const getOrFillJson = <T, E, R, SE extends Error>(
  store: CacheFillStore<SE>,
  {
    key,
    ttlSeconds,
    factory,
    codec,
    lockTtlSeconds = 10,
    waitTimeoutMs = 10_000,
    waitIntervalMs = 50,
    onError = () => Effect.void,
  }: CacheFillOptions<T, E, R>,
): Effect.Effect<T, E, R> => {
  const lockKey = `${key}:single-flight`;

  const fillAsOwner = (token: string, waited: boolean, deadline: number) =>
    Effect.gen(function* () {
      const cached = yield* store.getJson(key, codec);

      if (cached !== null) return Exit.succeed(cached);

      if (waited && (yield* now) >= deadline)
        return yield* Effect.die(new CacheFillTimeoutError());

      const filled = yield* Effect.exit(factory);

      if (Exit.isSuccess(filled))
        // The value is already computed: a failed publish only costs the cache.
        yield* store
          .eval(
            PUBLISH_SCRIPT,
            [lockKey, key],
            [token, codec.stringify(filled.value), ttlSeconds],
          )
          .pipe(Effect.catch(onError));

      return filled;
    }).pipe(
      // A failed release cannot fail a completed read; the lease expires.
      Effect.ensuring(
        Effect.ignore(store.eval(RELEASE_SCRIPT, [lockKey], [token])),
      ),
    );

  const fill = Effect.gen(function* () {
    const token = crypto.randomUUID();
    const deadline = (yield* now) + waitTimeoutMs;
    let waited = false;

    while (true) {
      const cached = yield* store.getJson(key, codec);

      if (cached !== null) return Exit.succeed<T>(cached);

      const current = yield* now;

      if (waited && current >= deadline)
        return yield* Effect.die(new CacheFillTimeoutError());

      if (yield* store.setNX(lockKey, token, lockTtlSeconds))
        return yield* fillAsOwner(token, waited, deadline);

      waited = true;
      const remaining = deadline - current;

      if (remaining <= 0) return yield* Effect.die(new CacheFillTimeoutError());
      yield* Effect.sleep(Duration.millis(Math.min(waitIntervalMs, remaining)));
    }
  });

  // The fill settles to the factory's Exit, so only Redis failures reach the
  // fallback and a factory failure is never retried uncached.
  return fill.pipe(
    Effect.catch((error) =>
      onError(error).pipe(Effect.andThen(Effect.exit(factory))),
    ),
    Effect.flatten,
  );
};
