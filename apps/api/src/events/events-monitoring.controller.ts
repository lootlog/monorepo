import { db as prismaDb } from "#src/prisma/db";
import type { Contract, FieldOutputTypes } from "../prisma/contract.js";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { CloseRespawnWindowDto } from "./dto/close-respawn-window.dto.js";
import { EventCoordinationResponseDto } from "./dto/event-coordination-response.dto.js";
import { OpenRespawnWindowDto } from "./dto/open-respawn-window.dto.js";
import {
  CoverageGapResponseDto,
  HeroCoverageGapResponseDto,
  HeroPresenceStatsResponseDto,
  HeroRespawnConfigResponseDto,
  KillTimelineMapResponseDto,
  NullableCoverageGapResponseDto,
} from "./dto/event-monitoring-response.dto.js";
import { EventsService } from "./events.service.js";
import { GuildData } from "#src/shared/decorators/guild-data.decorator";
import { MemberPermissions } from "#src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "#src/shared/decorators/member-roles.decorator";
import { AuthGuard } from "@lootlog/nest-shared";
import { Permissions } from "#src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];
type Role = FieldOutputTypes["public"]["Role"];

@ApiTags("events")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class EventsMonitoringController {
  constructor(private readonly eventsService: EventsService) {}

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/coordination")
  @ApiOperation({
    summary: "Get event coordination overview",
    description:
      "Get respawn priorities, map coverage gaps, and recommended actions for an event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "Event coordination overview",
    type: EventCoordinationResponseDto,
  })
  getCoordination(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
  ) {
    return this.eventsService.getCoordination(guildData.id, eventId);
  }

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
  @ZodResponse({
    status: 200,
    description:
      "Timeline data with map assignments and coverage gaps during spawn window",
    type: [KillTimelineMapResponseDto],
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
  @ZodResponse({
    status: 200,
    description: "List of coverage gaps with type, duration, and timestamps",
    type: [HeroCoverageGapResponseDto],
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
  @ZodResponse({
    status: 200,
    description: "List of coverage gaps with type, duration, and timestamps",
    type: [CoverageGapResponseDto],
  })
  getMapCoverageGaps(
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
  @ZodResponse({
    status: 200,
    description: "Active gap or null if no gap is currently active",
    type: NullableCoverageGapResponseDto,
  })
  getActiveGapForMap(
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
  @ZodResponse({
    status: 200,
    description: "Array of active gaps for all maps of the hero",
    type: [CoverageGapResponseDto],
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
  @ZodResponse({
    status: 200,
    description:
      "Presence statistics including total coverage time and per-member breakdown",
    type: HeroPresenceStatsResponseDto,
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
  @ZodResponse({
    status: 200,
    description:
      "Respawn configuration including active timer status and default times",
    type: HeroRespawnConfigResponseDto,
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
  @HttpCode(200)
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
  @HttpCode(200)
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
