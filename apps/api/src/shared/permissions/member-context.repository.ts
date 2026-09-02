import { and, eq, or } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "../../database/drizzle/database.js";
import { DrizzleDatabaseRuntime } from "../../database/drizzle/runtime.js";
import { guildTable } from "../../database/drizzle/schema.js";

export class MemberContextRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findActiveGuild(idOrVanityUrl: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(guildTable)
          .where(
            and(
              eq(guildTable.active, true),
              or(
                eq(guildTable.id, idOrVanityUrl),
                eq(guildTable.vanityUrl, idOrVanityUrl),
              ),
            ),
          )
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }
}
