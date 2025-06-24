import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ConfigKey } from 'src/config/config-key.enum';
import { RedisConfig } from 'src/config/redis.config';
import { ServiceConfig } from 'src/config/service.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private prefix: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = this.configService.get<RedisConfig>(ConfigKey.REDIS);
    const { serviceName, env } = this.configService.get<ServiceConfig>(
      ConfigKey.SERVICE,
    );
    this.client = new Redis(redisConfig);
    this.prefix = `${serviceName}:${env}`;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const prefixedKey = `${this.prefix}:${key}`;

    if (ttlSeconds) {
      await this.client.set(prefixedKey, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(prefixedKey, value);
    }
  }

  async get(key: string): Promise<string | null> {
    const prefixedKey = `${this.prefix}:${key}`;
    return this.client.get(prefixedKey);
  }

  async del(key: string): Promise<number> {
    const prefixedKey = `${this.prefix}:${key}`;
    return this.client.del(prefixedKey);
  }
}
