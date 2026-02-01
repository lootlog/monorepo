import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Permission, type Role } from 'generated/client';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { MemberPermissions } from 'src/shared/decorators/member-permissions.decorator';
import { MemberRoles } from 'src/shared/decorators/member-roles.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { KillsService } from './kills.service';
import { CreateKillDto } from './dto/create-kill.dto';
import {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from './dto/get-kill-stats.dto';
import { GetUserNpcKillsDto } from './dto/get-user-npc-kills.dto';
import {
  CreateKillResponseEntity,
  GuildKillStatsEntity,
  UserKillStatsEntity,
  UserNpcKillsEntity,
} from './entities/kill-stats.entity';

@ApiTags('kills')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class KillsController {
  constructor(private readonly killsService: KillsService) {}

  @Post('/kills')
  @ApiOperation({
    summary: 'Record a kill',
    description:
      'Records an NPC kill. Guilds are auto-detected from user lootlog config (loot/timer whitelists).',
  })
  @ApiResponse({
    status: 201,
    description: 'Kill recorded successfully',
    type: CreateKillResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  async createKill(
    @Body() data: CreateKillDto,
    @DiscordId() discordId: string,
  ) {
    const result = await this.killsService.createKill(discordId, data);
    return plainToInstance(CreateKillResponseEntity, result);
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/stats/kills')
  @ApiOperation({
    summary: 'Get guild kill statistics',
    description:
      'Retrieves kill statistics for a guild including overview and member ranking.',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiResponse({
    status: 200,
    description: 'Guild kill statistics',
    type: GuildKillStatsEntity,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getGuildKillStats(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @Param('guildId') guildId: string,
    @Query() query: GetGuildKillStatsDto,
  ) {
    const stats = await this.killsService.getGuildKillStats(
      guildId,
      permissions,
      roles,
      query,
    );
    return plainToInstance(GuildKillStatsEntity, stats);
  }

  @Get('/users/@me/stats/kills')
  @ApiOperation({
    summary: 'Get personal kill statistics',
    description:
      'Retrieves kill statistics for the authenticated user across all guilds, deduplicated.',
  })
  @ApiResponse({
    status: 200,
    description: 'User kill statistics',
    type: UserKillStatsEntity,
  })
  async getUserKillStats(
    @DiscordId() discordId: string,
    @Query() query: GetUserKillStatsDto,
  ) {
    const stats = await this.killsService.getUserKillStats(discordId, query);
    return plainToInstance(UserKillStatsEntity, stats);
  }

  @Get('/users/@me/kills/npcs')
  @ApiOperation({
    summary: 'Get paginated list of killed NPCs',
    description:
      'Retrieves a paginated, searchable list of NPCs killed by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of killed NPCs',
    type: UserNpcKillsEntity,
  })
  async getUserNpcKills(
    @DiscordId() discordId: string,
    @Query() query: GetUserNpcKillsDto,
  ) {
    const result = await this.killsService.getUserNpcKills(discordId, query);
    return plainToInstance(UserNpcKillsEntity, result);
  }
}
