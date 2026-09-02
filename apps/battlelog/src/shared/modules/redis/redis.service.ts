import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { Redis } from "ioredis";

export interface RedisOptions {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
  readonly username?: string;
  readonly prefix?: string;
  readonly lazyConnect?: boolean;
}

export interface JsonCodec {
  stringify(value: unknown): string;
  parse<T>(text: string): T;
}

export interface RedisGetOrSetJsonOptions<T> {
  readonly key: string;
  readonly ttlSeconds: number;
  readonly factory: () => Promise<T>;
  readonly lockTtlSeconds?: number;
  readonly waitTimeoutMs?: number;
  readonly waitIntervalMs?: number;
  readonly codec?: JsonCodec;
}

export interface RedisGetOrSetJsonBestEffortOptions<
  T,
> extends RedisGetOrSetJsonOptions<T> {
  readonly onError?: (error: unknown) => void;
}

const defaultJsonCodec: JsonCodec = {
  stringify: (value) => JSON.stringify(value),
  parse: <T>(text: string) => JSON.parse(text) as T,
};

const releaseLockScript = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export class RedisService {
  private readonly client: Redis;
  private readonly prefix: string;

  constructor(options: RedisOptions) {
    const { prefix, ...redisOptions } = options;
    this.prefix = prefix ?? "";
    this.client = new Redis(redisOptions);
  }

  async connect(): Promise<void> {
    if (this.client.status === "wait") {
      await this.client.connect();
    }
  }

  close(): void {
    if (this.client.status !== "end" && this.client.status !== "close") {
      this.client.disconnect(false);
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const prefixedKey = this.prefixKey(key);
    if (ttlSeconds !== undefined) {
      await this.client.set(prefixedKey, value, "EX", ttlSeconds);
      return;
    }
    await this.client.set(prefixedKey, value);
  }

  get(key: string): Promise<string | null> {
    return this.client.get(this.prefixKey(key));
  }

  async getJson<T>(key: string, codec = defaultJsonCodec): Promise<T | null> {
    const cached = await this.get(key);
    if (cached === null) return null;

    try {
      return codec.parse<T>(cached);
    } catch {
      await this.client.del(this.prefixKey(key));
      return null;
    }
  }

  async setJson<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
    codec = defaultJsonCodec,
  ): Promise<void> {
    await this.set(key, codec.stringify(value), ttlSeconds);
  }

  async getOrSetJson<T>({
    key,
    ttlSeconds,
    factory,
    lockTtlSeconds = 10,
    waitTimeoutMs = 2_000,
    waitIntervalMs = 50,
    codec = defaultJsonCodec,
  }: RedisGetOrSetJsonOptions<T>): Promise<T> {
    const cached = await this.getJson<T>(key, codec);
    if (cached !== null) return cached;

    const lockKey = `${key}:single-flight`;
    const lockToken = randomUUID();
    const lockAcquired = await this.setNX(lockKey, lockToken, lockTtlSeconds);

    if (!lockAcquired) {
      const deadline = Date.now() + waitTimeoutMs;
      while (Date.now() < deadline) {
        await sleep(waitIntervalMs);
        const cachedAfterWait = await this.getJson<T>(key, codec);
        if (cachedAfterWait !== null) return cachedAfterWait;
      }
      const value = await factory();
      await this.setJson(key, value, ttlSeconds, codec);
      return value;
    }

    try {
      const cachedAfterLock = await this.getJson<T>(key, codec);
      if (cachedAfterLock !== null) return cachedAfterLock;
      const value = await factory();
      await this.setJson(key, value, ttlSeconds, codec);
      return value;
    } finally {
      try {
        await this.eval<number>(releaseLockScript, [lockKey], [lockToken]);
      } catch {
        // The lock expires after its bounded TTL.
      }
    }
  }

  async getOrSetJsonBestEffort<T>({
    onError,
    ...options
  }: RedisGetOrSetJsonBestEffortOptions<T>): Promise<T> {
    let factoryResult: { readonly value: T } | undefined;
    let factoryError: unknown;

    try {
      return await this.getOrSetJson({
        ...options,
        factory: async () => {
          try {
            const value = await options.factory();
            factoryResult = { value };
            return value;
          } catch (error) {
            factoryError = error;
            throw error;
          }
        },
      });
    } catch (error) {
      if (factoryError !== undefined) throw factoryError;
      onError?.(error);
      if (factoryResult !== undefined) return factoryResult.value;
      return options.factory();
    }
  }

  async deleteByPattern(pattern: string, batchSize = 500): Promise<number> {
    const prefixedPattern = this.prefixKey(pattern);
    let cursor = "0";
    let deletedCount = 0;
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        "MATCH",
        prefixedPattern,
        "COUNT",
        500,
      );
      cursor = nextCursor;
      for (let index = 0; index < keys.length; index += batchSize) {
        const batch = keys.slice(index, index + batchSize);
        if (batch.length > 0) deletedCount += await this.client.del(...batch);
      }
    } while (cursor !== "0");
    return deletedCount;
  }

  async setNX(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<boolean> {
    const prefixedKey = this.prefixKey(key);
    if (ttlSeconds !== undefined) {
      return (
        (await this.client.set(prefixedKey, value, "EX", ttlSeconds, "NX")) ===
        "OK"
      );
    }
    return (await this.client.setnx(prefixedKey, value)) === 1;
  }

  eval<TResult = unknown>(
    script: string,
    keys: readonly string[],
    args: ReadonlyArray<string | number> = [],
  ): Promise<TResult> {
    const prefixedKeys = keys.map((key) => this.prefixKey(key));
    return this.client.eval(
      script,
      prefixedKeys.length,
      ...prefixedKeys,
      ...args,
    ) as Promise<TResult>;
  }

  private prefixKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }
}
