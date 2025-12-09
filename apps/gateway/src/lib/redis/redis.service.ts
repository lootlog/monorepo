import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ConfigKey } from 'src/config/config-key.enum';
import type { RedisConfig } from 'src/config/redis.config';
import { ServiceConfig } from 'src/config/service.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private prefix: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
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

  get(key: string): Promise<string | null> {
    const prefixedKey = `${this.prefix}:${key}`;
    return this.client.get(prefixedKey);
  }

  del(key: string): Promise<number> {
    const prefixedKey = `${this.prefix}:${key}`;
    return this.client.del(prefixedKey);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const prefixedKey = `${this.prefix}:${key}`;
    return this.client.hset(prefixedKey, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    const prefixedKey = `${this.prefix}:${key}`;
    return this.client.hget(prefixedKey, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const prefixedKey = `${this.prefix}:${key}`;
    return this.client.hgetall(prefixedKey);
  }

  async hdel(key: string, field: string): Promise<number> {
    const prefixedKey = `${this.prefix}:${key}`;
    return this.client.hdel(prefixedKey, field);
  }

  async scan(pattern: string): Promise<string[]> {
    const prefixedPattern = `${this.prefix}:${pattern}`;
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, matchedKeys] = await this.client.scan(
        cursor,
        'MATCH',
        prefixedPattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    return keys.map((key) => key.replace(`${this.prefix}:`, ''));
  }
}
