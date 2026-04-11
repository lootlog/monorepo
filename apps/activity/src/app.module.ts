import { MiddlewareConsumer, Module } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule, WinstonModuleOptions } from "nest-winston";
import { APP_CONFIG } from "src/config/app.config";
import { ConfigKey } from "src/config/config-key.enum";
import { HealthzModule } from "src/healthz/healthz.module";
import { ActivitiesModule } from "./activities/activities.module";
import { LoggerMiddleware } from "@lootlog/nest-shared";

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return configService.get<WinstonModuleOptions>(ConfigKey.WINSTON);
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot(APP_CONFIG),
    HealthzModule,
    ActivitiesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).exclude("/healthz").forRoutes("*"); // Apply the middleware to all routes
  }
}
