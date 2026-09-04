import { inArray } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/schema";

export const makeNotificationGuildLookup =
  (database: ApiDatabaseValue) => (guildIds: readonly string[]) =>
    guildIds.length === 0
      ? Effect.succeed([])
      : database
          .select({ id: guildTable.id, name: guildTable.name })
          .from(guildTable)
          .where(inArray(guildTable.id, [...guildIds]));
