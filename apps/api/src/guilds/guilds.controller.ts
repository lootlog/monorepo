import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Guild, Permission } from 'generated/client';
import { UpdateGuildConfigDto } from 'src/guilds/dto/update-guild-config.dto';
import { GuildsService } from 'src/guilds/guilds.service';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { MemberPermissions } from 'src/shared/decorators/member-permissions.decorator';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';

@ApiTags('guilds')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('guilds')
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  @Get('/@me')
  @ApiOperation({ summary: 'Get user guilds', description: 'Retrieve all guilds for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of user guilds' })
  @ApiQuery({ name: 'source', required: false, description: 'Source of the request' })
  async getUserGuilds(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Query('source') source: string,
  ) {
    return this.guildsService.getUserGuilds(discordId, userId, source);
  }

  @Get('/@me/manageable')
  async getManageableUserGuilds(
    @DiscordId() discordId: string,
    @UserId() userId: string,
  ) {
    return this.guildsService.getManageableUserGuilds(discordId, userId);
  }

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get(':guildId')
  @ApiOperation({ summary: 'Get guild by ID', description: 'Retrieve guild information by guild ID' })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiResponse({ status: 200, description: 'Guild information' })
  async getGuildById(@GuildData() guild: Guild) {
    return this.guildsService.getGuildById(guild.id);
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Patch(':guildId/config')
  async updateGuildConfig(
    @GuildData() guild: Guild,
    @Body() data: UpdateGuildConfigDto,
  ) {
    return this.guildsService.updateGuildConfig(guild.id, data);
  }

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get(':guildId/config')
  async getGuildConfig(@GuildData() guild: Guild) {
    return this.guildsService.getGuildById(guild.id);
  }

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get(':guildId/worlds')
  async getWorldsByGuildId(@GuildData() guild: Guild) {
    return this.guildsService.getWorldsByGuildId(guild.id);
  }

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get(':guildId/permissions')
  async getGuildPermissions(@MemberPermissions() permissions: Permission[]) {
    return permissions;
  }
}
