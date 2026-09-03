import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { eventHeroNpcTable, eventTable } from "#src/database/drizzle/schema";

export const makeActiveEventHeroStore = (database: ApiDatabaseValue) => ({
  findMatches(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
    referenceTime: Date,
  ) {
    return database
      .select({ eventHero: eventHeroNpcTable, event: eventTable })
      .from(eventHeroNpcTable)
      .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
      .where(
        and(
          eq(eventTable.guildId, guildId),
          eq(eventTable.world, world),
          or(
            eq(eventHeroNpcTable.npcId, npcId),
            eq(eventHeroNpcTable.npcName, npcName),
          ),
          or(
            isNull(eventTable.startsAt),
            lte(eventTable.startsAt, referenceTime),
          ),
          or(isNull(eventTable.endsAt), gt(eventTable.endsAt, referenceTime)),
        ),
      );
  },
});

export type ActiveEventHeroStore = ReturnType<typeof makeActiveEventHeroStore>;
