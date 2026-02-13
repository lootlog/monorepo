import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from '@golevelup/nestjs-rabbitmq';
import { APP_CONFIG } from 'src/config/app.config';
import { ConfigKey } from 'src/config/config-key.enum';
import { DbModule } from 'src/db/db.module';
import { DiscordBotModule } from 'src/discord-bot/discord-bot.module';
import { HealthzModule } from 'src/healthz/healthz.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PermissionsModule } from 'src/permissions/permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot(APP_CONFIG),
    HttpModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    DbModule,
    PermissionsModule,
    DiscordBotModule,
    NotificationsModule,
    HealthzModule,
  ],
})
export class AppModule {}
