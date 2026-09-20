import { setTimeout as sleep } from "node:timers/promises";

export class CacheFillTimeoutError extends Error {
  constructor() {
    super("Cache fill wait timed out");
    this.name = "CacheFillTimeoutError";
  }
}

interface CacheFillStore<T> {
  getJson(key: string, codec: { parse(text: string): T }): Promise<T | null>;
  setNX(key: string, token: string, ttlSeconds: number): Promise<boolean>;
  eval<R>(
    script: string,
    keys: string[],
    args: Array<string | number>,
  ): Promise<R>;
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

/** One fill per Redis lease. Expired owners cannot publish over a successor. */
export async function fillJsonCache<T>(
  store: CacheFillStore<T>,
  {
    key,
    ttlSeconds,
    factory,
    codec,
    lockTtlSeconds = 10,
    waitTimeoutMs = 10_000,
    waitIntervalMs = 50,
    signal,
  }: {
    key: string;
    ttlSeconds: number;
    factory: () => Promise<T>;
    codec: { parse(text: string): T; stringify(value: T): string };
    lockTtlSeconds?: number;
    waitTimeoutMs?: number;
    waitIntervalMs?: number;
    signal?: AbortSignal;
  },
): Promise<T> {
  const lockKey = `${key}:single-flight`;
  const token = crypto.randomUUID();
  const deadline = performance.now() + waitTimeoutMs;
  let waiting = false;

  while (true) {
    signal?.throwIfAborted();
    const cached = await store.getJson(key, codec);

    if (cached !== null) return cached;

    if (waiting && performance.now() >= deadline) {
      throw new CacheFillTimeoutError();
    }

    if (await store.setNX(lockKey, token, lockTtlSeconds)) break;

    waiting = true;
    const remaining = deadline - performance.now();

    if (remaining <= 0) throw new CacheFillTimeoutError();
    // Bun.sleep has no AbortSignal option; interrupted waiters must stop polling.
    await sleep(Math.min(waitIntervalMs, remaining), undefined, { signal });
  }

  try {
    signal?.throwIfAborted();
    const cached = await store.getJson(key, codec);

    if (cached !== null) return cached;

    if (waiting && performance.now() >= deadline) {
      throw new CacheFillTimeoutError();
    }

    signal?.throwIfAborted();
    const value = await factory();
    signal?.throwIfAborted();
    await store.eval(
      PUBLISH_SCRIPT,
      [lockKey, key],
      [token, codec.stringify(value), ttlSeconds],
    );

    return value;
  } finally {
    try {
      await store.eval(RELEASE_SCRIPT, [lockKey], [token]);
    } catch {
      // A failed release cannot fail a completed read; the lease expires.
    }
  }
}
