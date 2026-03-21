import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Permission, type Role } from "prisma/generated/client";
import { CloseRespawnWindowDto } from "./dto/close-respawn-window.dto";
import { OpenRespawnWindowDto } from "./dto/open-respawn-window.dto";
import { EventsService } from "./events.service";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { MemberPermissions } from "src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "src/shared/decorators/member-roles.decorator";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";

@ApiTags("events")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class EventsMonitoringController {
  constructor(private readonly eventsService: EventsService) {}

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/heroes/:heroId/kills/:killId/timeline")
  @ApiOperation({
    summary: "Get kill timeline data",
    description:
      "Get map timeline data with assignments and gaps for a specific kill",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiParam({ name: "killId", description: "Kill ID" })
  @ApiResponse({
    status: 200,
    description:
      "Timeline data with map assignments and coverage gaps during spawn window",
  })
  @ApiResponse({ status: 404, description: "Kill not found" })
  async getKillTimelineData(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Param("killId") killId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    await this.eventsService.getHeroWithAccessCheck(
      guildData.id,
      eventId,
      heroId,
      roles,
      permissions,
    );

    return this.eventsService.getKillTimelineData(
      guildData.id,
      eventId,
      heroId,
      killId,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/heroes/:heroId/coverage-gaps")
  @ApiOperation({
    summary: "Get hero coverage gaps",
    description:
      "Get coverage gap history for a specific hero (periods when maps were unassigned or uncovered)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 200,
    description: "List of coverage gaps with type, duration, and timestamps",
  })
  async getHeroCoverageGaps(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    await this.eventsService.getHeroWithAccessCheck(
      guildData.id,
      eventId,
      heroId,
      roles,
      permissions,
    );

    return this.eventsService.getHeroCoverageGaps(
      guildData.id,
      eventId,
      heroId,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/maps/:mapId/coverage-gaps")
  @ApiOperation({
    summary: "Get map coverage gaps",
    description:
      "Get coverage gap history for a specific map (periods when the map was unassigned or uncovered)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "mapId", description: "Map ID" })
  @ApiResponse({
    status: 200,
    description: "List of coverage gaps with type, duration, and timestamps",
  })
  async getMapCoverageGaps(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("mapId") mapId: string,
  ) {
    return this.eventsService.getMapCoverageGaps(guildData.id, eventId, mapId);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/maps/:mapId/active-gap")
  @ApiOperation({
    summary: "Get active coverage gap for map",
    description:
      "Get the currently active (ongoing) coverage gap for a map if any exists",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "mapId", description: "Map ID" })
  @ApiResponse({
    status: 200,
    description: "Active gap or null if no gap is currently active",
  })
  async getActiveGapForMap(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("mapId") mapId: string,
  ) {
    return this.eventsService.getActiveGapForMap(guildData.id, eventId, mapId);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/heroes/:heroId/active-gaps")
  @ApiOperation({
    summary: "Get all active coverage gaps for hero",
    description:
      "Get all currently active (ongoing) coverage gaps for all maps of a hero",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 200,
    description: "Array of active gaps for all maps of the hero",
  })
  async getActiveGapsForHero(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    await this.eventsService.getHeroWithAccessCheck(
      guildData.id,
      eventId,
      heroId,
      roles,
      permissions,
    );

    return this.eventsService.getActiveGapsForHero(
      guildData.id,
      eventId,
      heroId,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/heroes/:heroId/presence-stats")
  @ApiOperation({
    summary: "Get presence statistics for hero",
    description:
      "Get aggregated presence statistics for all members assigned to hero maps",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 200,
    description:
      "Presence statistics including total coverage time and per-member breakdown",
  })
  async getHeroPresenceStats(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    await this.eventsService.getHeroWithAccessCheck(
      guildData.id,
      eventId,
      heroId,
      roles,
      permissions,
    );

    return this.eventsService.getHeroPresenceStats(
      guildData.id,
      eventId,
      heroId,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/heroes/:heroId/respawn-config")
  @ApiOperation({
    summary: "Get hero respawn configuration",
    description:
      "Get current respawn window status and default respawn times for a hero",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 200,
    description:
      "Respawn configuration including active timer status and default times",
  })
  async getHeroRespawnConfig(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    await this.eventsService.getHeroWithAccessCheck(
      guildData.id,
      eventId,
      heroId,
      roles,
      permissions,
    );

    return this.eventsService.getHeroRespawnConfig(
      guildData.id,
      eventId,
      heroId,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/heroes/:heroId/close-respawn-window")
  @ApiOperation({
    summary: "Close hero respawn window",
    description:
      "Manually close a respawn window for a hero. Optionally creates a new window with specified or default times.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 200,
    description: "Respawn window closed successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - hero has no NPC ID",
  })
  @ApiResponse({ status: 404, description: "Hero not found" })
  async closeRespawnWindow(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Body() data: CloseRespawnWindowDto,
  ) {
    await this.eventsService.closeRespawnWindow(guildData.id, eventId, heroId, {
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

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/heroes/:heroId/open-respawn-window")
  @ApiOperation({
    summary: "Open hero respawn window",
    description:
      "Manually open a new respawn window for a hero with specified or default times.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 200,
    description: "Respawn window opened successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - hero has no NPC ID",
  })
  @ApiResponse({ status: 404, description: "Hero not found" })
  async openRespawnWindow(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Body() data: OpenRespawnWindowDto,
  ) {
    const result = await this.eventsService.openRespawnWindow(
      guildData.id,
      eventId,
      heroId,
      {
        minSpawnTime: new Date(data.minSpawnTime),
        maxSpawnTime: new Date(data.maxSpawnTime),
      },
    );

    return {
      success: true,
      minSpawnTime: result.minSpawnTime,
      maxSpawnTime: result.maxSpawnTime,
    };
  }
}
