import { Module } from "@nestjs/common";
import { BotDiscordEventsHandler } from "#src/bot/bot-discord-events.handler";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { BotInternalController } from "#src/bot/bot-internal.controller";
import { BotNotificationsConsumer } from "#src/bot/bot-notifications.consumer";
import { DiscordDeliveryService } from "#src/bot/discord-delivery.service";
import { DiscordSyncService } from "#src/bot/discord-sync.service";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";

export const botRabbitMqModule = RabbitMQModule.forRoot(rabbitmqConfig);

@Module({
  imports: [botRabbitMqModule],
  controllers: [BotInternalController],
  providers: [
    DiscordSyncService,
    DiscordDeliveryService,
    BotDiscordEventsHandler,
    BotNotificationsConsumer,
  ],
})
export class BotModule {}
