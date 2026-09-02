import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { ForbiddenException } from "#src/shared/http/http-errors";

import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
type Role = typeof roleTable.$inferSelect;
import { AssignMemberDto } from "./dto/assign-member.dto.js";
import { AssignMapLocationDto } from "./dto/assign-map-location.dto.js";
import { CreateHeroDto } from "./dto/create-hero.dto.js";
import { CreateLocationDto } from "./dto/create-location.dto.js";
import { CreateMapDto } from "./dto/create-map.dto.js";
import { EventMapResponseDto } from "./dto/event-response.dto.js";
import { ReorderLocationsDto } from "./dto/reorder-locations.dto.js";
import { UpdateHeroDto } from "./dto/update-hero.dto.js";
import { UpdateLocationDto } from "./dto/update-location.dto.js";
import { EventsService } from "./events.service.js";

export class EventsAssignmentController {
  constructor(private readonly eventsService: EventsService) {}

  assignMember(
    guildData: { id: string },
    eventId: string,
    mapId: string,
    data: AssignMemberDto,
  ) {
    return this.eventsService.assignMemberToMap(
      guildData.id,
      eventId,
      mapId,
      data.memberId,
    );
  }

  async selfAssignMember(
    guildData: { id: string },
    eventId: string,
    mapId: string,
    member: { id: number },
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    const map = await this.eventsService.getMapWithHeroAccessCheck(
      guildData.id,
      eventId,
      mapId,
      roles,
      accessPolicy,
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

  async selfUnassignMember(
    guildData: { id: string },
    eventId: string,
    mapId: string,
    member: { id: number },
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    const map = await this.eventsService.getMapWithHeroAccessCheck(
      guildData.id,
      eventId,
      mapId,
      roles,
      accessPolicy,
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

  addHero(guildData: { id: string }, eventId: string, data: CreateHeroDto) {
    return this.eventsService.createHero(guildData.id, eventId, data);
  }

  updateHero(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: UpdateHeroDto,
  ) {
    return this.eventsService.updateHero(guildData.id, eventId, heroId, data);
  }

  deleteHero(guildData: { id: string }, eventId: string, heroId: string) {
    return this.eventsService.deleteHero(guildData.id, eventId, heroId);
  }

  addMap(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: CreateMapDto,
  ) {
    return this.eventsService.addMap(guildData.id, eventId, heroId, data);
  }

  deleteMap(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    mapId: string,
  ) {
    return this.eventsService.deleteMap(guildData.id, eventId, heroId, mapId);
  }

  async getLocations(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    await this.eventsService.getHeroWithAccessCheck(
      guildData.id,
      eventId,
      heroId,
      roles,
      accessPolicy,
    );
    return this.eventsService.getLocations(guildData.id, eventId, heroId);
  }

  createLocation(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: CreateLocationDto,
  ) {
    return this.eventsService.createLocation(
      guildData.id,
      eventId,
      heroId,
      data,
    );
  }

  updateLocation(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    locationId: string,
    data: UpdateLocationDto,
  ) {
    return this.eventsService.updateLocation(
      guildData.id,
      eventId,
      heroId,
      locationId,
      data,
    );
  }

  deleteLocation(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    locationId: string,
  ) {
    return this.eventsService.deleteLocation(
      guildData.id,
      eventId,
      heroId,
      locationId,
    );
  }

  reorderLocations(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: ReorderLocationsDto,
  ) {
    return this.eventsService.reorderLocations(
      guildData.id,
      eventId,
      heroId,
      data,
    );
  }

  assignMapToLocation(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    mapId: string,
    data: AssignMapLocationDto,
  ) {
    return this.eventsService.assignMapToLocation(
      guildData.id,
      eventId,
      heroId,
      mapId,
      data.locationId ?? null,
    );
  }

  unassignMember(
    guildData: { id: string },
    eventId: string,
    mapId: string,
    memberId?: string,
  ) {
    return this.eventsService.unassignMemberFromMap(
      guildData.id,
      eventId,
      mapId,
      memberId ? Number.parseInt(memberId, 10) : undefined,
    );
  }
}
