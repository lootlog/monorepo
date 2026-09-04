import { Context, Layer } from "effect";
import type { EventsCatalog } from "#src/events/catalog/events-catalog.operations";
import type { EventsAssignment } from "#src/events/coordination/events-assignment.operations";
import type { EventsMonitoring } from "#src/events/monitoring/events-monitoring.operations";
import type { EventsPins } from "#src/events/pins/events-pins.operations";
import type { EventsRanking } from "#src/events/ranking/events-ranking.operations";

export interface EventDataOperations {
  readonly assignment: EventsAssignment;
  readonly catalog: EventsCatalog;
  readonly monitoring: EventsMonitoring;
  readonly pins: EventsPins;
  readonly ranking: EventsRanking;
}

export class EventOperations extends Context.Service<
  EventOperations,
  EventDataOperations
>()("@lootlog/api/http-api/events/operations") {}

export const eventDataLayer = (operations: EventDataOperations) =>
  Layer.succeed(EventOperations, EventOperations.of(operations));
