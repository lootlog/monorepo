import { Module, type MiddlewareConsumer } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { LoggerMiddleware } from "@lootlog/nest-shared";
import { ZodValidationPipe } from "nestjs-zod";
import { WinstonModule } from "nest-winston";
import { BullModule } from "@nestjs/bullmq";
import { HealthzModule } from "#src/healthz/healthz.module";
import { DrizzleModule } from "#src/shared/modules/drizzle/drizzle.module";
import { R2Module } from "#src/shared/modules/r2/r2.module";
import { RedisModule } from "#src/shared/modules/redis/redis.module";
import { BattlesModule } from "./battles/battles.module.js";
import { winstonConfig } from "#src/config/winston.config";
import { redisConfig } from "#src/config/redis.config";

const isOpenApiGeneration = process.env.OPENAPI_GENERATION === "true";

@Module({
  imports: [
    HealthzModule,
    WinstonModule.forRoot(winstonConfig),
    BullModule.forRoot({
      connection: {
        ...redisConfig,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        ...(isOpenApiGeneration ? { lazyConnect: true } : {}),
      },
      prefix: "{bull}",
    }),
    DrizzleModule,
    R2Module,
    RedisModule,
    BattlesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).exclude("/healthz").forRoutes("*");
  }
}
