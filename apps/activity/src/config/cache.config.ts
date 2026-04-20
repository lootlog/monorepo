import type { CacheModuleOptions } from "@nestjs/cache-manager";
import { Keyv } from "keyv";
import KeyvRedis from "@keyv/redis";
import { CacheableMemory } from "cacheable";
import { RuntimeEnvironment } from "@lootlog/types";
import { redisConfig } from "src/config/redis.config";
import { serviceConfig } from "src/config/service.config";

const isLocal = serviceConfig.env === RuntimeEnvironment.LOCAL;

export const cacheConfig: CacheModuleOptions = {
  isGlobal: true,
  stores: isLocal
    ? [
        new Keyv({
          store: new CacheableMemory({ ttl: 0, lruSize: 0 }),
        }),
      ]
    : [
        new Keyv({
          store: new KeyvRedis(
            `redis://${redisConfig.username}:${redisConfig.password}@${redisConfig.host}:${redisConfig.port}`,
          ),
        }),
      ],
  ttl: isLocal ? 0 : 60000 * 5,
};
