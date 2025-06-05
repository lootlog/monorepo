import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Guild, Permission } from '@prisma/client';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { CreateTimerDto } from 'src/timers/dto/create-timer.dto';
import { TimersService } from 'src/timers/timers.service';

@UseGuards(AuthGuard)
@Controller('')
export class TimersController {
  constructor(private readonly timersService: TimersService) {}

  @Get('/timers')
  async getTimersMerged(
    @Query('world') world: string,
    @DiscordId() discordId: string,
  ) {
    return this.timersService.getTimersMerged(discordId, {
      world,
    });
  }

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/timers')
  async getTimers(@Query('world') world: string, @GuildData() guild: Guild) {
    return this.timersService.getTimers({
      world,
      guildId: guild.id,
    });
  }

  @Permissions(Permission.LOOTLOG_WRITE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/timers')
  async createTimer(
    @Body() data: CreateTimerDto,
    @GuildData() guild: Guild,
    @DiscordId() discordId: string,
  ) {
    return this.timersService.createTimer(discordId, guild.id, data);
  }
}
