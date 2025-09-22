import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule, WinstonModuleOptions } from 'nest-winston';
import { APP_CONFIG } from 'src/config/app.config';
import { ConfigKey } from 'src/config/config-key.enum';
import { HealthzModule } from 'src/healthz/healthz.module';
import { LoggerMiddleware } from 'src/shared/middleware/logger.middleware';
import { RedisModule } from 'src/shared/modules/redis/redis.module';

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
    RedisModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).exclude('/healthz').forRoutes('*'); // Apply the middleware to all routes
  }
}
