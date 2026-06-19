import { MiddlewareConsumer, Module } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";
import { HealthzModule } from "./healthz/healthz.module";
import { WinstonModule } from "nest-winston";
import { LoggerMiddleware } from "@lootlog/nest-shared";
import { GatewayModule } from "./gateway/gateway.module";
import { winstonConfig } from "src/config/winston.config";

@Module({
  imports: [WinstonModule.forRoot(winstonConfig), HealthzModule, GatewayModule],
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
