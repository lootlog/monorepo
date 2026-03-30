import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthGuard } from "@lootlog/nest-shared";
import { DiscordChannelsService } from "./discord-channels.service";

@ApiTags("discord-channels")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("discord-channels")
export class DiscordChannelsController {
  constructor(
    private readonly discordChannelsService: DiscordChannelsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List Discord text channels for a guild" })
  getChannels(@Query("guildId") guildId: string) {
    return this.discordChannelsService.getChannels(guildId);
  }

  @Get("bot-status")
  @ApiOperation({ summary: "Get bot status and permissions for a guild" })
  getBotStatus(@Query("guildId") guildId: string) {
    return this.discordChannelsService.getBotStatus(guildId);
  }
}
