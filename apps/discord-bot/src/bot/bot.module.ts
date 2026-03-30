import { Module } from "@nestjs/common";
import { BotService } from "./bot.service";
import { BotDiscordEventsHandler } from "src/bot/bot-discord-events.handler";
import { NotificationDeliveryHandler } from "src/bot/notification-delivery.handler";
import { ChannelsController } from "src/bot/channels.controller";
import { BotStatusController } from "src/bot/bot-status.controller";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { ConfigService } from "@nestjs/config";
import { ConfigKey } from "src/config/config-key.enum";

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
  ],
  controllers: [ChannelsController, BotStatusController],
  providers: [BotService, BotDiscordEventsHandler, NotificationDeliveryHandler],
})
export class BotModule {}
