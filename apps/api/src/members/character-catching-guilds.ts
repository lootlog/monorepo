import type { ApiDatabase } from "#src/database/drizzle/database";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/user.schema";
import { and, desc, eq } from "drizzle-orm";
import { Effect } from "effect";

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
