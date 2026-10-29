import { activeEventCondition } from "#src/events/event-scope-query";
import { and, eq } from "drizzle-orm";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { eventHeroNpcTable, eventTable } from "#src/database/drizzle/schema";

export const makeActiveEventHeroStore = (database: ApiDatabaseValue) => ({
  findActiveHeroes(guildId: string, world: string, referenceTime: Date) {
    return database
      .select({ eventHero: eventHeroNpcTable, event: eventTable })
      .from(eventHeroNpcTable)
      .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
      .where(
        and(
          eq(eventTable.guildId, guildId),
          eq(eventTable.world, world),
          activeEventCondition(referenceTime),
        ),
      );
  },
});

export type ActiveEventHeroStore = ReturnType<typeof makeActiveEventHeroStore>;
