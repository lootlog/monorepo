import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ConfigKey } from 'src/config/config-key.enum';
import { RedisConfig } from 'src/config/redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = this.configService.get<RedisConfig>(ConfigKey.REDIS);
    this.client = new Redis(config);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async getClient(): Promise<Redis> {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
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
      // SET key value EX ttl NX - returns "OK" if successful, null if key exists
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } else {
      // SETNX key value - returns 1 if successful, 0 if key exists
      const result = await this.client.setnx(key, value);
      return result === 1;
    }
  }
}
