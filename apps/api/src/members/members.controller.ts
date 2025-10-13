import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MembersService } from './members.service';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Guild, Permission } from 'generated/client';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { MemberEntity } from 'src/shared/entities/member.entity';
import { MemberRefreshJobEntity } from 'src/shared/entities/member-refresh-job.entity';

@ApiTags('members')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('guilds/:guildId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('@me')
  @ApiOperation({
    summary: 'Get current member',
    description: 'Retrieve the authenticated user\'s member information for this guild',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiResponse({
    status: 200,
    description: 'Current member information',
    type: MemberEntity,
  })
  @ApiResponse({ status: 404, description: 'Member not found' })
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
  @ApiOperation({
    summary: 'Refresh current member',
    description: 'Refresh the authenticated user\'s member information from Discord',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiResponse({
    status: 200,
    description: 'Refreshed member information',
    type: MemberEntity,
  })
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
  @ApiOperation({
    summary: 'Refresh specific member',
    description: 'Refresh a specific member\'s information from Discord (admin only)',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiParam({ name: 'discordId', description: 'Discord user ID', example: 'user_123' })
  @ApiResponse({
    status: 200,
    description: 'Member refreshed successfully',
    type: MemberEntity,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin permission required' })
  @ApiResponse({ status: 404, description: 'Member not found' })
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
  @Get()
  @ApiOperation({
    summary: 'Get guild members',
    description: 'Retrieve all members for a guild',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiResponse({
    status: 200,
    description: 'List of guild members',
    type: [MemberEntity],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getGuildMembers(@GuildData() guild: Guild) {
    return this.membersService.getGuildMembers(guild.id);
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Post('refresh-all')
  @ApiOperation({
    summary: 'Refresh all members',
    description: 'Create a job to refresh all guild members (admin only)',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiResponse({
    status: 201,
    description: 'Bulk refresh job created',
    type: MemberRefreshJobEntity,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin permission required' })
  async refreshAllMembers(
    @GuildData() guild: Guild,
    @DiscordId() discordId: string,
  ) {
    return this.membersService.createBulkRefreshJob(guild.id, discordId);
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Get('refresh-jobs/latest')
  @ApiOperation({
    summary: 'Get latest refresh job',
    description: 'Retrieve the latest member refresh job for this guild',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiResponse({
    status: 200,
    description: 'Latest refresh job',
    type: MemberRefreshJobEntity,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin permission required' })
  @ApiResponse({ status: 404, description: 'No refresh jobs found' })
  async getLatestRefreshJob(@GuildData() guild: Guild) {
    return this.membersService.getLatestRefreshJob(guild.id);
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Get('refresh-jobs/:jobId')
  @ApiOperation({
    summary: 'Get refresh job status',
    description: 'Retrieve the status of a specific refresh job',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiParam({ name: 'jobId', description: 'Refresh job ID', example: '123' })
  @ApiResponse({
    status: 200,
    description: 'Refresh job status',
    type: MemberRefreshJobEntity,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin permission required' })
  @ApiResponse({ status: 404, description: 'Refresh job not found' })
  async getRefreshJobStatus(@Param('jobId') jobId: string) {
    return this.membersService.getRefreshJobStatus(parseInt(jobId, 10));
  }
}
