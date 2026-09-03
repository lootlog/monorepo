import { RedisService } from "#src/redis/redis.service";

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
    private readonly redis: RedisService,
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
    private readonly redis: RedisService,
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

  async using<A>(
    resources: string[],
    duration: number,
    routine: (signal: AbortSignal & { error?: Error }) => Promise<A>,
  ): Promise<A> {
    const lock = await this.acquire(resources, duration);
    const controller = new AbortController();
    const signal = controller.signal as AbortSignal & { error?: Error };
    const refreshAfter = Math.max(
      1,
      duration - this.options.automaticExtensionThreshold,
    );
    const timer = setInterval(() => {
      void lock.extend(duration).catch((cause) => {
        const error =
          cause instanceof Error ? cause : new ExecutionError(String(cause));
        Object.defineProperty(signal, "error", { value: error });
        controller.abort(error);
      });
    }, refreshAfter);

    try {
      const result = await routine(signal);
      if (signal.aborted) throw signal.error;
      return result;
    } finally {
      clearInterval(timer);
      await lock.release().catch(() => undefined);
    }
  }
}

export class RedlockService {
  constructor(private readonly redis: RedisService) {}

  createInstance(options: RedlockOptions = {}): RedisLockManager {
    return new RedisLockManager(this.redis, options);
  }
}
