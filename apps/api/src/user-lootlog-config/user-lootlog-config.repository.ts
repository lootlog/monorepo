import { Injectable } from "@nestjs/common";
import { and, arrayOverlaps, desc, eq, or } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "../database/drizzle/database.js";
import { DrizzleDatabaseRuntime } from "../database/drizzle/runtime.js";
import { userCharactersLootlogSettingsTable } from "../database/drizzle/schema.js";

type PlayerIdentity = {
  readonly userId: string;
  readonly accountId: string;
  readonly characterId: string;
};

@Injectable()
export class UserLootlogConfigRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findAccountConfig(userId: string, accountId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(userCharactersLootlogSettingsTable)
          .where(
            and(
              eq(userCharactersLootlogSettingsTable.userId, userId),
              eq(userCharactersLootlogSettingsTable.accountId, accountId),
            ),
          )
          .orderBy(desc(userCharactersLootlogSettingsTable.createdAt)),
      ),
    );
  }

  async findCharacterConfig(
    userId: string,
    accountId: string,
    characterId: string,
  ) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(userCharactersLootlogSettingsTable)
          .where(
            and(
              eq(userCharactersLootlogSettingsTable.userId, userId),
              eq(userCharactersLootlogSettingsTable.accountId, accountId),
              eq(userCharactersLootlogSettingsTable.characterId, characterId),
            ),
          )
          .orderBy(desc(userCharactersLootlogSettingsTable.createdAt))
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }

  findPlayers(
    players: ReadonlyArray<PlayerIdentity>,
    accessibleGuildIds: ReadonlyArray<string>,
  ) {
    const playerPredicates = players.map((player) =>
      and(
        eq(userCharactersLootlogSettingsTable.userId, player.userId),
        eq(userCharactersLootlogSettingsTable.accountId, player.accountId),
        eq(userCharactersLootlogSettingsTable.characterId, player.characterId),
      ),
    );

    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({
            userId: userCharactersLootlogSettingsTable.userId,
            accountId: userCharactersLootlogSettingsTable.accountId,
            characterId: userCharactersLootlogSettingsTable.characterId,
            catchingGuildIds:
              userCharactersLootlogSettingsTable.catchingGuildIds,
          })
          .from(userCharactersLootlogSettingsTable)
          .where(
            and(
              or(...playerPredicates),
              arrayOverlaps(
                userCharactersLootlogSettingsTable.catchingGuildIds,
                [...accessibleGuildIds],
              ),
            ),
          )
          .orderBy(desc(userCharactersLootlogSettingsTable.createdAt)),
      ),
    );
  }

  async upsertCharacterConfig(
    userId: string,
    accountId: string,
    characterId: string,
    catchingGuildIds: ReadonlyArray<string>,
  ) {
    const now = new Date();
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(userCharactersLootlogSettingsTable)
          .values({
            userId,
            accountId,
            characterId,
            catchingGuildIds: [...catchingGuildIds],
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              userCharactersLootlogSettingsTable.userId,
              userCharactersLootlogSettingsTable.accountId,
              userCharactersLootlogSettingsTable.characterId,
            ],
            set: { catchingGuildIds: [...catchingGuildIds], updatedAt: now },
          })
          .returning(),
      ),
    );
    const config = rows[0];
    if (!config) {
      throw new Error("Lootlog character configuration was not returned");
    }
    return config;
  }
}
