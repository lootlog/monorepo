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

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly prefix: string;

  constructor(
    @Inject(REDIS_MODULE_OPTIONS)
    private readonly options: RedisModuleOptions,
  ) {
    this.prefix = options.prefix ?? "";
  }

  onModuleInit() {
    const { prefix: _, ...redisOptions } = this.options;
    this.client = new Redis(redisOptions);
  }

  async onModuleDestroy() {
    await this.client.quit();
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
    if (!this.prefix) return key;
    const prefixWithColon = `${this.prefix}:`;
    return key.startsWith(prefixWithColon)
      ? key.slice(prefixWithColon.length)
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

  async del(key: string): Promise<number> {
    return this.client.del(this.prefixKey(key));
  }

  async deleteByPattern(pattern: string): Promise<number> {
    const prefixedPattern = this.prefixKey(pattern);
    const keys = await this.client.keys(prefixedPattern);
    if (keys.length === 0) {
      return 0;
    }
    return this.client.del(...keys);
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
        100,
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== "0");

    return keys.map((key) => this.unprefixKey(key));
  }
}
