import { Schema } from "effect";
import { isoDatetimeCodec } from "#src/shared/schema/response-codecs";
import { EventListItemResponse } from "./event-response.schema.js";

export const PinnedEventResponse = Schema.Struct({
  pinnedAt: isoDatetimeCodec,
  event: EventListItemResponse,
});
