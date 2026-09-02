import {
  getEffectiveCapabilities,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import type { EventWrapped } from "./services/event-wrapped.service.js";
import type { EventsCatalogRead } from "./events-catalog-read.js";
import type { EventCreation } from "./event-creation.js";
import type { EventDeletion } from "./event-deletion.js";
import type { EventPointRecalculation } from "./event-point-recalculation.js";
import type { EventUpdate } from "./event-update.js";

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
