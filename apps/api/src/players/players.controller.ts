import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Guild, Permission } from '@prisma/client';
import { FetchGuildPlayersDto } from 'src/players/dto/fetch-guild-players.dto';
import { PlayersService } from 'src/players/players.service';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';

@UseGuards(AuthGuard)
@Controller('')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/players')
  async getPlayers(
    @GuildData() guild: Guild,
    @Query() query: FetchGuildPlayersDto,
  ) {
    return this.playersService.getPlayers(query);
  }
}
