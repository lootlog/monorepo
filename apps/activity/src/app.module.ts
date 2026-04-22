import { MiddlewareConsumer, Module } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { WinstonModule } from "nest-winston";
import { HealthzModule } from "src/healthz/healthz.module";
import { ActivitiesModule } from "./activities/activities.module";
import { LoggerMiddleware } from "@lootlog/nest-shared/middleware";
import { winstonConfig } from "src/config/winston.config";

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
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
