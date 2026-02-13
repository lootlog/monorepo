import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { DiscordBotClientService } from "./discord-bot.service";

@Module({
  imports: [HttpModule],
  providers: [DiscordBotClientService],
  exports: [DiscordBotClientService],
})
export class DiscordBotModule {}
