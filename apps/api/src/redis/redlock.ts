import { Effect } from "effect";
import type { RedisService } from "#src/redis/redis.service";

interface RedlockOptions {
  driftFactor?: number;
  retryCount?: number;
  retryDelay?: number;
  retryJitter?: number;
  automaticExtensionThreshold?: number;
}

const DEFAULT_OPTIONS: RedlockOptions = {
  driftFactor: 0.01,
  retryCount: 3,
  retryDelay: 100,
  retryJitter: 50,
  automaticExtensionThreshold: 500,
};

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

class RedisLockManager {
  private readonly options: Required<RedlockOptions>;

  constructor(
    private readonly redis: Pick<RedisService, "eval">,
    options: RedlockOptions,
  ) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    } as Required<RedlockOptions>;
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
      } catch (cause) {
        lastCause = cause;
      }

      if (attempt < settings.retryCount) {
        const jitter = Math.floor(Math.random() * (settings.retryJitter + 1));
        await Bun.sleep(settings.retryDelay + jitter);
      }
    }

    throw new ExecutionError("Unable to acquire Redis lock", {
      cause: lastCause,
    });
  }

  using<A, E, R>(
    resources: string[],
    duration: number,
    routine: Effect.Effect<A, E, R>,
  ) {
    const self = this;
    return Effect.scoped(
      Effect.gen(function* () {
        const lock = yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: () => self.acquire(resources, duration),
            catch: (cause) =>
              cause instanceof ExecutionError
                ? cause
                : new ExecutionError("Unable to acquire Redis lock", { cause }),
          }),
          (activeLock) =>
            Effect.tryPromise(() => activeLock.release()).pipe(
              Effect.catch((cause) =>
                Effect.logWarning("Failed to release Redis lock", cause),
              ),
            ),
        );
        const refreshAfter = Math.max(
          1,
          duration - self.options.automaticExtensionThreshold,
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
