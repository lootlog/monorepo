import { MiddlewareConsumer, Module } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";
import { HealthzModule } from "./healthz/healthz.module";
import { APP_CONFIG } from "src/config/app.config";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule, type WinstonModuleOptions } from "nest-winston";
import { ConfigKey } from "src/config/config-key.enum";
import { LoggerMiddleware } from "@lootlog/nest-shared";
import { GatewayModule } from "./gateway/gateway.module";

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return configService.get<WinstonModuleOptions>(ConfigKey.WINSTON);
      },
      inject: [ConfigService],
    }),
    HealthzModule,
    ConfigModule.forRoot(APP_CONFIG),
    ConfigModule,
    GatewayModule,
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
