import { Effect, Option } from "effect";
import type * as Redis from "effect/persistence/Redis";

export interface LockRetry {
  readonly retryCount: number;
  readonly retryDelay: number;
  readonly retryJitter: number;
}

export interface RedlockOptions extends Partial<LockRetry> {
  readonly automaticExtensionThreshold?: number;
}

export interface RedlockRedis {
  readonly eval: (
    script: string,
    keys: ReadonlyArray<string>,
    args?: ReadonlyArray<string | number>,
  ) => Effect.Effect<number, Redis.RedisError>;
}

const DEFAULT_OPTIONS = {
  retryCount: 3,
  retryDelay: 100,
  retryJitter: 50,
  automaticExtensionThreshold: 500,
} satisfies Required<RedlockOptions>;

const ACQUIRE_SCRIPT = `
for _, key in ipairs(KEYS) do
  if redis.call("exists", key) == 1 then return 0 end
end
for _, key in ipairs(KEYS) do
  redis.call("set", key, ARGV[1], "PX", ARGV[2])
end
return #KEYS
`;

const RELEASE_SCRIPT = `
local released = 0
for _, key in ipairs(KEYS) do
  if redis.call("get", key) == ARGV[1] then
    released = released + redis.call("del", key)
  end
end
return released
`;

const EXTEND_SCRIPT = `
for _, key in ipairs(KEYS) do
  if redis.call("get", key) ~= ARGV[1] then return 0 end
end
for _, key in ipairs(KEYS) do redis.call("pexpire", key, ARGV[2]) end
return #KEYS
`;

export class ExecutionError extends Error {}

const retryWait = (retry: LockRetry) =>
  retry.retryDelay + Math.floor(Math.random() * (retry.retryJitter + 1));

interface RedisLock {
  readonly release: Effect.Effect<void, Redis.RedisError>;
  readonly extend: (duration: number) => Effect.Effect<void, ExecutionError>;
}

export interface RedisLockManager {
  readonly acquire: (
    resources: ReadonlyArray<string>,
    duration: number,
    options?: RedlockOptions,
  ) => Effect.Effect<RedisLock, ExecutionError>;
  readonly withLock: <A, E, R, U>(
    resource: string,
    duration: number,
    effect: Effect.Effect<A, E, R>,
    unavailable: () => U,
    retry?: Partial<LockRetry>,
  ) => Effect.Effect<A, E | U, R>;
  readonly singleFlight: <A, ReadError, FillError, R, U>(
    options: {
      readonly resource: string;
      readonly duration: number;
      readonly wait: LockRetry;
      readonly unavailable: () => U;
    },
    read: Effect.Effect<Option.Option<A>, ReadError, R>,
    fill: Effect.Effect<A, FillError, R>,
  ) => Effect.Effect<A, ReadError | FillError | U, R>;
  readonly using: <A, E, R>(
    resources: ReadonlyArray<string>,
    duration: number,
    routine: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E | ExecutionError, R>;
}

const releaseQuietly = (lock: RedisLock) =>
  lock.release.pipe(
    Effect.catch((error) =>
      Effect.logDebug("Failed to release Redis lock", error),
    ),
  );

export const makeRedisLockManager = (
  redis: RedlockRedis,
  options: RedlockOptions = {},
): RedisLockManager => {
  const defaults = { ...DEFAULT_OPTIONS, ...options };

  const makeLock = (
    resources: ReadonlyArray<string>,
    value: string,
  ): RedisLock => ({
    release: redis.eval(RELEASE_SCRIPT, resources, [value]).pipe(Effect.asVoid),
    extend: (duration) =>
      redis.eval(EXTEND_SCRIPT, resources, [value, duration]).pipe(
        Effect.mapError(
          (cause) => new ExecutionError("Redis lock renewal failed", { cause }),
        ),
        Effect.flatMap((extended) =>
          extended === resources.length
            ? Effect.void
            : Effect.fail(new ExecutionError("Redis lock ownership was lost")),
        ),
      ),
  });

  const acquire: RedisLockManager["acquire"] = (
    resources,
    duration,
    overrides = {},
  ) =>
    Effect.gen(function* () {
      const settings = { ...defaults, ...overrides };
      const value = crypto.randomUUID();
      let lastCause: unknown;

      for (let attempt = 0; attempt <= settings.retryCount; attempt += 1) {
        const acquired = yield* redis
          .eval(ACQUIRE_SCRIPT, resources, [value, duration])
          .pipe(
            Effect.catch((error) =>
              Effect.sync(() => {
                lastCause = error;
              }),
            ),
          );

        if (acquired === resources.length) {
          return makeLock(resources, value);
        }

        if (attempt < settings.retryCount) {
          yield* Effect.sleep(retryWait(settings));
        }
      }

      return yield* Effect.fail(
        new ExecutionError("Unable to acquire Redis lock", {
          cause: lastCause,
        }),
      );
    });

  return {
    acquire,
    withLock: (resource, duration, effect, unavailable, retry = {}) =>
      Effect.acquireUseRelease(
        acquire([resource], duration, retry).pipe(
          Effect.mapError(() => unavailable()),
        ),
        () => effect,
        releaseQuietly,
      ),
    singleFlight: (options, read, fill) => {
      const { resource, duration, wait, unavailable } = options;

      const tryAcquire = acquire([resource], duration, { retryCount: 0 }).pipe(
        Effect.orElseSucceed(() => undefined),
      );

      const readOrFillUnderLock = Effect.flatMap(
        read,
        Option.match({
          onSome: (value) => Effect.succeedSome(value),
          onNone: () =>
            Effect.acquireUseRelease(
              tryAcquire,
              (lock) =>
                lock === undefined
                  ? Effect.succeedNone
                  : read.pipe(
                      Effect.flatMap(
                        Option.match({
                          onSome: Effect.succeed,
                          onNone: () => fill,
                        }),
                      ),
                      Effect.asSome,
                    ),
              (lock) =>
                lock === undefined ? Effect.void : releaseQuietly(lock),
            ),
        }),
      );

      return Effect.gen(function* () {
        for (let retries = 0; ; retries += 1) {
          const result = yield* readOrFillUnderLock;

          if (Option.isSome(result)) return result.value;

          if (retries >= wait.retryCount)
            return yield* Effect.fail(unavailable());

          yield* Effect.sleep(retryWait(wait));
        }
      });
    },
    using: (resources, duration, routine) =>
      Effect.scoped(
        Effect.gen(function* () {
          const lock = yield* Effect.acquireRelease(
            acquire(resources, duration),
            (activeLock) =>
              activeLock.release.pipe(
                Effect.catch((error) =>
                  Effect.logWarning("Failed to release Redis lock", error),
                ),
              ),
          );

          const refreshAfter = Math.max(
            1,
            duration - defaults.automaticExtensionThreshold,
          );

          const renew = Effect.sleep(refreshAfter).pipe(
            Effect.andThen(lock.extend(duration)),
            Effect.forever,
          );

          return yield* Effect.raceFirst(routine, renew);
        }),
      ),
  };
};
