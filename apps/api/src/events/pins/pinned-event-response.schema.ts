import { Schema } from "effect";
import { isoDatetimeCodec } from "#src/shared/schema/response-codecs";
import { EventListItemResponse } from "#src/events/catalog/event-response.schema";

export const PinnedEventResponse = Schema.Struct({
  pinnedAt: isoDatetimeCodec,
  event: EventListItemResponse,
});
