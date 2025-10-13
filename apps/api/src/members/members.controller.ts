import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Post('/:discordId/refresh')
  async refreshMember(
    @Param('discordId') discordId: string,
    @GuildData() guild: Guild,
  ) {
    return this.membersService.refreshMember({
      discordId,
      guildId: guild.id,
    });
  }

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get('')
  async getGuildMembers(@GuildData() guild: Guild) {
    return this.membersService.getGuildMembers(guild.id);
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Post('refresh-all')
  async refreshAllMembers(
    @GuildData() guild: Guild,
    @DiscordId() discordId: string,
  ) {
    return this.membersService.createBulkRefreshJob(guild.id, discordId);
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Get('refresh-jobs/latest')
  async getLatestRefreshJob(@GuildData() guild: Guild) {
    return this.membersService.getLatestRefreshJob(guild.id);
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Get('refresh-jobs/:jobId')
  async getRefreshJobStatus(@Param('jobId') jobId: string) {
    return this.membersService.getRefreshJobStatus(parseInt(jobId, 10));
  }
}
