import { IsoDateTime } from "@lootlog/schema/primitives";
import { Schema } from "effect";
import { EventListItemResponse } from "#src/events/catalog/event-response.schema";

export const PinnedEventResponse = Schema.Struct({
  pinnedAt: IsoDateTime,
  event: EventListItemResponse,
});
