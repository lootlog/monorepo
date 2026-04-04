import { Module, type MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule, type WinstonModuleOptions } from "nest-winston";
import { BullModule } from "@nestjs/bullmq";
import { LoggerMiddleware, type RedisConfig } from "@lootlog/nest-shared";
import { APP_CONFIG } from "src/config/app.config";
import { UsersModule } from "./users/users.module";
import { TimersModule } from "./timers/timers.module";
import { TimerSettingsModule } from "./timer-settings/timer-settings.module";
import { LootsModule } from "./loots/loots.module";
import { HealthzModule } from "src/healthz/healthz.module";
import { GuildsModule } from "./guilds/guilds.module";
import { RolesModule } from "./roles/roles.module";
import { MembersModule } from "src/members/members.module";
import { PlayersModule } from "./players/players.module";
import { NpcsModule } from "./npcs/npcs.module";
import { LootlogConfigModule } from "./lootlog-config/lootlog-config.module";
import { UserLootlogConfigModule } from "./user-lootlog-config/user-lootlog-config.module";
import { ConfigKey } from "src/config/config-key.enum";
import { ChatModule } from "src/chat/chat.module";
import { RedisModule } from "src/lib/redis/redis.module";
import { ChannelsModule } from "src/channels/channels.module";
import { MessagingModule } from "src/messaging/messaging.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { DiscordModule } from "./discord/discord.module";
import { AuthModule } from "./auth/auth.module";
import { ReservationsModule } from "./reservations/reservations.module";
import { SoundSettingsModule } from "src/sound-settings/sound-settings.module";
import { EventsModule } from "src/events/events.module";
import { MapsModule } from "src/maps/maps.module";
import { MapTemplatesModule } from "src/map-templates/map-templates.module";
import { KillsModule } from "src/kills/kills.module";
import { MemberContextModule } from "src/shared/permissions/member-context.module";

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return configService.get<WinstonModuleOptions>(ConfigKey.WINSTON);
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot(APP_CONFIG),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(ConfigKey.REDIS);
        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            username: redisConfig.username,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          prefix: "{bull}",
        };
      },
    }),
    UsersModule,
    TimersModule,
    TimerSettingsModule,
    LootsModule,
    HealthzModule,
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).exclude("/healthz").forRoutes("*"); // Apply the middleware to all routes
  }
}
