import { Module, type MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule, type WinstonModuleOptions } from "nest-winston";
import { APP_CONFIG } from "src/config/app.config";
import { ConfigKey } from "src/config/config-key.enum";
import { HealthzModule } from "src/healthz/healthz.module";
import { LoggerMiddleware } from "src/shared/middleware/logger.middleware";
import { PrismaModule } from "src/shared/modules/prisma/prisma.module";
import { R2Module } from "src/shared/modules/r2/r2.module";
import { RedisModule } from "src/shared/modules/redis/redis.module";
import { BattlesModule } from "./battles/battles.module";

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
    PrismaModule,
    R2Module,
    RedisModule,
    BattlesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).exclude("/healthz").forRoutes("*"); // Apply the middleware to all routes
  }
}
