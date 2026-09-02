import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  eventHeroNpcTable,
  eventMapTable,
  eventTable,
} from "#src/database/drizzle/schema";

@Injectable()
export class EventAccessRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findHero(guildId: string, eventId: string, heroId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ hero: eventHeroNpcTable })
          .from(eventHeroNpcTable)
          .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
          .where(
            and(
              eq(eventHeroNpcTable.id, heroId),
              eq(eventHeroNpcTable.eventId, eventId),
              eq(eventTable.guildId, guildId),
            ),
          )
          .limit(1),
      ),
    );
    return rows[0]?.hero ?? null;
  }

  async findMap(guildId: string, eventId: string, mapId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ map: eventMapTable, heroNpc: eventHeroNpcTable })
          .from(eventMapTable)
          .innerJoin(
            eventHeroNpcTable,
            eq(eventHeroNpcTable.id, eventMapTable.heroNpcId),
          )
          .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
          .where(
            and(
              eq(eventMapTable.id, mapId),
              eq(eventHeroNpcTable.eventId, eventId),
              eq(eventTable.guildId, guildId),
            ),
          )
          .limit(1),
      ),
    );
    const row = rows[0];
    return row ? { ...row.map, heroNpc: row.heroNpc } : null;
  }
}
