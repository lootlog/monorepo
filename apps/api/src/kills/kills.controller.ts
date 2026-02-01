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
import { Permission } from 'generated/client';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { KillsService } from './kills.service';
import { CreateKillDto } from './dto/create-kill.dto';
import {
  GetGuildKillStatsDto,
  GetPlayerKillStatsDto,
} from './dto/get-kill-stats.dto';
import {
  CreateKillResponseEntity,
  GuildKillStatsEntity,
  PlayerKillStatsEntity,
} from './entities/kill-stats.entity';

@ApiTags('kills')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class KillsController {
  constructor(private readonly killsService: KillsService) {}

  @Permissions(Permission.LOOTLOG_LOOTS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/kills')
  @ApiOperation({
    summary: 'Record a kill for a guild',
    description:
      'Records an NPC kill for a specific guild. Handles deduplication across players and guilds.',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiResponse({
    status: 201,
    description: 'Kill recorded successfully',
    type: CreateKillResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or member not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async createKill(
    @Body() data: CreateKillDto,
    @DiscordId() discordId: string,
    @Param('guildId') guildId: string,
  ) {
    const result = await this.killsService.createKillForGuild(
      discordId,
      guildId,
      data,
    );
    return plainToInstance(CreateKillResponseEntity, result);
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/stats/kills')
  @ApiOperation({
    summary: 'Get guild kill statistics',
    description:
      'Retrieves kill statistics for a guild including overview, member ranking, and recent kills.',
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
    @Param('guildId') guildId: string,
    @Query() query: GetGuildKillStatsDto,
  ) {
    const stats = await this.killsService.getGuildKillStats(guildId, query);
    return plainToInstance(GuildKillStatsEntity, stats);
  }

  @Get('/users/@me/stats/kills')
  @ApiOperation({
    summary: 'Get player kill statistics',
    description:
      'Retrieves kill statistics for the authenticated player across all characters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Player kill statistics',
    type: PlayerKillStatsEntity,
  })
  async getPlayerKillStats(
    @DiscordId() discordId: string,
    @Query() query: GetPlayerKillStatsDto,
  ) {
    const stats = await this.killsService.getPlayerKillStats(discordId, query);
    return plainToInstance(PlayerKillStatsEntity, stats);
  }
}
