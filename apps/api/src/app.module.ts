import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule, WinstonModuleOptions } from 'nest-winston';
import { APP_CONFIG } from 'src/config/app.config';
import { DiscordModule } from './discord/discord.module';
import { Auth0Module } from './auth0/auth0.module';
import { UsersModule } from './users/users.module';
import { TimersModule } from './timers/timers.module';
import { LootsModule } from './loots/loots.module';
import { HealthzModule } from 'src/healthz/healthz.module';
import { GuildsModule } from './guilds/guilds.module';
import { RolesModule } from './roles/roles.module';
import { MembersModule } from 'src/members/members.module';
import { PlayersModule } from './players/players.module';
import { NpcsModule } from './npcs/npcs.module';
import { LootlogConfigModule } from './lootlog-config/lootlog-config.module';
import { UserLootlogConfigModule } from './user-lootlog-config/user-lootlog-config.module';
import { ConfigKey } from 'src/config/config-key.enum';
import { LoggerMiddleware } from 'src/middleware/logger.middleware';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return configService.get<WinstonModuleOptions>(ConfigKey.WINSTON);
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot(APP_CONFIG),
    DiscordModule,
    Auth0Module,
    UsersModule,
    TimersModule,
    LootsModule,
    HealthzModule,
    GuildsModule,
    RolesModule,
    MembersModule,
    PlayersModule,
    NpcsModule,
    LootlogConfigModule,
    UserLootlogConfigModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).exclude('/healthz').forRoutes('*'); // Apply the middleware to all routes
  }
}
