import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotDiscordEventsHandler } from 'src/bot/bot-discord-events.handler';
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { BotNotificationsConsumer } from './bot-notifications.consumer';
import { BotNotificationsService } from './bot-notifications.service';
import { BotPermissionsService } from './bot-permissions.service';
import { BotInternalController } from './bot-internal.controller';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
  ],
  controllers: [BotInternalController],
  providers: [
    BotService,
    BotDiscordEventsHandler,
    BotNotificationsConsumer,
    BotNotificationsService,
    BotPermissionsService,
  ],
})
export class BotModule {}
