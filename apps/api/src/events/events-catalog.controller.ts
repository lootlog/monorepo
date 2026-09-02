import type { AccessPolicy } from "@lootlog/domain/access-policy";

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

export class EventsCatalogController {
  constructor(private readonly eventsService: EventsService) {}

  createEvent(data: CreateEventDto, guildData: { id: string }) {
    return this.eventsService.createEvent(guildData.id, data);
  }

  async getEvents(
    guildData: { id: string },
    accessPolicy: AccessPolicy,
    world?: string,
    activeOnly?: string,
    roles: Role[] = [],
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

  async getEvent(
    guildData: { id: string },
    eventId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    const event = await this.eventsService.getEvent(guildData.id, eventId);
    return this.eventsService.filterEventHeroesByLevel(
      event,
      roles,
      accessPolicy,
    );
  }

  async getEventOverview(
    guildData: { id: string },
    eventId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
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

  getWrapped(
    guildData: Guild,
    eventId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return this.eventsService.getWrapped(
      guildData,
      eventId,
      accessPolicy,
      roles,
    );
  }

  async getEventMaps(
    guildData: { id: string },
    eventId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    const event = await this.eventsService.getEventMaps(guildData.id, eventId);
    return this.eventsService.filterEventHeroesByLevel(
      event,
      roles,
      accessPolicy,
    );
  }

  updateEvent(
    guildData: { id: string },
    eventId: string,
    data: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(guildData.id, eventId, data);
  }

  recalculatePoints(guildData: { id: string }, eventId: string) {
    return this.eventsService.recalculateEventPointsForEvent(
      guildData.id,
      eventId,
    );
  }

  deleteEvent(guildData: { id: string }, eventId: string) {
    return this.eventsService.deleteEvent(guildData.id, eventId);
  }
}
