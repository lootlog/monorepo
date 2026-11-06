import type { ApiDatabase } from "#src/database/drizzle/database";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/user.schema";
import { and, desc, eq } from "drizzle-orm";
import { Effect } from "effect";

/**
 * The Organizations a character's game-client submissions fan out to, from
 * its latest Lootlog settings. Callers still intersect them with the
 * Organizations the User may write to.
 */
export const selectCharacterCatchingGuildIds = (
  database: typeof ApiDatabase.Service,
  discordId: string,
  character: { accountId: string; characterId: string },
) =>
  database
    .select({
      catchingGuildIds: userCharactersLootlogSettingsTable.catchingGuildIds,
    })
    .from(userCharactersLootlogSettingsTable)
    .where(
      and(
        eq(userCharactersLootlogSettingsTable.userId, discordId),
        eq(userCharactersLootlogSettingsTable.accountId, character.accountId),
        eq(
          userCharactersLootlogSettingsTable.characterId,
          character.characterId,
        ),
      ),
    )
    .orderBy(desc(userCharactersLootlogSettingsTable.createdAt))
    .limit(1)
    .pipe(Effect.map((rows) => rows[0]?.catchingGuildIds ?? []));
