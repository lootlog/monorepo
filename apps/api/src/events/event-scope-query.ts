import type { ApiDatabaseValue } from "#src/database/drizzle/database";
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

export const queryEventHero = (
  database: ApiDatabaseValue,
  guildId: string,
  eventId: string,
  heroId: string,
) =>
  database
    .select({ hero: eventHeroNpcTable, event: eventTable })
    .from(eventHeroNpcTable)
    .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
    .where(
      and(
        eq(eventHeroNpcTable.id, heroId),
        eq(eventTable.id, eventId),
        eq(eventTable.guildId, guildId),
      ),
    )
    .limit(1);
