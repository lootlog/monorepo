import { CacheModuleAsyncOptions } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { Keyv } from "keyv";
import KeyvRedis from "@keyv/redis";
import { CacheableMemory } from "cacheable";
import { RuntimeEnvironment } from "@lootlog/types";
import type { RedisConfig } from "@lootlog/nest-shared";
import { ConfigKey } from "./config-key.enum";
import { ServiceConfig } from "./service.config";

export const cacheConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const serviceConfig = configService.get<ServiceConfig>(ConfigKey.SERVICE);
    const isLocal = serviceConfig.env === RuntimeEnvironment.LOCAL;

    if (isLocal) {
      return {
        stores: [
          new Keyv({
            store: new CacheableMemory({ ttl: 0, lruSize: 0 }),
          }),
        ],
        ttl: 0,
      };
    }

    const redisConfig = configService.get<RedisConfig>(ConfigKey.REDIS);

    const redisUrl = `redis://${redisConfig.username}:${redisConfig.password}@${redisConfig.host}:${redisConfig.port}`;

    return {
      stores: [
        new Keyv({
          store: new KeyvRedis(redisUrl),
        }),
      ],
      ttl: 60000 * 5,
    };
  },
};
