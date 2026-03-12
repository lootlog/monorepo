import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { ConfigKey } from "src/config/config-key.enum";
import type { RedisConfig } from "@lootlog/nest-shared";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = this.configService.get<RedisConfig>(ConfigKey.REDIS);
    this.client = new Redis(config!);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async getClient(): Promise<Redis> {
    if (!this.client) {
      throw new Error("Redis client is not initialized");
    }
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, "EX", ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async setNX(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<boolean> {
    if (ttlSeconds) {
      const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
      return result === "OK";
    } else {
      const result = await this.client.setnx(key, value);
      return result === 1;
    }
  }
}
