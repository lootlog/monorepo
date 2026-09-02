import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import { mapTemplateTable } from "#src/database/drizzle/schema";

type MapTemplateMaps = ReadonlyArray<{
  readonly id: number;
  readonly name: string;
}>;

export class MapTemplatesRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findMany(guildId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(mapTemplateTable)
          .where(eq(mapTemplateTable.guildId, guildId))
          .orderBy(asc(mapTemplateTable.name)),
      ),
    );
  }

  async create(guildId: string, name: string, maps: MapTemplateMaps) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(mapTemplateTable)
          .values({ id: randomUUID(), guildId, name, maps: [...maps] })
          .returning(),
      ),
    );
    const created = rows[0];
    if (!created) throw new Error("Map template insert returned no row");
    return created;
  }

  async update(
    guildId: string,
    templateId: string,
    name: string,
    maps: MapTemplateMaps,
  ) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .update(mapTemplateTable)
          .set({ name, maps: [...maps] })
          .where(
            and(
              eq(mapTemplateTable.id, templateId),
              eq(mapTemplateTable.guildId, guildId),
            ),
          )
          .returning(),
      ),
    );
    return rows[0] ?? null;
  }

  async delete(guildId: string, templateId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .delete(mapTemplateTable)
          .where(
            and(
              eq(mapTemplateTable.id, templateId),
              eq(mapTemplateTable.guildId, guildId),
            ),
          )
          .returning({ id: mapTemplateTable.id }),
      ),
    );
    return rows.length > 0;
  }
}
