import { Module, type MiddlewareConsumer } from "@nestjs/common";
import { LoggerMiddleware } from "@lootlog/nest-shared";
import { WinstonModule } from "nest-winston";
import { winstonConfig } from "src/config/winston.config";
import { AuthModule } from "src/auth/auth.module";
import { DrizzleModule } from "src/database/drizzle.module";
import { HealthzModule } from "src/healthz/healthz.module";

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    DrizzleModule,
    HealthzModule,
    AuthModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).exclude("/healthz").forRoutes("*");
  }
}
