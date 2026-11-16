import { PinnedEventResponse } from "#src/events/pins/pinned-event-response.schema";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { Effect } from "effect";
import type { EventDataOperations } from "./events.data-layer.js";
import { eventRequirements } from "./events-authorization.js";
import type {
  EventEndpointBuilders,
  EventEndpointHandlers,
} from "./events-endpoint.js";

const { read } = eventRequirements;

export const eventPinHandlers = (
  { authorized, event }: EventEndpointBuilders,
  operations: Pick<EventDataOperations, "pins">,
) =>
  ({
    listPinnedEvents: ({ params }) =>
      authorized("listPinnedEvents", read, params.guildId, (caller) =>
        operations.pins
          .listPinnedEvents(caller.userId, caller.guild)
          .pipe(
            Effect.map((values) =>
              values.map((value) =>
                encodeUnknownResponse(PinnedEventResponse, value),
              ),
            ),
          ),
      ),
    pinEvent: ({ params }) =>
      event("pinEvent", read, params, (caller, eventId) =>
        operations.pins
          .pinEvent(caller.userId, caller.guild, eventId)
          .pipe(
            Effect.map((value) =>
              encodeUnknownResponse(PinnedEventResponse, value),
            ),
          ),
      ),
    unpinEvent: ({ params }) =>
      event("unpinEvent", read, params, (caller, eventId) =>
        operations.pins
          .unpinEvent(caller.userId, caller.guild, eventId)
          .pipe(Effect.asVoid),
      ),
  }) satisfies EventEndpointHandlers;
