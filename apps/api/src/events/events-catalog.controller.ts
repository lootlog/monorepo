import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { Permission } from "@lootlog/schema/permissions";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;
import { CreateEventDto } from "./dto/create-event.dto.js";
import {
  EventListItemResponseDto,
  EventMapsResponseDto,
  EventMutationResponseDto,
  EventOverviewResponseDto,
  SuccessResponseDto,
} from "./dto/event-response.dto.js";
import { EventWrappedApiResponseDto } from "./dto/event-wrapped-response.dto.js";
import { UpdateEventDto } from "./dto/update-event.dto.js";
import { EventsService } from "./events.service.js";
import { GuildData } from "#src/shared/decorators/guild-data.decorator";
import { MemberAccessPolicy } from "#src/shared/decorators/member-access-policy.decorator";
import { MemberRoles } from "#src/shared/decorators/member-roles.decorator";
import { AuthGuard, RequiresCapabilities } from "@lootlog/nest-shared";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";

@ApiTags("events")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class EventsCatalogController {
  constructor(private readonly eventsService: EventsService) {}

  @RequiresCapabilities(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events")
  @ApiOperation({
    operationId: "createEvent",
    summary: "Create event",
    description: "Create a new guild event with maps and hero NPCs",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ZodResponse({
    status: 201,
    description: "Event created successfully",
    type: EventMutationResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  createEvent(
    @Body() data: CreateEventDto,
    @GuildData() guildData: { id: string },
  ) {
    return this.eventsService.createEvent(guildData.id, data);
  }

  @RequiresCapabilities(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events")
  @ApiOperation({
    operationId: "listEvents",
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
    description: "Only return events active at request time",
    required: false,
  })
  @ZodResponse({
    status: 200,
    description: "List of events",
    type: [EventListItemResponseDto],
  })
  async getEvents(
    @GuildData() guildData: { id: string },
    @MemberAccessPolicy() accessPolicy: AccessPolicy,
    @Query("world") world?: string,
    @Query("activeOnly") activeOnly?: string,
    @MemberRoles() roles: Role[] = [],
  ) {
    const events = await this.eventsService.getEvents(
      guildData.id,
      world,
      activeOnly !== "false",
    );

    return this.eventsService.filterEventsHeroesByLevel(
      events,
      roles,
      accessPolicy,
    );
  }

  @RequiresCapabilities(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId")
  @ApiOperation({
    operationId: "showEvent",
    summary: "Get event details",
    description: "Get detailed information about a specific event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "Event details",
    type: EventOverviewResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEvent(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberAccessPolicy() accessPolicy: AccessPolicy,
  ) {
    const event = await this.eventsService.getEvent(guildData.id, eventId);
    return this.eventsService.filterEventHeroesByLevel(
      event,
      roles,
      accessPolicy,
    );
  }

  @RequiresCapabilities(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/overview")
  @ApiOperation({
    operationId: "showEventOverview",
    summary: "Get event overview",
    description:
      "Get lightweight event overview for read-only views (without maps and rankings)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "Event overview",
    type: EventOverviewResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEventOverview(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberAccessPolicy() accessPolicy: AccessPolicy,
  ) {
    const event = await this.eventsService.getEventOverview(
      guildData.id,
      eventId,
    );

    return this.eventsService.filterEventHeroesByLevel(
      event,
      roles,
      accessPolicy,
    );
  }

  @RequiresCapabilities(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/wrapped")
  @ApiOperation({
    operationId: "showEventWrapped",
    summary: "Get event wrapped summary",
    description:
      "Get cached event wrapped summary with loot, coverage and member highlights",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "Event wrapped summary",
    type: EventWrappedApiResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  getWrapped(
    @GuildData() guildData: Guild,
    @Param("eventId") eventId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberAccessPolicy() accessPolicy: AccessPolicy,
  ) {
    return this.eventsService.getWrapped(
      guildData,
      eventId,
      accessPolicy,
      roles,
    );
  }

  @RequiresCapabilities(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/maps")
  @ApiOperation({
    operationId: "listEventMaps",
    summary: "Get event maps",
    description:
      "Get map assignments grouped by hero for a specific event (read model for realtime map updates)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "Event maps data",
    type: EventMapsResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEventMaps(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberAccessPolicy() accessPolicy: AccessPolicy,
  ) {
    const event = await this.eventsService.getEventMaps(guildData.id, eventId);
    return this.eventsService.filterEventHeroesByLevel(
      event,
      roles,
      accessPolicy,
    );
  }

  @RequiresCapabilities(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Patch("/guilds/:guildId/events/:eventId")
  @ApiOperation({
    operationId: "updateEvent",
    summary: "Update event",
    description: "Update an existing event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "Event updated successfully",
    type: EventMutationResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  updateEvent(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Body() data: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(guildData.id, eventId, data);
  }

  @RequiresCapabilities(Permission.LOOTLOG_EVENTS_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/recalculate-points")
  @HttpCode(200)
  @ApiOperation({
    operationId: "recalculateEventPoints",
    summary: "Recalculate event points",
    description:
      "Manually recalculate all event kill points with current rules",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "Points recalculated successfully",
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  recalculatePoints(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
  ) {
    return this.eventsService.recalculateEventPointsForEvent(
      guildData.id,
      eventId,
    );
  }

  @RequiresCapabilities(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/events/:eventId")
  @ApiOperation({
    operationId: "deleteEvent",
    summary: "Delete event",
    description: "Delete an event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "Event deleted successfully",
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  deleteEvent(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
  ) {
    return this.eventsService.deleteEvent(guildData.id, eventId);
  }
}
