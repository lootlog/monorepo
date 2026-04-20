import { Redis } from "ioredis";
import type { GatewayAppConfig } from "../../config/env.js";

type LoggerLike = {
  error(message: string, meta?: Record<string, unknown>): void;
};

export class RedisStore {
  private readonly client: Redis;
  private readonly prefix: string;

  constructor(config: GatewayAppConfig, logger: LoggerLike) {
    this.prefix = `${config.serviceName}:${config.env}`;
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      username: config.redis.username || undefined,
    });
    this.client.on("error", (error) => {
      logger.error("Gateway Redis store client error", { error });
    });
  }

  private prefixKey(key: string) {
    return `${this.prefix}:${key}`;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(this.prefixKey(key));
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const prefixedKey = this.prefixKey(key);

    if (ttlSeconds === undefined) {
      await this.client.set(prefixedKey, value);
      return;
    }

    await this.client.set(prefixedKey, value, "EX", ttlSeconds);
  }

  async del(key: string): Promise<number> {
    return this.client.del(this.prefixKey(key));
  }

  duplicate() {
    return this.client.duplicate();
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
