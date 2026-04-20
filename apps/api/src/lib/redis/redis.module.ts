import { Module } from "@nestjs/common";
import { RedisModule as SharedRedisModule } from "@lootlog/nest-shared/redis";
import { env } from "src/config/env";

@Module({
  imports: [
    SharedRedisModule.register({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      username: env.REDIS_USERNAME,
    }),
  ],
  exports: [SharedRedisModule],
})
export class RedisModule {}
