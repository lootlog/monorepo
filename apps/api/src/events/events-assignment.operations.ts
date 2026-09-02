import type { AccessPolicy } from "@lootlog/domain/access-policy";
import type { roleTable } from "#src/database/drizzle/schema";
type Role = typeof roleTable.$inferSelect;
import {
  AssignMapLocationDto,
  AssignMemberDto,
  CreateHeroDto,
  CreateLocationDto,
  CreateMapDto,
  ReorderLocationsDto,
  UpdateHeroDto,
  UpdateLocationDto,
} from "#src/http-api/lootlog-api";
import { Effect } from "effect";
import type { EventAccess } from "./event-access.js";
import type { EventCatalogMutations } from "./event-catalog-mutations.js";
import type { EventMapAssignments } from "./event-map-assignments.js";

export const makeEventsAssignment = (
  eventAccess: EventAccess,
  catalogMutations: EventCatalogMutations,
  mapAssignments: EventMapAssignments,
) => ({
  assignMember(
    guildData: { id: string },
    eventId: string,
    mapId: string,
    data: AssignMemberDto,
  ) {
    return mapAssignments.assignMember(
      guildData,
      eventId,
      mapId,
      data.memberId,
    );
  },

  selfAssignMember(
    guildData: { id: string },
    eventId: string,
    mapId: string,
    member: { id: number },
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return Effect.gen(function* () {
      yield* eventAccess.getMap(
        guildData.id,
        eventId,
        mapId,
        roles,
        accessPolicy,
      );
      return yield* mapAssignments.assignMember(
        guildData,
        eventId,
        mapId,
        member.id,
      );
    }).pipe(Effect.withSpan("EventsAssignment.selfAssignMember"));
  },

  selfUnassignMember(
    guildData: { id: string },
    eventId: string,
    mapId: string,
    member: { id: number },
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return Effect.gen(function* () {
      yield* eventAccess.getMap(
        guildData.id,
        eventId,
        mapId,
        roles,
        accessPolicy,
      );
      return yield* mapAssignments.unassignMember(
        guildData,
        eventId,
        mapId,
        member.id,
      );
    }).pipe(Effect.withSpan("EventsAssignment.selfUnassignMember"));
  },

  addHero(guildData: { id: string }, eventId: string, data: CreateHeroDto) {
    return catalogMutations.addHero(guildData, eventId, data);
  },

  updateHero(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: UpdateHeroDto,
  ) {
    return catalogMutations.updateHero(guildData, eventId, heroId, data);
  },

  deleteHero(guildData: { id: string }, eventId: string, heroId: string) {
    return catalogMutations.deleteHero(guildData, eventId, heroId);
  },

  addMap(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: CreateMapDto,
  ) {
    return catalogMutations.addMap(guildData, eventId, heroId, data);
  },

  deleteMap(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    mapId: string,
  ) {
    return catalogMutations.deleteMap(guildData, eventId, heroId, mapId);
  },

  getLocations(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return Effect.gen(function* () {
      yield* eventAccess.getHero(
        guildData.id,
        eventId,
        heroId,
        roles,
        accessPolicy,
      );
      return yield* catalogMutations.getLocations(guildData, eventId, heroId);
    }).pipe(Effect.withSpan("EventsAssignment.getLocations"));
  },

  createLocation(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: CreateLocationDto,
  ) {
    return catalogMutations.createLocation(guildData, eventId, heroId, data);
  },

  updateLocation(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    locationId: string,
    data: UpdateLocationDto,
  ) {
    return catalogMutations.updateLocation(
      guildData,
      eventId,
      heroId,
      locationId,
      data,
    );
  },

  deleteLocation(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    locationId: string,
  ) {
    return catalogMutations.deleteLocation(
      guildData,
      eventId,
      heroId,
      locationId,
    );
  },

  reorderLocations(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: ReorderLocationsDto,
  ) {
    return catalogMutations.reorderLocations(guildData, eventId, heroId, data);
  },

  assignMapToLocation(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    mapId: string,
    data: AssignMapLocationDto,
  ) {
    return catalogMutations.assignMapToLocation(
      guildData,
      eventId,
      heroId,
      mapId,
      data,
    );
  },

  unassignMember(
    guildData: { id: string },
    eventId: string,
    mapId: string,
    memberId?: string,
  ) {
    return mapAssignments.unassignMember(
      guildData,
      eventId,
      mapId,
      memberId ? Number.parseInt(memberId, 10) : undefined,
    );
  },
});

export type EventsAssignment = ReturnType<typeof makeEventsAssignment>;
