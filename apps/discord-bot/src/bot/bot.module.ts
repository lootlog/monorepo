import { Module } from "@nestjs/common";
import { BotDiscordEventsHandler } from "src/bot/bot-discord-events.handler";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { ConfigService } from "@nestjs/config";
import { ConfigKey } from "src/config/config-key.enum";
import { BotInternalController } from "src/bot/bot-internal.controller";
import { BotNotificationsConsumer } from "src/bot/bot-notifications.consumer";
import { DiscordDeliveryService } from "src/bot/discord-delivery.service";
import { DiscordSyncService } from "src/bot/discord-sync.service";

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
    DiscordSyncService,
    DiscordDeliveryService,
    BotDiscordEventsHandler,
    BotNotificationsConsumer,
  ],
})
export class BotModule {}
