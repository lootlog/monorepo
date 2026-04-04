import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Permission, type Role } from "src/generated/prisma/client";
import { AssignMemberDto } from "./dto/assign-member.dto";
import { AssignMapLocationDto } from "./dto/assign-map-location.dto";
import { CreateHeroDto } from "./dto/create-hero.dto";
import { CreateLocationDto } from "./dto/create-location.dto";
import { CreateMapDto } from "./dto/create-map.dto";
import { ReorderLocationsDto } from "./dto/reorder-locations.dto";
import { UpdateHeroDto } from "./dto/update-hero.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { EventsService } from "./events.service";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { GuildMember } from "src/shared/decorators/member.decorator";
import { MemberPermissions } from "src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "src/shared/decorators/member-roles.decorator";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";

@ApiTags("events")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class EventsAssignmentController {
  constructor(private readonly eventsService: EventsService) {}

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/maps/:mapId/assign")
  @ApiOperation({
    summary: "Assign member to map",
    description: "Assign a guild member to monitor a specific map",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "mapId", description: "Map ID" })
  @ApiResponse({
    status: 200,
    description: "Member assigned successfully",
  })
  @ApiResponse({ status: 404, description: "Map not found" })
  async assignMember(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("mapId") mapId: string,
    @Body() data: AssignMemberDto,
  ) {
    return this.eventsService.assignMemberToMap(
      guildData.id,
      eventId,
      mapId,
      data.memberId,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/maps/:mapId/self-assign")
  @ApiOperation({
    summary: "Self-assign to map",
    description: "Assign yourself to monitor a specific map",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "mapId", description: "Map ID" })
  @ApiResponse({
    status: 200,
    description: "Self-assigned successfully",
  })
  @ApiResponse({ status: 404, description: "Map not found" })
  async selfAssignMember(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("mapId") mapId: string,
    @GuildMember() member: { id: number },
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    const map = await this.eventsService.getMapWithHeroAccessCheck(
      guildData.id,
      eventId,
      mapId,
      roles,
      permissions,
    );

    if (!map) {
      throw new ForbiddenException(
        "You cannot assign yourself to this hero due to level restrictions",
      );
    }

    return this.eventsService.assignMemberToMap(
      guildData.id,
      eventId,
      mapId,
      member.id,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_WRITE)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/events/:eventId/maps/:mapId/self-assign")
  @ApiOperation({
    summary: "Self-unassign from map",
    description: "Remove yourself from a specific map",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "mapId", description: "Map ID" })
  @ApiResponse({
    status: 200,
    description: "Self-unassigned successfully",
  })
  @ApiResponse({ status: 404, description: "Map not found" })
  async selfUnassignMember(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("mapId") mapId: string,
    @GuildMember() member: { id: number },
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    const map = await this.eventsService.getMapWithHeroAccessCheck(
      guildData.id,
      eventId,
      mapId,
      roles,
      permissions,
    );

    if (!map) {
      throw new ForbiddenException(
        "You cannot unassign yourself from this hero due to level restrictions",
      );
    }

    return this.eventsService.unassignMemberFromMap(
      guildData.id,
      eventId,
      mapId,
      member.id,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/heroes")
  @ApiOperation({
    summary: "Add hero to event",
    description: "Add a new hero to an existing event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiResponse({
    status: 201,
    description: "Hero added successfully",
  })
  async addHero(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Body() data: CreateHeroDto,
  ) {
    return this.eventsService.createHero(guildData.id, eventId, data);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Patch("/guilds/:guildId/events/:eventId/heroes/:heroId")
  @ApiOperation({
    summary: "Update hero",
    description: "Update an existing hero details",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 200,
    description: "Hero updated successfully",
  })
  async updateHero(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Body() data: UpdateHeroDto,
  ) {
    return this.eventsService.updateHero(guildData.id, eventId, heroId, data);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/events/:eventId/heroes/:heroId")
  @ApiOperation({
    summary: "Delete hero",
    description: "Remove a hero from the event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 200,
    description: "Hero deleted successfully",
  })
  async deleteHero(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
  ) {
    return this.eventsService.deleteHero(guildData.id, eventId, heroId);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/heroes/:heroId/maps")
  @ApiOperation({
    summary: "Add map to hero",
    description: "Add a new map to an existing hero",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 201,
    description: "Map added successfully",
  })
  async addMap(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Body() data: CreateMapDto,
  ) {
    return this.eventsService.addMap(guildData.id, eventId, heroId, data);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/events/:eventId/heroes/:heroId/maps/:mapId")
  @ApiOperation({
    summary: "Delete map",
    description: "Remove a map from a hero",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiParam({ name: "mapId", description: "Map ID" })
  @ApiResponse({
    status: 200,
    description: "Map deleted successfully",
  })
  async deleteMap(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Param("mapId") mapId: string,
  ) {
    return this.eventsService.deleteMap(guildData.id, eventId, heroId, mapId);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/heroes/:heroId/locations")
  @ApiOperation({
    summary: "Get hero locations",
    description: "Get all locations for a hero with their maps",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 200,
    description: "List of locations with maps",
  })
  async getLocations(
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
    return this.eventsService.getLocations(guildData.id, eventId, heroId);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/heroes/:heroId/locations")
  @ApiOperation({
    summary: "Create location",
    description: "Create a new location for grouping maps",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 201,
    description: "Location created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Location with this name already exists",
  })
  async createLocation(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Body() data: CreateLocationDto,
  ) {
    return this.eventsService.createLocation(
      guildData.id,
      eventId,
      heroId,
      data,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Patch(
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations/:locationId",
  )
  @ApiOperation({
    summary: "Update location",
    description: "Update a location name",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiParam({ name: "locationId", description: "Location ID" })
  @ApiResponse({
    status: 200,
    description: "Location updated successfully",
  })
  @ApiResponse({ status: 404, description: "Location not found" })
  async updateLocation(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Param("locationId") locationId: string,
    @Body() data: UpdateLocationDto,
  ) {
    return this.eventsService.updateLocation(
      guildData.id,
      eventId,
      heroId,
      locationId,
      data,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete(
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations/:locationId",
  )
  @ApiOperation({
    summary: "Delete location",
    description:
      "Delete a location. Maps in this location will become ungrouped.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiParam({ name: "locationId", description: "Location ID" })
  @ApiResponse({
    status: 200,
    description: "Location deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Location not found" })
  async deleteLocation(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Param("locationId") locationId: string,
  ) {
    return this.eventsService.deleteLocation(
      guildData.id,
      eventId,
      heroId,
      locationId,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/heroes/:heroId/locations/reorder")
  @ApiOperation({
    summary: "Reorder locations",
    description: "Change the order of locations",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiResponse({
    status: 200,
    description: "Locations reordered successfully",
  })
  async reorderLocations(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Body() data: ReorderLocationsDto,
  ) {
    return this.eventsService.reorderLocations(
      guildData.id,
      eventId,
      heroId,
      data,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Patch("/guilds/:guildId/events/:eventId/heroes/:heroId/maps/:mapId/location")
  @ApiOperation({
    summary: "Assign map to location",
    description:
      "Assign a map to a location or remove it from a location (set to null)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiParam({ name: "mapId", description: "Map ID" })
  @ApiResponse({
    status: 200,
    description: "Map location updated successfully",
  })
  @ApiResponse({ status: 404, description: "Map or location not found" })
  async assignMapToLocation(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Param("mapId") mapId: string,
    @Body() data: AssignMapLocationDto,
  ) {
    return this.eventsService.assignMapToLocation(
      guildData.id,
      eventId,
      heroId,
      mapId,
      data.locationId ?? null,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/events/:eventId/maps/:mapId/assign")
  @ApiOperation({
    summary: "Unassign member from map",
    description:
      "Remove an assigned member from a map. If memberId is provided, removes specific member; otherwise removes all.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "mapId", description: "Map ID" })
  @ApiQuery({
    name: "memberId",
    description: "Optional member ID to unassign",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Member unassigned successfully",
  })
  @ApiResponse({ status: 404, description: "Map not found" })
  async unassignMember(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("mapId") mapId: string,
    @Query("memberId") memberId?: string,
  ) {
    return this.eventsService.unassignMemberFromMap(
      guildData.id,
      eventId,
      mapId,
      memberId ? parseInt(memberId, 10) : undefined,
    );
  }
}
