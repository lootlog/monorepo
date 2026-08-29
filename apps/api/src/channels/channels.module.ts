import { Module } from "@nestjs/common";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { ChannelsEventsHandler } from "#src/channels/channels-events.handler";
import { ChannelsService } from "#src/channels/channels.service";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { PrismaModule } from "#src/db/prisma.module";
import { DiscordBotClientModule } from "#src/discord-bot-client/discord-bot-client.module";

@Module({
  imports: [
    PrismaModule,
    DiscordBotClientModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
  ],
  providers: [ChannelsService, ChannelsEventsHandler],
  exports: [ChannelsService],
})
export class ChannelsModule {}
