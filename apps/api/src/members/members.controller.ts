import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Guild, Permission } from 'generated/client';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { UserId } from 'src/shared/decorators/user-id.decorator';

@UseGuards(AuthGuard)
@Controller('guilds/:guildId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('@me')
  async getMe(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param('guildId') guildId: string,
  ) {
    return this.membersService.getGuildMemberById({
      discordId,
      guildId,
      userId,
      standalone: true,
    });
  }

  @Post('@me/refresh')
  async refreshMe(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param('guildId') guildId: string,
  ) {
    return this.membersService.getGuildMemberById({
      discordId,
      guildId,
      userId,
      refresh: true,
      standalone: true,
    });
  }

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get('')
  async getGuildMembers(@GuildData() guild: Guild) {
    return this.membersService.getGuildMembers(guild.id);
  }
}
