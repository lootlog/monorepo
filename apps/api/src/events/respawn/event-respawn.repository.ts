import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { queryEventHero } from "#src/events/event-scope-query";

export const makeEventRespawnStore = (database: ApiDatabaseValue) => ({
  findHero(guildId: string, eventId: string, heroId: string) {
    return queryEventHero(database, guildId, eventId, heroId).pipe(
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
