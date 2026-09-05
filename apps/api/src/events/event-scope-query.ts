import { and, eq } from "drizzle-orm";
import {
  eventHeroNpcTable,
  eventMapTable,
  eventTable,
} from "#src/database/drizzle/schema";

export const eventHeroScope = (
  guildId: string,
  eventId: string,
  heroId: string,
) =>
  and(
    eq(eventHeroNpcTable.id, heroId),
    eq(eventHeroNpcTable.eventId, eventId),
    eq(eventTable.guildId, guildId),
  );
export const eventMapScope = (
  guildId: string,
  eventId: string,
  mapId: string,
) =>
  and(
    eq(eventMapTable.id, mapId),
    eq(eventTable.id, eventId),
    eq(eventTable.guildId, guildId),
  );
