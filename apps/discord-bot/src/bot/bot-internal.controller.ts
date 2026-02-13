import { Controller, Get, Param, Query } from '@nestjs/common';
import { BotPermissionsService } from './bot-permissions.service';

@Controller('internal')
export class BotInternalController {
  constructor(private readonly botPermissionsService: BotPermissionsService) {}

  @Get('guilds/:guildId/bot-permissions')
  async getBotPermissions(
    @Param('guildId') guildId: string,
    @Query('channelId') channelId?: string,
    @Query('force') force?: string,
  ) {
    return this.botPermissionsService.getGuildPermissionsStatus({
      guildId,
      channelId,
      force: force === 'true',
    });
  }
}
