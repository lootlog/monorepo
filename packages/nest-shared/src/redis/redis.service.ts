import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import {
  Inject,
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_MODULE_OPTIONS = Symbol("REDIS_MODULE_OPTIONS");

export interface RedisModuleOptions {
  host: string;
  port: number;
  password?: string;
  username?: string;
  prefix?: string;
}

export interface RedisGetOrSetJsonOptions<T> {
  key: string;
  ttlSeconds: number;
  factory: () => Promise<T>;
  lockTtlSeconds?: number;
  waitTimeoutMs?: number;
  waitIntervalMs?: number;
}

export interface RedisGetOrSetJsonBestEffortOptions<
  T,
> extends RedisGetOrSetJsonOptions<T> {
  onError?: (error: unknown) => void;
}

const DEFAULT_SCAN_COUNT = 500;
const DEFAULT_DELETE_BATCH_SIZE = 500;
const DEFAULT_SINGLE_FLIGHT_LOCK_TTL_SECONDS = 10;
const DEFAULT_SINGLE_FLIGHT_WAIT_TIMEOUT_MS = 2_000;
const DEFAULT_SINGLE_FLIGHT_WAIT_INTERVAL_MS = 50;

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client?: Redis;
  private readonly prefix: string;
  private readonly isOpenApiGeneration: boolean;

  constructor(
    @Inject(REDIS_MODULE_OPTIONS)
    private readonly options: RedisModuleOptions,
  ) {
    this.prefix = options.prefix ?? "";
    this.isOpenApiGeneration = process.env.OPENAPI_GENERATION === "true";
  }

  onModuleInit() {
    const { prefix: _, ...redisOptions } = this.options;
    this.client = new Redis({
      ...redisOptions,
      ...(this.isOpenApiGeneration ? { lazyConnect: true } : {}),
    });
  }

  onModuleDestroy() {
    if (!this.client) {
      return;
    }

    const client = this.client;
    this.client = undefined;
    const status = client.status;
    if (status === "end" || status === "close") {
      return;
    }

    client.disconnect(false);
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error("Redis client is not initialized");
    }
    return this.client;
  }

  private prefixKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  private unprefixKey(key: string): string {
    const prefix = `${this.prefix}:`;

    return this.prefix && key.startsWith(prefix)
      ? key.slice(prefix.length)
      : key;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const prefixedKey = this.prefixKey(key);
    if (ttlSeconds) {
      await this.client.set(prefixedKey, value, "EX", ttlSeconds);
    } else {
      await this.client.set(prefixedKey, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(this.prefixKey(key));
  }

  async getJson<T>(key: string): Promise<T | null> {
    const cached = await this.get(key);

    if (cached === null) {
      return null;
    }

    try {
      return JSON.parse(cached) as T;
    } catch {
      await this.del(key);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getOrSetJson<T>({
    key,
    ttlSeconds,
    factory,
    lockTtlSeconds = DEFAULT_SINGLE_FLIGHT_LOCK_TTL_SECONDS,
    waitTimeoutMs = DEFAULT_SINGLE_FLIGHT_WAIT_TIMEOUT_MS,
    waitIntervalMs = DEFAULT_SINGLE_FLIGHT_WAIT_INTERVAL_MS,
  }: RedisGetOrSetJsonOptions<T>): Promise<T> {
    const cached = await this.getJson<T>(key);

    if (cached !== null) {
      return cached;
    }

    const lockKey = `${key}:single-flight`;
    const lockToken = randomUUID();
    const lockAcquired = await this.setNX(lockKey, lockToken, lockTtlSeconds);

    if (!lockAcquired) {
      const cachedAfterWait = await this.waitForJsonCache<T>(
        key,
        waitTimeoutMs,
        waitIntervalMs,
      );

      if (cachedAfterWait !== null) {
        return cachedAfterWait;
      }

      const value = await factory();
      await this.setJson(key, value, ttlSeconds);
      return value;
    }

    try {
      const cachedAfterLock = await this.getJson<T>(key);

      if (cachedAfterLock !== null) {
        return cachedAfterLock;
      }

      const value = await factory();
      await this.setJson(key, value, ttlSeconds);
      return value;
    } finally {
      await this.releaseSingleFlightLock(lockKey, lockToken);
    }
  }

  async getOrSetJsonBestEffort<T>({
    onError,
    ...options
  }: RedisGetOrSetJsonBestEffortOptions<T>): Promise<T> {
    let factoryResult: { value: T } | null = null;
    let factoryRejected = false;
    let factoryError: unknown;

    const guardedFactory = async () => {
      try {
        const value = await options.factory();
        factoryResult = { value };
        return value;
      } catch (error) {
        factoryRejected = true;
        factoryError = error;
        throw error;
      }
    };

    try {
      return await this.getOrSetJson({
        ...options,
        factory: guardedFactory,
      });
    } catch (error) {
      if (factoryRejected) {
        return Promise.reject(factoryError);
      }

      onError?.(error);

      if (factoryResult) {
        return factoryResult.value;
      }

      return options.factory();
    }
  }

  private async waitForJsonCache<T>(
    key: string,
    waitTimeoutMs: number,
    waitIntervalMs: number,
  ): Promise<T | null> {
    const deadline = Date.now() + waitTimeoutMs;

    while (Date.now() < deadline) {
      await sleep(waitIntervalMs);

      const cached = await this.getJson<T>(key);

      if (cached !== null) {
        return cached;
      }
    }

    return null;
  }

  private async releaseSingleFlightLock(
    lockKey: string,
    lockToken: string,
  ): Promise<void> {
    try {
      await this.eval<number>(RELEASE_LOCK_SCRIPT, [lockKey], [lockToken]);
    } catch {
      // The lock has a short TTL; a release failure should not fail the read.
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(this.prefixKey(key));
  }

  async deleteByPattern(
    pattern: string,
    batchSize = DEFAULT_DELETE_BATCH_SIZE,
  ): Promise<number> {
    const client = this.getClient();
    const prefixedPattern = this.prefixKey(pattern);
    let cursor = "0";
    let deletedCount = 0;

    do {
      const [nextCursor, matchedKeys] = await client.scan(
        cursor,
        "MATCH",
        prefixedPattern,
        "COUNT",
        DEFAULT_SCAN_COUNT,
      );
      cursor = nextCursor;

      for (let index = 0; index < matchedKeys.length; index += batchSize) {
        const batch = matchedKeys.slice(index, index + batchSize);

        if (batch.length > 0) {
          deletedCount += await client.del(...batch);
        }
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
    if (ttlSeconds) {
      const result = await this.client.set(
        prefixedKey,
        value,
        "EX",
        ttlSeconds,
        "NX",
      );
      return result === "OK";
    }
    const result = await this.client.setnx(prefixedKey, value);
    return result === 1;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(this.prefixKey(key));
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(this.prefixKey(key));
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client.expire(this.prefixKey(key), ttlSeconds);
  }

  async eval<TResult = unknown>(
    script: string,
    keys: string[],
    args: Array<string | number> = [],
  ): Promise<TResult> {
    const prefixedKeys = keys.map((k) => this.prefixKey(k));
    return this.client.eval(
      script,
      prefixedKeys.length,
      ...prefixedKeys,
      ...args,
    ) as Promise<TResult>;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(this.prefixKey(key), field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(this.prefixKey(key), field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(this.prefixKey(key));
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.client.hdel(this.prefixKey(key), field);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(this.prefixKey(key), ...values);
  }

  async ltrim(key: string, start: number, stop: number): Promise<"OK"> {
    return this.client.ltrim(this.prefixKey(key), start, stop);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(this.prefixKey(key), start, stop);
  }

  async lset(key: string, index: number, value: string): Promise<"OK"> {
    return this.client.lset(this.prefixKey(key), index, value);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    return this.client.lrem(this.prefixKey(key), count, value);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(this.prefixKey(key));
  }

  async scan(pattern: string): Promise<string[]> {
    const prefixedPattern = this.prefixKey(pattern);
    const keys: string[] = [];
    let cursor = "0";

    do {
      const [nextCursor, matchedKeys] = await this.client.scan(
        cursor,
        "MATCH",
        prefixedPattern,
        "COUNT",
        DEFAULT_SCAN_COUNT,
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== "0");

    return keys.map((key) => this.unprefixKey(key));
  }
}
