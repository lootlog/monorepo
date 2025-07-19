import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotDiscordEventsHandler } from 'src/bot/bot-discord-events.handler';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
  ],
  controllers: [],
  providers: [BotService, BotDiscordEventsHandler],
})
export class BotModule {}
