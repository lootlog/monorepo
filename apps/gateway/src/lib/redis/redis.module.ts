import { Module } from "@nestjs/common";
import { RedisModule as SharedRedisModule } from "@lootlog/nest-shared/redis";
import { redisConfig } from "#src/config/redis.config";
import { serviceConfig } from "#src/config/service.config";

@Module({
  imports: [
    SharedRedisModule.register({
      ...redisConfig,
      prefix: `${serviceConfig.serviceName}:${serviceConfig.env}`,
    }),
  ],
  exports: [SharedRedisModule],
})
export class RedisModule {}
