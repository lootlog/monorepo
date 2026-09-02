import { Module, type MiddlewareConsumer } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { BullModule } from "@nestjs/bullmq";
import { LoggerMiddleware } from "@lootlog/nest-shared";
import { env } from "#src/config/env";
import { UsersModule } from "./users/users.module.js";
import { TimersModule } from "./timers/timers.module.js";
import { TimerSettingsModule } from "./timer-settings/timer-settings.module.js";
import { LootsModule } from "./loots/loots.module.js";
import { HealthzModule } from "#src/healthz/healthz.module";
import { GuildsModule } from "./guilds/guilds.module.js";
import { RolesModule } from "./roles/roles.module.js";
import { MembersModule } from "#src/members/members.module";
import { PlayersModule } from "./players/players.module.js";
import { NpcsModule } from "./npcs/npcs.module.js";
import { LootlogConfigModule } from "./lootlog-config/lootlog-config.module.js";
import { UserLootlogConfigModule } from "./user-lootlog-config/user-lootlog-config.module.js";
import { ChatModule } from "#src/chat/chat.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { ChannelsModule } from "#src/channels/channels.module";
import { MessagingModule } from "#src/messaging/messaging.module";
import { NotificationsModule } from "#src/notifications/notifications.module";
import { DiscordModule } from "./discord/discord.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { ReservationsModule } from "./reservations/reservations.module.js";
import { SoundSettingsModule } from "#src/sound-settings/sound-settings.module";
import { EventsModule } from "#src/events/events.module";
import { MapsModule } from "#src/maps/maps.module";
import { MapTemplatesModule } from "#src/map-templates/map-templates.module";
import { KillsModule } from "#src/kills/kills.module";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";
import { DiagnosticsModule } from "#src/shared/diagnostics/diagnostics.module";
import { PerfDiagnosticsMiddleware } from "#src/shared/diagnostics/perf-diagnostics.middleware";
import { PublicGuildStatsCardModule } from "#src/public-guild-stats-card/public-guild-stats-card.module";
import { DocsModule } from "#src/docs/docs.module";
import { SettingsDocumentsModule } from "#src/settings-documents/settings-documents.module";
import { DrizzleDatabaseModule } from "#src/database/drizzle/drizzle-database.module";
import { ApplicationLoggerModule } from "#src/shared/logging/application-logger.module";

const isOpenApiGeneration = process.env.OPENAPI_GENERATION === "true";

@Module({
  imports: [
    DrizzleDatabaseModule,
    ApplicationLoggerModule,
    BullModule.forRoot({
      connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
        username: env.REDIS_USERNAME,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        ...(isOpenApiGeneration ? { lazyConnect: true } : {}),
      },
      prefix: "{bull}",
    }),
    UsersModule,
    TimersModule,
    TimerSettingsModule,
    LootsModule,
    HealthzModule,
    DiagnosticsModule,
    MemberContextModule,
    GuildsModule,
    RolesModule,
    MembersModule,
    PlayersModule,
    NpcsModule,
    LootlogConfigModule,
    UserLootlogConfigModule,
    ChatModule,
    ReservationsModule,
    RedisModule,
    ChannelsModule,
    MessagingModule,
    NotificationsModule,
    DiscordModule,
    AuthModule,
    SoundSettingsModule,
    EventsModule,
    MapsModule,
    MapTemplatesModule,
    KillsModule,
    PublicGuildStatsCardModule,
    DocsModule,
    SettingsDocumentsModule,
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
    consumer
      .apply(PerfDiagnosticsMiddleware, LoggerMiddleware)
      .exclude("/healthz")
      .forRoutes("*");
  }
}
