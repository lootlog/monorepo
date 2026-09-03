import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { eventHeroNpcTable, eventTable } from "#src/database/drizzle/schema";

export const makeEventRespawnStore = (database: ApiDatabaseValue) => ({
  findHero(guildId: string, eventId: string, heroId: string) {
    return database
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
      .limit(1)
      .pipe(
        Effect.map((rows) => {
          const row = rows[0];
          return row ? { ...row.hero, event: row.event } : null;
        }),
        Effect.withSpan("events.respawn.findHero", {
          attributes: { adapter: "events.respawn.drizzle", retryCount: 0 },
        }),
      );
  },
});

export type EventRespawnStore = ReturnType<typeof makeEventRespawnStore>;
