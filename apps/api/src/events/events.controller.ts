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
import { Permission } from 'generated/client';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AssignMemberDto } from './dto/assign-member.dto';
import { UpdatePresenceDto } from './dto/update-presence.dto';
import { CreateHeroDto } from './dto/create-hero.dto';
import { CreateMapDto } from './dto/create-map.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class EventsController {
  constructor(private readonly EventsService: EventsService) {}

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/events')
  @ApiOperation({
    summary: 'Create event',
    description: 'Create a new guild event with maps and hero NPCs',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async createEvent(
    @Param('guildId') guildId: string,
    @Body() data: CreateEventDto,
  ) {
    return this.EventsService.createEvent(guildId, data);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events')
  @ApiOperation({
    summary: 'List guild events',
    description: 'Get all events for a guild',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiQuery({
    name: 'world',
    description: 'World name filter',
    required: false,
  })
  @ApiQuery({
    name: 'activeOnly',
    description: 'Only return active events',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of events',
  })
  async getEvents(
    @Param('guildId') guildId: string,
    @Query('world') world?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.EventsService.getEvents(guildId, world, activeOnly !== 'false');
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId')
  @ApiOperation({
    summary: 'Get event details',
    description: 'Get detailed information about a specific event',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event details',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEvent(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.EventsService.getEvent(guildId, eventId);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Patch('/guilds/:guildId/events/:eventId')
  @ApiOperation({
    summary: 'Update event',
    description: 'Update an existing event',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async updateEvent(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Body() data: UpdateEventDto,
  ) {
    return this.EventsService.updateEvent(guildId, eventId, data);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete('/guilds/:guildId/events/:eventId')
  @ApiOperation({
    summary: 'Delete event',
    description: 'Delete an event',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async deleteEvent(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.EventsService.deleteEvent(guildId, eventId);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/events/:eventId/maps/:mapId/assign')
  @ApiOperation({
    summary: 'Assign member to map',
    description: 'Assign a guild member to monitor a specific map',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiResponse({
    status: 200,
    description: 'Member assigned successfully',
  })
  @ApiResponse({ status: 404, description: 'Map not found' })
  async assignMember(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('mapId') mapId: string,
    @Body() data: AssignMemberDto,
  ) {
    return this.EventsService.assignMemberToMap(
      guildId,
      eventId,
      mapId,
      data.memberId,
    );
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/events/:eventId/heroes')
  @ApiOperation({
    summary: 'Add hero to event',
    description: 'Add a new hero to an existing event',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 201,
    description: 'Hero added successfully',
  })
  async addHero(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Body() data: CreateHeroDto,
  ) {
    return this.EventsService.createHero(guildId, eventId, data);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Patch('/guilds/:guildId/events/:eventId/heroes/:heroId')
  @ApiOperation({
    summary: 'Update hero',
    description: 'Update an existing hero details',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 200,
    description: 'Hero updated successfully',
  })
  async updateHero(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Body() data: UpdateHeroDto,
  ) {
    return this.EventsService.updateHero(guildId, eventId, heroId, data);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete('/guilds/:guildId/events/:eventId/heroes/:heroId')
  @ApiOperation({
    summary: 'Delete hero',
    description: 'Remove a hero from the event',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 200,
    description: 'Hero deleted successfully',
  })
  async deleteHero(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
  ) {
    return this.EventsService.deleteHero(guildId, eventId, heroId);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/events/:eventId/heroes/:heroId/maps')
  @ApiOperation({
    summary: 'Add map to hero',
    description: 'Add a new map to an existing hero',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 201,
    description: 'Map added successfully',
  })
  async addMap(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Body() data: CreateMapDto,
  ) {
    return this.EventsService.addMap(guildId, eventId, heroId, data);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete('/guilds/:guildId/events/:eventId/heroes/:heroId/maps/:mapId')
  @ApiOperation({
    summary: 'Delete map',
    description: 'Remove a map from a hero',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiResponse({
    status: 200,
    description: 'Map deleted successfully',
  })
  async deleteMap(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Param('mapId') mapId: string,
  ) {
    return this.EventsService.deleteMap(guildId, eventId, heroId, mapId);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete('/guilds/:guildId/events/:eventId/maps/:mapId/assign')
  @ApiOperation({
    summary: 'Unassign member from map',
    description:
      'Remove an assigned member from a map. If memberId is provided, removes specific member; otherwise removes all.',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiQuery({
    name: 'memberId',
    description: 'Optional member ID to unassign',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Member unassigned successfully',
  })
  @ApiResponse({ status: 404, description: 'Map not found' })
  async unassignMember(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('mapId') mapId: string,
    @Query('memberId') memberId?: string,
  ) {
    return this.EventsService.unassignMemberFromMap(
      guildId,
      eventId,
      mapId,
      memberId ? parseInt(memberId, 10) : undefined,
    );
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/events/:eventId/presence')
  @ApiOperation({
    summary: 'Update presence',
    description: 'Update player presence and AFK status on event maps',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Presence updated',
  })
  async updatePresence(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @DiscordId() discordId: string,
    @Body() data: UpdatePresenceDto,
  ) {
    // Get member for this user in this guild using Prisma directly
    const member = await this.EventsService.getMemberByDiscordId(
      discordId,
      guildId,
    );
    if (!member) {
      return { success: false, message: 'Member not found' };
    }

    return this.EventsService.updatePresence(
      guildId,
      eventId,
      member.id,
      data.mapName,
      data.isAfk,
    );
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/ranking')
  @ApiOperation({
    summary: 'Get event ranking',
    description: 'Get the ranking for an event',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event ranking',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getRanking(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.EventsService.getRanking(guildId, eventId);
  }

  @Permissions(Permission.LOOTLOG_TIMERS_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/timers')
  @ApiOperation({
    summary: 'Get event hero timers',
    description: 'Get timers for all hero NPCs in this event',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiQuery({ name: 'world', description: 'World name', required: true })
  @ApiResponse({
    status: 200,
    description: 'List of timers for event heroes',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventHeroTimers(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Query('world') world: string,
  ) {
    return this.EventsService.getEventHeroTimers(guildId, eventId, world);
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/loots')
  @ApiOperation({
    summary: 'Get event hero loots',
    description: 'Get recent loots from event hero NPCs',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiQuery({ name: 'world', description: 'World name', required: true })
  @ApiQuery({
    name: 'limit',
    description: 'Number of loots to return',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of loots from event heroes',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventHeroLoots(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Query('world') world: string,
    @Query('limit') limit?: string,
  ) {
    return this.EventsService.getEventHeroLoots(
      guildId,
      eventId,
      world,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/hero-stats')
  @ApiOperation({
    summary: 'Get event hero stats',
    description: 'Get kill counts and stats for all heroes in an event',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'List of hero stats with kill counts',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventHeroStats(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.EventsService.getEventHeroStats(guildId, eventId);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/kills')
  @ApiOperation({
    summary: 'Get event kill history',
    description:
      'Get paginated kill history for all heroes in an event, with participant point details',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of kills to return (default 20)',
    required: false,
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Cursor for pagination',
    required: false,
  })
  @ApiQuery({
    name: 'heroId',
    description: 'Filter by hero ID (optional)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of kills with participant details',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventKillHistory(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('heroId') heroId?: string,
  ) {
    return this.EventsService.getEventKillHistory(
      guildId,
      eventId,
      limit ? parseInt(limit, 10) : 20,
      cursor,
      heroId,
    );
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/heroes/:heroId/kills')
  @ApiOperation({
    summary: 'Get hero kill history',
    description:
      'Get paginated kill history for a specific hero, with participant point details',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of kills to return (default 20)',
    required: false,
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Cursor for pagination',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of kills with participant details',
  })
  @ApiResponse({ status: 404, description: 'Hero not found' })
  async getHeroKillHistory(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.EventsService.getHeroKillHistory(
      guildId,
      eventId,
      heroId,
      limit ? parseInt(limit, 10) : 20,
      cursor,
    );
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/heroes/:heroId/kills/:killId')
  @ApiOperation({
    summary: 'Get kill details',
    description:
      'Get detailed information about a specific kill including participants, multipliers, and matching loots',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiParam({ name: 'killId', description: 'Kill ID' })
  @ApiResponse({
    status: 200,
    description: 'Kill details with participants, event config, and matching loots',
  })
  @ApiResponse({ status: 404, description: 'Kill not found' })
  async getKillDetail(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Param('killId') killId: string,
  ) {
    return this.EventsService.getKillDetail(guildId, eventId, heroId, killId);
  }
}
