import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { DiscordBotClientService } from "src/discord-bot-client/discord-bot-client.service";

@Module({
  imports: [HttpModule],
  providers: [DiscordBotClientService],
  exports: [DiscordBotClientService],
})
export class DiscordBotClientModule {}
