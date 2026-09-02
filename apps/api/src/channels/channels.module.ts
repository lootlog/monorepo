import { Module } from "@nestjs/common";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { ChannelsEventsHandler } from "#src/channels/channels-events.handler";
import { ChannelsService } from "#src/channels/channels.service";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { DiscordBotClientModule } from "#src/discord-bot-client/discord-bot-client.module";
import { ChannelsRepository } from "./channels.repository.js";

@Module({
  imports: [DiscordBotClientModule, RabbitMQModule.forRoot(rabbitmqConfig)],
  providers: [ChannelsRepository, ChannelsService, ChannelsEventsHandler],
  exports: [ChannelsService],
})
export class ChannelsModule {}
