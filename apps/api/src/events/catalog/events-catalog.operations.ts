import {
  getEffectiveCapabilities,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import type { EventWrapped } from "#src/events/wrapped/event-wrapped.service";
import type { EventsCatalogRead } from "#src/events/catalog/events-catalog-read";
import type { EventCreation } from "#src/events/catalog/event-creation";
import type { EventDeletion } from "#src/events/catalog/event-deletion";
import type { EventPointRecalculation } from "#src/events/kills/event-point-recalculation";
import type { EventUpdate } from "#src/events/catalog/event-update";

type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;

export const makeEventsCatalog = (wrapped: EventWrapped) => ({
  getWrapped: (
    guildData: Guild,
    eventId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) => {
    const permissions = getEffectiveCapabilities(accessPolicy);
    return wrapped.getWrapped(guildData, eventId, permissions, roles);
  },
});

type LegacyEventsCatalog = ReturnType<typeof makeEventsCatalog>;
export type EventsCatalog = Omit<
  LegacyEventsCatalog,
  | "createEvent"
  | "deleteEvent"
  | "getEvent"
  | "getEventMaps"
  | "getEventOverview"
  | "getEvents"
  | "recalculatePoints"
  | "updateEvent"
> &
  EventsCatalogRead & {
    readonly createEvent: EventCreation;
    readonly deleteEvent: EventDeletion;
    readonly recalculatePoints: EventPointRecalculation;
    readonly updateEvent: EventUpdate;
  };
