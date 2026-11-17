import { Effect } from "effect";
import type { EventDataOperations } from "#src/events/events.data-layer";
import { eventRequirements } from "./events-authorization.js";
import {
  stringParameter,
  type EventEndpointBuilders,
  type EventEndpointHandlers,
} from "./events-endpoint.js";

const { read, write, manage } = eventRequirements;

export const eventAssignmentHandlers = (
  { event }: EventEndpointBuilders,
  operations: Pick<EventDataOperations, "assignment">,
) =>
  ({
    EventsAssignmentControllerAssignMember: ({ params, payload }) =>
      event(
        "EventsAssignmentControllerAssignMember",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
            operations.assignment.assignMember(
              caller.guild,
              eventId,
              mapId,
              payload,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerUnassignMember: ({ params, query }) =>
      event(
        "EventsAssignmentControllerUnassignMember",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
            operations.assignment.unassignMember(
              caller.guild,
              eventId,
              mapId,
              query.memberId,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerSelfAssignMember: ({ params }) =>
      event(
        "EventsAssignmentControllerSelfAssignMember",
        write,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
            operations.assignment.selfAssignMember(
              caller.guild,
              eventId,
              mapId,
              caller.member,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerSelfUnassignMember: ({ params }) =>
      event(
        "EventsAssignmentControllerSelfUnassignMember",
        write,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
            operations.assignment.selfUnassignMember(
              caller.guild,
              eventId,
              mapId,
              caller.member,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerAddHero: ({ params, payload }) =>
      event(
        "EventsAssignmentControllerAddHero",
        manage,
        params,
        (caller, eventId) =>
          operations.assignment
            .addHero(caller.guild, eventId, payload)
            .pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerDeleteHero: ({ params }) =>
      event(
        "EventsAssignmentControllerDeleteHero",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.assignment.deleteHero(
              caller.guild,
              eventId,
              heroId,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerUpdateHero: ({ params, payload }) =>
      event(
        "EventsAssignmentControllerUpdateHero",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.assignment.updateHero(
              caller.guild,
              eventId,
              heroId,
              payload,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerAddMap: ({ params, payload }) =>
      event(
        "EventsAssignmentControllerAddMap",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.assignment.addMap(
              caller.guild,
              eventId,
              heroId,
              payload,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ),
      ),
    EventsAssignmentControllerDeleteMap: ({ params }) =>
      event(
        "EventsAssignmentControllerDeleteMap",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
              operations.assignment.deleteMap(
                caller.guild,
                eventId,
                heroId,
                mapId,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerGetLocations: ({ params }) =>
      event(
        "EventsAssignmentControllerGetLocations",
        read,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.assignment.getLocations(
              caller.guild,
              eventId,
              heroId,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerCreateLocation: ({ params, payload }) =>
      event(
        "EventsAssignmentControllerCreateLocation",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.assignment.createLocation(
              caller.guild,
              eventId,
              heroId,
              payload,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerDeleteLocation: ({ params }) =>
      event(
        "EventsAssignmentControllerDeleteLocation",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            Effect.flatMap(
              stringParameter(params.locationId, "locationId"),
              (locationId) =>
                operations.assignment.deleteLocation(
                  caller.guild,
                  eventId,
                  heroId,
                  locationId,
                  [...caller.roles],
                  caller.accessPolicy,
                ),
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerUpdateLocation: ({ params, payload }) =>
      event(
        "EventsAssignmentControllerUpdateLocation",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            Effect.flatMap(
              stringParameter(params.locationId, "locationId"),
              (locationId) =>
                operations.assignment.updateLocation(
                  caller.guild,
                  eventId,
                  heroId,
                  locationId,
                  payload,
                  [...caller.roles],
                  caller.accessPolicy,
                ),
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerReorderLocations: ({ params, payload }) =>
      event(
        "EventsAssignmentControllerReorderLocations",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.assignment.reorderLocations(
              caller.guild,
              eventId,
              heroId,
              payload,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsAssignmentControllerAssignMapToLocation: ({ params, payload }) =>
      event(
        "EventsAssignmentControllerAssignMapToLocation",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
              operations.assignment.assignMapToLocation(
                caller.guild,
                eventId,
                heroId,
                mapId,
                payload,
                [...caller.roles],
                caller.accessPolicy,
              ),
            ),
          ).pipe(Effect.asVoid),
      ),
  }) satisfies EventEndpointHandlers;
