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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Guild, Permission, Role } from 'generated/client';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { MemberPermissions } from 'src/shared/decorators/member-permissions.decorator';
import { MemberRoles } from 'src/shared/decorators/member-roles.decorator';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { CreateManualTimerDto } from 'src/timers/dto/create-manual-timer.dto';
import { CreateTimerDto } from 'src/timers/dto/create-timer.dto';
import { ResetTimerDto } from 'src/timers/dto/reset-timer.dto';
import { TimersService } from 'src/timers/timers.service';
import { TimerEntity } from 'src/shared/entities/timer.entity';

@ApiTags('timers')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class TimersController {
  constructor(private readonly timersService: TimersService) {}

  @Get('/timers')
  @ApiOperation({
    summary: 'Get all user timers',
    description: 'Retrieve all timers accessible to the authenticated user across all guilds',
  })
  @ApiQuery({ name: 'world', description: 'World name filter', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of timers',
    type: [TimerEntity],
  })
  async getAllTimers(
    @Query('world') world: string,
    @DiscordId() discordId: string,
    @UserId() userId: string,
  ) {
    return this.timersService.getAllTimers(discordId, userId, {
      world,
    });
  }

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/timers')
  @ApiOperation({
    summary: 'Get guild timers',
    description: 'Retrieve timers for a specific guild',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiQuery({ name: 'world', description: 'World name filter', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of guild timers',
    type: [TimerEntity],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getTimers(
    @Query('world') world: string,
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
  ) {
    return this.timersService.getTimers(
      {
        world,
      },
      guild,
      permissions,
      roles,
    );
  }

  @Permissions(Permission.LOOTLOG_WRITE)
  @UseGuards(PermissionsGuard)
  @Patch('/guilds/:guildId/timers/:npcId/reset')
  @ApiOperation({
    summary: 'Reset timer',
    description: 'Reset a timer for a specific NPC in a guild',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiParam({ name: 'npcId', description: 'NPC ID', example: '12345' })
  @ApiQuery({ name: 'world', description: 'World name', required: false })
  @ApiResponse({
    status: 200,
    description: 'Timer reset successfully',
    type: TimerEntity,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Timer not found' })
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
  @ApiOperation({
    summary: 'Delete timer',
    description: 'Delete a timer for a specific NPC in a guild',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiParam({ name: 'npcId', description: 'NPC ID', example: '12345' })
  @ApiQuery({ name: 'world', description: 'World name', required: false })
  @ApiResponse({
    status: 200,
    description: 'Timer deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - manage permission required' })
  @ApiResponse({ status: 404, description: 'Timer not found' })
  async deleteTimer(
    @Query('world') world: string,
    @Param('guildId') guildId: string,
    @Param('npcId') npcId: string,
  ) {
    return this.timersService.deleteTimer(guildId, npcId, world);
  }

  @Post('/timers')
  @ApiOperation({
    summary: 'Create user timer',
    description: 'Create a timer submitted by user from game client',
  })
  @ApiResponse({
    status: 201,
    description: 'Timer created successfully',
    type: TimerEntity,
  })
  async createTimer(
    @Body() data: CreateTimerDto,
    @DiscordId() discordId: string,
    @UserId() userId: string,
  ) {
    return this.timersService.createTimer(discordId, userId, data);
  }

  @Permissions(Permission.LOOTLOG_WRITE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/timers')
  @ApiOperation({
    summary: 'Create manual timer',
    description: 'Manually create a timer for a guild',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiResponse({
    status: 201,
    description: 'Manual timer created successfully',
    type: TimerEntity,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async createManualTimer(
    @Body() data: CreateManualTimerDto,
    @DiscordId() discordId: string,
    @Param('guildId') guildId: string,
  ) {
    return this.timersService.createManualTimer(discordId, guildId, data);
  }
}
