import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  RedisModule as SharedRedisModule,
  type RedisConfig,
} from "@lootlog/nest-shared";
import { ConfigKey } from "src/config/config-key.enum";

@Module({
  imports: [
    SharedRedisModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(ConfigKey.REDIS);

        if (!redisConfig) {
          throw new Error("Missing Redis configuration");
        }

        return redisConfig;
      },
    }),
  ],
  exports: [SharedRedisModule],
})
export class RedisModule {}
