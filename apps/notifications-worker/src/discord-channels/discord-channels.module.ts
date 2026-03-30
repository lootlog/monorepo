import { Module } from "@nestjs/common";
import { DiscordChannelsController } from "./discord-channels.controller";
import { DiscordChannelsService } from "./discord-channels.service";

@Module({
  controllers: [DiscordChannelsController],
  providers: [DiscordChannelsService],
  exports: [DiscordChannelsService],
})
export class DiscordChannelsModule {}
