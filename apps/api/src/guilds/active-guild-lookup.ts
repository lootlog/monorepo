import { and, eq, or } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/schema";

/**
 * Resolves an active Organization from a path segment that holds either its id
 * or its vanity URL. An id match always wins, so another Organization's vanity
 * URL can never shadow an id.
 */
export const findActiveGuild = (
  database: ApiDatabaseValue,
  idOrVanityUrl: string,
) =>
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
    .limit(2)
    .pipe(
      Effect.map(
        (guilds) =>
          guilds.find(({ id }) => id === idOrVanityUrl) ?? guilds[0] ?? null,
      ),
    );
