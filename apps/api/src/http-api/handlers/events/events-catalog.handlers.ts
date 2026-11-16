import {
  EventMutationResponse,
  EventOverviewResponse,
  EventsListResponse,
} from "#src/events/catalog/event-response.schema";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { Effect } from "effect";
import type { EventDataOperations } from "./events.data-layer.js";
import { eventRequirements } from "./events-authorization.js";
import type {
  EventEndpointBuilders,
  EventEndpointHandlers,
} from "./events-endpoint.js";

const { read, manage, administer } = eventRequirements;

export const eventCatalogHandlers = (
  { authorized, event }: EventEndpointBuilders,
  operations: Pick<EventDataOperations, "catalog">,
) =>
  ({
    listEvents: ({ params, query }) =>
      authorized("listEvents", read, params.guildId, (caller) =>
        operations.catalog
          .getEvents(
            caller.guild,
            caller.accessPolicy,
            query.world,
            query.activeOnly,
            [...caller.roles],
          )
          .pipe(
            Effect.map((value) =>
              encodeUnknownResponse(EventsListResponse, value),
            ),
          ),
      ),
    createEvent: ({ params, payload }) =>
      authorized("createEvent", manage, params.guildId, (caller) =>
        operations.catalog
          .createEvent(payload, caller.guild)
          .pipe(
            Effect.map((value) =>
              encodeUnknownResponse(EventMutationResponse, value),
            ),
          ),
      ),
    showEvent: ({ params }) =>
      event("showEvent", read, params, (caller, eventId) =>
        operations.catalog
          .getEvent(
            caller.guild,
            eventId,
            [...caller.roles],
            caller.accessPolicy,
          )
          .pipe(
            Effect.map((value) =>
              encodeUnknownResponse(EventOverviewResponse, value),
            ),
          ),
      ),
    deleteEvent: ({ params }) =>
      event("deleteEvent", administer, params, (caller, eventId) =>
        operations.catalog.deleteEvent(
          caller.guild,
          eventId,
          [...caller.roles],
          caller.accessPolicy,
        ),
      ),
    updateEvent: ({ params, payload }) =>
      event("updateEvent", manage, params, (caller, eventId) =>
        operations.catalog
          .updateEvent(
            caller.guild,
            eventId,
            payload,
            [...caller.roles],
            caller.accessPolicy,
          )
          .pipe(
            Effect.map((value) =>
              encodeUnknownResponse(EventMutationResponse, value),
            ),
          ),
      ),
    showEventWrapped: ({ params }) =>
      event("showEventWrapped", read, params, (caller, eventId) =>
        operations.catalog.getWrapped(
          caller.guild,
          eventId,
          [...caller.roles],
          caller.accessPolicy,
        ),
      ),
    listEventMaps: ({ params }) =>
      event("listEventMaps", read, params, (caller, eventId) =>
        operations.catalog.getEventMaps(
          caller.guild,
          eventId,
          [...caller.roles],
          caller.accessPolicy,
        ),
      ),
    recalculateEventPoints: ({ params }) =>
      event("recalculateEventPoints", manage, params, (caller, eventId) =>
        operations.catalog.recalculatePoints(caller.guild, eventId),
      ),
  }) satisfies EventEndpointHandlers;
