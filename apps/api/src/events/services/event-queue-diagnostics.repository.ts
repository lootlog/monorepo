import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import { eventHeroNpcTable, eventTable } from "#src/database/drizzle/schema";

export class EventQueueDiagnosticsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async eventExists(guildId: string, eventId: string): Promise<boolean> {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ id: eventTable.id })
          .from(eventTable)
          .where(
            and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)),
          )
          .limit(1),
      ),
    );
    return rows.length > 0;
  }

  async findHeroIds(eventId: string): Promise<string[]> {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ id: eventHeroNpcTable.id })
          .from(eventHeroNpcTable)
          .where(eq(eventHeroNpcTable.eventId, eventId)),
      ),
    );
    return rows.map(({ id }) => id);
  }
}
