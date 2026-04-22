import { Module, type MiddlewareConsumer } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { WinstonModule } from "nest-winston";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { LoggerMiddleware } from "@lootlog/nest-shared/middleware";
import { winstonConfig } from "src/config/winston.config";
import { HealthzModule } from "src/healthz/healthz.module";
import { MeilisearchModule } from "src/meilisearch/meilisearch.module";
import { PlayersModule } from "src/players/players.module";
import { NpcsModule } from "src/npcs/npcs.module";
import { ItemsModule } from "src/items/items.module";
import { AllModule } from "src/all/all.module";
import { UserMetadataMiddleware } from "src/shared/user-metadata.middleware";

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    HealthzModule,
    MeilisearchModule,
    PlayersModule,
    NpcsModule,
    ItemsModule,
    AllModule,
  ],
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
    consumer
      .apply(UserMetadataMiddleware, LoggerMiddleware)
      .exclude("/healthz")
      .forRoutes("*");
  }
}
