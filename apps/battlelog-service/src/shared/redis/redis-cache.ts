import { Redis } from "ioredis";

export interface RedisCacheOptions {
  host: string;
  port: number;
  password?: string;
  username?: string;
  prefix?: string;
}

export class RedisCache {
  private client: Redis | null = null;
  private readonly prefix: string;

  constructor(private readonly options: RedisCacheOptions) {
    this.prefix = options.prefix ?? "";
  }

  connect() {
    const { prefix: _prefix, ...redisOptions } = this.options;
    this.client = new Redis(redisOptions);
  }

  async close() {
    if (!this.client) {
      return;
    }

    await this.client.quit();
    this.client = null;
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

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const prefixedKey = this.prefixKey(key);

    if (ttlSeconds) {
      await this.getClient().set(prefixedKey, value, "EX", ttlSeconds);
      return;
    }

    await this.getClient().set(prefixedKey, value);
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get(this.prefixKey(key));
  }

  async del(key: string): Promise<number> {
    return this.getClient().del(this.prefixKey(key));
  }
}
