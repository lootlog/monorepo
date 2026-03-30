import { Module, type MiddlewareConsumer } from "@nestjs/common";
import { LoggerMiddleware, type RedisConfig } from "@lootlog/nest-shared";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule, type WinstonModuleOptions } from "nest-winston";
import { BullModule } from "@nestjs/bullmq";
import { RabbitMQModule, type RabbitMQConfig } from "@golevelup/nestjs-rabbitmq";
import { APP_CONFIG } from "src/config/app.config";
import { ConfigKey } from "src/config/config-key.enum";
import { HealthzModule } from "src/healthz/healthz.module";
import { DrizzleModule } from "src/shared/modules/drizzle/drizzle.module";
import { TargetsModule } from "src/targets/targets.module";
import { RulesModule } from "src/rules/rules.module";
import { WatchedItemsModule } from "src/watched-items/watched-items.module";
import { ConsumersModule } from "src/consumers/consumers.module";
import { SchedulerModule } from "src/scheduler/scheduler.module";
import { DiscordChannelsModule } from "src/discord-channels/discord-channels.module";
import { DeliveryModule } from "src/delivery/delivery.module";

@Module({
  imports: [
    HealthzModule,
    WinstonModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return configService.get<WinstonModuleOptions>(ConfigKey.WINSTON)!;
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot(APP_CONFIG),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(ConfigKey.REDIS)!;
        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            username: redisConfig.username,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          prefix: "{bull}",
        };
      },
    }),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ)!;
      },
    }),
    DrizzleModule,
    TargetsModule,
    RulesModule,
    WatchedItemsModule,
    ConsumersModule,
    SchedulerModule,
    DiscordChannelsModule,
    DeliveryModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).exclude("/healthz").forRoutes("*");
  }
}
