import { Effect, Option } from "effect";
import type { RedisService } from "#src/redis/redis.service";

/** How often, and how far apart, a contended lock is tried again. */
export interface LockRetry {
  readonly retryCount: number;
  readonly retryDelay: number;
  readonly retryJitter: number;
}

interface RedlockOptions extends Partial<LockRetry> {
  /** How long before expiry `using` extends a held lock. */
  automaticExtensionThreshold?: number;
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

const releaseQuietly = (lock: RedisLock) =>
  Effect.tryPromise(() => lock.release()).pipe(
    Effect.catch((error) =>
      Effect.logDebug("Failed to release Redis lock", error),
    ),
  );

class RedisLock {
  constructor(
    private readonly redis: Pick<RedisService, "eval">,
    readonly resources: string[],
    readonly value: string,
  ) {}

  async release(): Promise<void> {
    await this.redis.eval(RELEASE_SCRIPT, this.resources, [this.value]);
  }

  async extend(duration: number): Promise<void> {
    const extended = await this.redis.eval<number>(
      EXTEND_SCRIPT,
      this.resources,
      [this.value, duration],
    );

    if (extended !== this.resources.length) {
      throw new ExecutionError("Redis lock ownership was lost");
    }
  }
}

export class RedisLockManager {
  private readonly options: Required<RedlockOptions>;

  constructor(
    private readonly redis: Pick<RedisService, "eval">,
    options: RedlockOptions,
  ) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  async acquire(
    resources: string[],
    duration: number,
    options: RedlockOptions = {},
  ): Promise<RedisLock> {
    const settings = { ...this.options, ...options };
    const value = crypto.randomUUID();
    let lastCause: unknown;

    for (let attempt = 0; attempt <= settings.retryCount; attempt += 1) {
      try {
        const acquired = await this.redis.eval<number>(
          ACQUIRE_SCRIPT,
          resources,
          [value, duration],
        );

        if (acquired === resources.length) {
          return new RedisLock(this.redis, resources, value);
        }
      } catch (error) {
        lastCause = error;
      }

      if (attempt < settings.retryCount) {
        await Bun.sleep(retryWait(settings));
      }
    }

    throw new ExecutionError("Unable to acquire Redis lock", {
      cause: lastCause,
    });
  }

  /**
   * Runs `effect` while holding `resource`. When another owner still holds it
   * after the retry budget, fails with `unavailable()` instead.
   */
  withLock<A, E, R, U>(
    resource: string,
    duration: number,
    effect: Effect.Effect<A, E, R>,
    unavailable: () => U,
    retry: Partial<LockRetry> = {},
  ): Effect.Effect<A, E | U, R> {
    return Effect.acquireUseRelease(
      Effect.tryPromise({
        try: () => this.acquire([resource], duration, retry),
        catch: unavailable,
      }),
      () => effect,
      releaseQuietly,
    );
  }

  /**
   * Returns what `read` finds, or computes it with `fill` under the lock on
   * `resource` so concurrent callers share one fill. A caller that finds the
   * lock held reads again and retries it every `wait.retryDelay`, and fails
   * with `unavailable()` once `wait.retryCount` retries pass.
   */
  singleFlight<A, ReadError, FillError, R, U>(
    options: {
      readonly resource: string;
      readonly duration: number;
      readonly wait: LockRetry;
      readonly unavailable: () => U;
    },
    read: Effect.Effect<Option.Option<A>, ReadError, R>,
    fill: Effect.Effect<A, FillError, R>,
  ): Effect.Effect<A, ReadError | FillError | U, R> {
    const { resource, duration, wait, unavailable } = options;

    const tryAcquire = Effect.promise(() =>
      this.acquire([resource], duration, { retryCount: 0 }).catch(
        () => undefined,
      ),
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
            (lock) => (lock === undefined ? Effect.void : releaseQuietly(lock)),
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
  }

  using<A, E, R>(
    resources: string[],
    duration: number,
    routine: Effect.Effect<A, E, R>,
  ) {
    return Effect.scoped(
      Effect.gen({ self: this }, function* () {
        const lock = yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: () => this.acquire(resources, duration),
            catch: (cause) =>
              cause instanceof ExecutionError
                ? cause
                : new ExecutionError("Unable to acquire Redis lock", { cause }),
          }),
          (activeLock) =>
            Effect.tryPromise(() => activeLock.release()).pipe(
              Effect.catch((error) =>
                Effect.logWarning("Failed to release Redis lock", error),
              ),
            ),
        );

        const refreshAfter = Math.max(
          1,
          duration - this.options.automaticExtensionThreshold,
        );

        const renew = Effect.sleep(refreshAfter).pipe(
          Effect.andThen(
            Effect.tryPromise({
              try: () => lock.extend(duration),
              catch: (cause) =>
                cause instanceof ExecutionError
                  ? cause
                  : new ExecutionError("Redis lock renewal failed", { cause }),
            }),
          ),
          Effect.forever,
        );

        return yield* Effect.raceFirst(routine, renew);
      }),
    );
  }
}

export class RedlockService {
  constructor(private readonly redis: Pick<RedisService, "eval">) {}

  createInstance(options: RedlockOptions = {}): RedisLockManager {
    return new RedisLockManager(this.redis, options);
  }
}
