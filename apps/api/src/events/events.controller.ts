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
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { GuildMember } from 'src/shared/decorators/member.decorator';
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
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ReorderLocationsDto } from './dto/reorder-locations.dto';
import { AssignMapLocationDto } from './dto/assign-map-location.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { CloseRespawnWindowDto } from './dto/close-respawn-window.dto';
import { OpenRespawnWindowDto } from './dto/open-respawn-window.dto';
import {
  UpdateKillPointDto,
  UpdateRankingPointsDto,
} from './dto/update-points.dto';

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

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/events/:eventId/maps/:mapId/self-assign')
  @ApiOperation({
    summary: 'Self-assign to map',
    description: 'Assign yourself to monitor a specific map',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiResponse({
    status: 200,
    description: 'Self-assigned successfully',
  })
  @ApiResponse({ status: 404, description: 'Map not found' })
  async selfAssignMember(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('mapId') mapId: string,
    @GuildMember() member: { id: number },
  ) {
    return this.EventsService.assignMemberToMap(
      guildId,
      eventId,
      mapId,
      member.id,
    );
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Delete('/guilds/:guildId/events/:eventId/maps/:mapId/self-assign')
  @ApiOperation({
    summary: 'Self-unassign from map',
    description: 'Remove yourself from a specific map',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiResponse({
    status: 200,
    description: 'Self-unassigned successfully',
  })
  @ApiResponse({ status: 404, description: 'Map not found' })
  async selfUnassignMember(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('mapId') mapId: string,
    @GuildMember() member: { id: number },
  ) {
    return this.EventsService.unassignMemberFromMap(
      guildId,
      eventId,
      mapId,
      member.id,
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

  // ========== LOCATION MANAGEMENT ==========

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/heroes/:heroId/locations')
  @ApiOperation({
    summary: 'Get hero locations',
    description: 'Get all locations for a hero with their maps',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 200,
    description: 'List of locations with maps',
  })
  async getLocations(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
  ) {
    return this.EventsService.getLocations(guildId, eventId, heroId);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/events/:eventId/heroes/:heroId/locations')
  @ApiOperation({
    summary: 'Create location',
    description: 'Create a new location for grouping maps',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 201,
    description: 'Location created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Location with this name already exists',
  })
  async createLocation(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Body() data: CreateLocationDto,
  ) {
    return this.EventsService.createLocation(guildId, eventId, heroId, data);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Patch(
    '/guilds/:guildId/events/:eventId/heroes/:heroId/locations/:locationId',
  )
  @ApiOperation({
    summary: 'Update location',
    description: 'Update a location name',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async updateLocation(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Param('locationId') locationId: string,
    @Body() data: UpdateLocationDto,
  ) {
    return this.EventsService.updateLocation(
      guildId,
      eventId,
      heroId,
      locationId,
      data,
    );
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete(
    '/guilds/:guildId/events/:eventId/heroes/:heroId/locations/:locationId',
  )
  @ApiOperation({
    summary: 'Delete location',
    description:
      'Delete a location. Maps in this location will become ungrouped.',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiResponse({
    status: 200,
    description: 'Location deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async deleteLocation(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.EventsService.deleteLocation(
      guildId,
      eventId,
      heroId,
      locationId,
    );
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/events/:eventId/heroes/:heroId/locations/reorder')
  @ApiOperation({
    summary: 'Reorder locations',
    description: 'Change the order of locations',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 200,
    description: 'Locations reordered successfully',
  })
  async reorderLocations(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Body() data: ReorderLocationsDto,
  ) {
    return this.EventsService.reorderLocations(guildId, eventId, heroId, data);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Patch('/guilds/:guildId/events/:eventId/heroes/:heroId/maps/:mapId/location')
  @ApiOperation({
    summary: 'Assign map to location',
    description:
      'Assign a map to a location or remove it from a location (set to null)',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiResponse({
    status: 200,
    description: 'Map location updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Map or location not found' })
  async assignMapToLocation(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Param('mapId') mapId: string,
    @Body() data: AssignMapLocationDto,
  ) {
    return this.EventsService.assignMapToLocation(
      guildId,
      eventId,
      heroId,
      mapId,
      data.locationId ?? null,
    );
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

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Patch('/guilds/:guildId/events/:eventId/ranking/:rankingId')
  @ApiOperation({
    summary: 'Update ranking points',
    description: 'Manually update total points for a ranking entry (OWNER/ADMIN only)',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'rankingId', description: 'Ranking ID' })
  @ApiResponse({
    status: 200,
    description: 'Ranking updated',
  })
  @ApiResponse({ status: 404, description: 'Ranking not found' })
  async updateRankingPoints(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('rankingId') rankingId: string,
    @Body() data: UpdateRankingPointsDto,
    @UserId() userId: string,
  ) {
    return this.EventsService.updateRankingPoints(
      guildId,
      eventId,
      rankingId,
      data.totalPoints,
      userId,
    );
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/ranking/:rankingId/history')
  @ApiOperation({
    summary: 'Get ranking edit history',
    description: 'Get the edit history for a ranking entry (OWNER/ADMIN only)',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'rankingId', description: 'Ranking ID' })
  @ApiResponse({
    status: 200,
    description: 'Edit history returned',
  })
  @ApiResponse({ status: 404, description: 'Ranking not found' })
  async getRankingEditHistory(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('rankingId') rankingId: string,
  ) {
    return this.EventsService.getRankingEditHistory(guildId, eventId, rankingId);
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
    description:
      'Kill details with participants, event config, and matching loots',
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

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Patch('/guilds/:guildId/events/:eventId/kills/:killId/points/:killPointId')
  @ApiOperation({
    summary: 'Update kill point',
    description:
      'Manually update points for a specific kill participant (OWNER/ADMIN only). Automatically recalculates ranking.',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'killId', description: 'Kill ID' })
  @ApiParam({ name: 'killPointId', description: 'Kill Point ID' })
  @ApiResponse({
    status: 200,
    description: 'Kill point updated and ranking recalculated',
  })
  @ApiResponse({ status: 404, description: 'Kill point not found' })
  async updateKillPoint(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('killId') killId: string,
    @Param('killPointId') killPointId: string,
    @Body() data: UpdateKillPointDto,
    @UserId() userId: string,
  ) {
    return this.EventsService.updateKillPoint(
      guildId,
      eventId,
      killId,
      killPointId,
      data.points,
      userId,
    );
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/heroes/:heroId/kills/:killId/timeline')
  @ApiOperation({
    summary: 'Get kill timeline data',
    description:
      'Get map timeline data with assignments and gaps for a specific kill',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiParam({ name: 'killId', description: 'Kill ID' })
  @ApiResponse({
    status: 200,
    description:
      'Timeline data with map assignments and coverage gaps during spawn window',
  })
  @ApiResponse({ status: 404, description: 'Kill not found' })
  async getKillTimelineData(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Param('killId') killId: string,
  ) {
    return this.EventsService.getKillTimelineData(
      guildId,
      eventId,
      heroId,
      killId,
    );
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/heroes/:heroId/coverage-gaps')
  @ApiOperation({
    summary: 'Get hero coverage gaps',
    description:
      'Get coverage gap history for a specific hero (periods when maps were unassigned or uncovered)',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 200,
    description: 'List of coverage gaps with type, duration, and timestamps',
  })
  async getHeroCoverageGaps(
    @Param('guildId') _guildId: string,
    @Param('eventId') _eventId: string,
    @Param('heroId') heroId: string,
  ) {
    return this.EventsService.getHeroCoverageGaps(heroId);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/maps/:mapId/coverage-gaps')
  @ApiOperation({
    summary: 'Get map coverage gaps',
    description:
      'Get coverage gap history for a specific map (periods when the map was unassigned or uncovered)',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiResponse({
    status: 200,
    description: 'List of coverage gaps with type, duration, and timestamps',
  })
  async getMapCoverageGaps(
    @Param('guildId') _guildId: string,
    @Param('eventId') _eventId: string,
    @Param('mapId') mapId: string,
  ) {
    return this.EventsService.getMapCoverageGaps(mapId);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/maps/:mapId/active-gap')
  @ApiOperation({
    summary: 'Get active coverage gap for map',
    description:
      'Get the currently active (ongoing) coverage gap for a map if any exists',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiResponse({
    status: 200,
    description: 'Active gap or null if no gap is currently active',
  })
  async getActiveGapForMap(
    @Param('guildId') _guildId: string,
    @Param('eventId') _eventId: string,
    @Param('mapId') mapId: string,
  ) {
    return this.EventsService.getActiveGapForMap(mapId);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/heroes/:heroId/active-gaps')
  @ApiOperation({
    summary: 'Get all active coverage gaps for hero',
    description:
      'Get all currently active (ongoing) coverage gaps for all maps of a hero',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 200,
    description: 'Array of active gaps for all maps of the hero',
  })
  async getActiveGapsForHero(
    @Param('guildId') _guildId: string,
    @Param('eventId') _eventId: string,
    @Param('heroId') heroId: string,
  ) {
    return this.EventsService.getActiveGapsForHero(heroId);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/events/:eventId/heroes/:heroId/respawn-config')
  @ApiOperation({
    summary: 'Get hero respawn configuration',
    description:
      'Get current respawn window status and default respawn times for a hero',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 200,
    description:
      'Respawn configuration including active timer status and default times',
  })
  async getHeroRespawnConfig(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
  ) {
    return this.EventsService.getHeroRespawnConfig(guildId, eventId, heroId);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/events/:eventId/heroes/:heroId/close-respawn-window')
  @ApiOperation({
    summary: 'Close hero respawn window',
    description:
      'Manually close a respawn window for a hero. Optionally creates a new window with specified or default times.',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 200,
    description: 'Respawn window closed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - hero has no NPC ID',
  })
  @ApiResponse({ status: 404, description: 'Hero not found' })
  async closeRespawnWindow(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Body() data: CloseRespawnWindowDto,
  ) {
    await this.EventsService.closeRespawnWindow(guildId, eventId, heroId, {
      createNewWindow: data.createNewWindow,
      newMinSpawnTime: data.newMinSpawnTime
        ? new Date(data.newMinSpawnTime)
        : undefined,
      newMaxSpawnTime: data.newMaxSpawnTime
        ? new Date(data.newMaxSpawnTime)
        : undefined,
    });
    return { success: true };
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/events/:eventId/heroes/:heroId/open-respawn-window')
  @ApiOperation({
    summary: 'Open hero respawn window',
    description:
      'Manually open a new respawn window for a hero with specified or default times.',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'heroId', description: 'Hero ID' })
  @ApiResponse({
    status: 200,
    description: 'Respawn window opened successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - hero has no NPC ID',
  })
  @ApiResponse({ status: 404, description: 'Hero not found' })
  async openRespawnWindow(
    @Param('guildId') guildId: string,
    @Param('eventId') eventId: string,
    @Param('heroId') heroId: string,
    @Body() data: OpenRespawnWindowDto,
  ) {
    const result = await this.EventsService.openRespawnWindow(
      guildId,
      eventId,
      heroId,
      {
        minSpawnTime: data.minSpawnTime
          ? new Date(data.minSpawnTime)
          : undefined,
        maxSpawnTime: data.maxSpawnTime
          ? new Date(data.maxSpawnTime)
          : undefined,
      },
    );
    return {
      success: true,
      minSpawnTime: result.minSpawnTime,
      maxSpawnTime: result.maxSpawnTime,
    };
  }
}
