import type { RedisModuleOptions } from "@lootlog/nest-shared/redis";
import { env } from "src/config/env";

export const redisConfig: RedisModuleOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  username: env.REDIS_USERNAME,
};
