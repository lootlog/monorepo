import { Controller, Get, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Guild, Permission } from 'generated/client';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';

@UseGuards(AuthGuard)
@Controller('guilds/:guildId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get('')
  async getGuildMembers(@GuildData() guild: Guild) {
    return this.membersService.getGuildMembers(guild.id);
  }
}
