import { Module } from "@nestjs/common";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { ConfigService } from "@nestjs/config";
import { ChannelsEventsHandler } from "src/channels/channels-events.handler";
import { ChannelsService } from "src/channels/channels.service";
import { ConfigKey } from "src/config/config-key.enum";
import { PrismaModule } from "src/db/prisma.module";
import { DiscordBotClientModule } from "src/discord-bot-client/discord-bot-client.module";

@Module({
  imports: [
    PrismaModule,
    DiscordBotClientModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
  ],
  providers: [ChannelsService, ChannelsEventsHandler],
  exports: [ChannelsService],
})
export class ChannelsModule {}
