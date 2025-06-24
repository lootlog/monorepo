import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Guild, Permission } from 'generated/client';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { MemberPermissions } from 'src/shared/decorators/member-permissions.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { CreateManualTimerDto } from 'src/timers/dto/create-manual-timer.dto';
import { CreateTimerDto } from 'src/timers/dto/create-timer.dto';
import { ResetTimerDto } from 'src/timers/dto/reset-timer.dto';
import { TimersService } from 'src/timers/timers.service';

@UseGuards(AuthGuard)
@Controller('')
export class TimersController {
  constructor(private readonly timersService: TimersService) {}

  @Get('/timers')
  async getAllTimers(
    @Query('world') world: string,
    @DiscordId() discordId: string,
  ) {
    return this.timersService.getAllTimers(discordId, {
      world,
    });
  }

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/timers')
  async getTimers(
    @Query('world') world: string,
    @MemberPermissions() permissions: Permission[],
    @GuildData() guild: Guild,
  ) {
    return this.timersService.getTimers(
      {
        world,
      },
      guild,
      permissions,
    );
  }

  @Permissions(Permission.LOOTLOG_WRITE)
  @UseGuards(PermissionsGuard)
  @Patch('/guilds/:guildId/timers/:npcId/reset')
  async resetTimer(
    @Query('world') world: string,
    @DiscordId() discordId: string,
    @Param('guildId') guildId: string,
    @Param('npcId') npcId: string,
    @Body() data: ResetTimerDto,
  ) {
    return this.timersService.resetTimer(discordId, guildId, npcId, data);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete('/guilds/:guildId/timers/:npcId')
  async deleteTimer(
    @Query('world') world: string,
    @Param('guildId') guildId: string,
    @Param('npcId') npcId: string,
  ) {
    return this.timersService.deleteTimer(guildId, npcId, world);
  }

  @Post('/timers')
  async createTimer(
    @Body() data: CreateTimerDto,
    @DiscordId() discordId: string,
  ) {
    return this.timersService.createTimer(discordId, data);
  }

  @Permissions(Permission.LOOTLOG_WRITE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/timers')
  async createManualTimer(
    @Body() data: CreateManualTimerDto,
    @DiscordId() discordId: string,
    @Param('guildId') guildId: string,
  ) {
    return this.timersService.createManualTimer(discordId, guildId, data);
  }
}
