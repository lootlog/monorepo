import { Injectable } from "@nestjs/common";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import { eventHeroNpcTable, eventTable } from "#src/database/drizzle/schema";

@Injectable()
export class ActiveEventHeroRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findMatches(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
    referenceTime: Date,
  ) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
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
              or(
                isNull(eventTable.endsAt),
                gt(eventTable.endsAt, referenceTime),
              ),
            ),
          ),
      ),
    );
  }
}
