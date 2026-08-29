import { Module } from "@nestjs/common";
import { RedisModule as SharedRedisModule } from "@lootlog/nest-shared/redis";
import { redisConfig } from "#src/config/redis.config";

@Module({
  imports: [SharedRedisModule.register(redisConfig)],
  exports: [SharedRedisModule],
})
export class RedisModule {}
