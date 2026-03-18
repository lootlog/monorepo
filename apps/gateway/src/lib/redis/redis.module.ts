import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  RedisModule as SharedRedisModule,
  type RedisConfig,
} from "@lootlog/nest-shared";
import { ConfigKey } from "src/config/config-key.enum";
import type { ServiceConfig } from "src/config/service.config";

@Module({
  imports: [
    SharedRedisModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(ConfigKey.REDIS)!;
        const { serviceName, env } = configService.get<ServiceConfig>(
          ConfigKey.SERVICE,
        )!;
        return {
          ...redisConfig,
          prefix: `${serviceName}:${env}`,
        };
      },
    }),
  ],
  exports: [SharedRedisModule],
})
export class RedisModule {}
