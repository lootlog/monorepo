import { eq } from "drizzle-orm";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventKillPointTable,
  eventHeroKillTable,
  eventHeroNpcTable,
} from "#src/database/drizzle/schema";

export const selectEventKillPoints = (
  database: Pick<typeof ApiDatabase.Service, "select">,
) =>
  database
    .select({
      point: eventKillPointTable,
      kill: eventHeroKillTable,
      hero: eventHeroNpcTable,
    })
    .from(eventKillPointTable)
    .innerJoin(
      eventHeroKillTable,
      eq(eventHeroKillTable.id, eventKillPointTable.killId),
    )
    .innerJoin(
      eventHeroNpcTable,
      eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
    );
