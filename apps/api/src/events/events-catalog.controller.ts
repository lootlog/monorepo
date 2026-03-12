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
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Permission, type Role } from "generated/client";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
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
export class EventsCatalogController {
  constructor(private readonly eventsService: EventsService) {}

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events")
  @ApiOperation({
    summary: "Create event",
    description: "Create a new guild event with maps and hero NPCs",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiResponse({
    status: 201,
    description: "Event created successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async createEvent(
    @Body() data: CreateEventDto,
    @GuildData() guildData: { id: string },
  ) {
    return this.eventsService.createEvent(guildData.id, data);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events")
  @ApiOperation({
    summary: "List guild events",
    description: "Get all events for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiQuery({
    name: "world",
    description: "World name filter",
    required: false,
  })
  @ApiQuery({
    name: "activeOnly",
    description: "Only return active events",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "List of events",
  })
  async getEvents(
    @GuildData() guildData: { id: string },
    @Query("world") world?: string,
    @Query("activeOnly") activeOnly?: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    const events = await this.eventsService.getEvents(
      guildData.id,
      world,
      activeOnly !== "false",
    );

    return this.eventsService.filterEventsHeroesByLevel(
      events,
      roles,
      permissions,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId")
  @ApiOperation({
    summary: "Get event details",
    description: "Get detailed information about a specific event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiResponse({
    status: 200,
    description: "Event details",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEvent(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    const event = await this.eventsService.getEvent(guildData.id, eventId);
    return this.eventsService.filterEventHeroesByLevel(
      event,
      roles,
      permissions,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/overview")
  @ApiOperation({
    summary: "Get event overview",
    description:
      "Get lightweight event overview for read-only views (without maps and rankings)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiResponse({
    status: 200,
    description: "Event overview",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEventOverview(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    const event = await this.eventsService.getEventOverview(
      guildData.id,
      eventId,
    );

    return this.eventsService.filterEventHeroesByLevel(
      event,
      roles,
      permissions,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/maps")
  @ApiOperation({
    summary: "Get event maps",
    description:
      "Get map assignments grouped by hero for a specific event (read model for realtime map updates)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiResponse({
    status: 200,
    description: "Event maps data",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEventMaps(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    const event = await this.eventsService.getEventMaps(guildData.id, eventId);
    return this.eventsService.filterEventHeroesByLevel(
      event,
      roles,
      permissions,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Patch("/guilds/:guildId/events/:eventId")
  @ApiOperation({
    summary: "Update event",
    description: "Update an existing event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiResponse({
    status: 200,
    description: "Event updated successfully",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async updateEvent(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Body() data: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(guildData.id, eventId, data);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/recalculate-points")
  @ApiOperation({
    summary: "Recalculate event points",
    description:
      "Manually recalculate all event kill points with current rules",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiResponse({
    status: 200,
    description: "Points recalculated successfully",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async recalculatePoints(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
  ) {
    return this.eventsService.recalculateEventPointsForEvent(
      guildData.id,
      eventId,
    );
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/events/:eventId")
  @ApiOperation({
    summary: "Delete event",
    description: "Delete an event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiResponse({
    status: 200,
    description: "Event deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async deleteEvent(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
  ) {
    return this.eventsService.deleteEvent(guildData.id, eventId);
  }
}
