import { ContextLogger } from "@lootlog/instrumentation";
import type { RedisStore } from "#src/infrastructure/redis-store";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { makeBattleAnalyticsCache } from "#src/battles/analytics/battle-analytics-cache.service";
import type { BattleReadBudget } from "#src/database/battle-read-budget";
import type { DrizzleDatabase } from "#src/database/database";
import {
  battles,
  battleWarriorFilters,
  battleWarriors,
  userCharacters,
} from "#src/database/schema";

const UserCharactersResponseSchema = Schema.Struct({
  characters: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      world: Schema.String,
      icon: Schema.String,
      lvl: Schema.NullOr(Schema.Number),
      prof: Schema.NullOr(Schema.String),
    }),
  ),
});

type BattleMetadataDatabase = Pick<
  DrizzleDatabase,
  "select" | "selectDistinctOn" | "insert"
>;

export const makeBattleMetadata = (
  drizzle: BattleMetadataDatabase,
  redisService: RedisStore,
  read: BattleReadBudget,
) => {
  const logger = new ContextLogger("BattleMetadata");
  const cache = makeBattleAnalyticsCache(redisService);

  const getUserCharactersCacheKey = (userId: string) =>
    `battle-characters:list:${userId}`;

  // Keep the join inside LIMIT: an incomplete newest battle must not hide
  // the character's last recorded level/profession.
  // OFFSET 0 keeps this join battle-first instead of scanning global warrior ids.
  const latestBattleWarrior = drizzle
    .select({ lvl: battleWarriors.lvl, prof: battleWarriors.prof })
    .from(battleWarriors)
    .where(
      and(
        eq(battleWarriors.battleId, battles.id),
        eq(battleWarriors.originalId, battles.characterId),
      ),
    )
    .offset(0)
    .as("latest_battle_warrior");

  const latestCharacterWarrior = drizzle
    .select({
      lvl: latestBattleWarrior.lvl,
      prof: latestBattleWarrior.prof,
    })
    .from(battles)
    .innerJoinLateral(latestBattleWarrior, sql`true`)
    .where(
      and(
        eq(battles.userId, userCharacters.userId),
        eq(battles.characterId, userCharacters.characterId),
        eq(battles.world, userCharacters.world),
      ),
    )
    .orderBy(desc(battles.id))
    .limit(1)
    .as("latest_character_warrior");

  const getUserCharactersUncached = (userId: string) =>
    drizzle
      .select({
        id: userCharacters.characterId,
        name: userCharacters.name,
        world: userCharacters.world,
        icon: userCharacters.icon,
        lvl: latestCharacterWarrior.lvl,
        prof: latestCharacterWarrior.prof,
      })
      .from(userCharacters)
      .leftJoinLateral(latestCharacterWarrior, sql`true`)
      .where(eq(userCharacters.userId, userId))
      .orderBy(desc(userCharacters.lastSeenAt))
      .pipe(
        read,
        Effect.map((characters) => ({ characters })),
      );

  const cached = <S extends Schema.ConstraintDecoder<unknown>>(
    userId: string,
    key: string,
    load: Effect.Effect<S["Type"], unknown>,
    schema: S,
  ) =>
    cache.getOrSetJson(
      userId,
      key,
      () => load,
      Schema.decodeUnknownSync(Schema.fromJsonString(schema)),
    );

  const getUserCharacters = (userId: string) =>
    cached(
      userId,
      getUserCharactersCacheKey(userId),
      getUserCharactersUncached(userId),
      UserCharactersResponseSchema,
    );

  const upsertUserCharacter = ({
    characterId,
    icon,
    name,
    userId,
    world,
  }: {
    characterId: string;
    icon: string;
    name: string;
    userId: string;
    world: string;
  }) =>
    drizzle
      .insert(userCharacters)
      .values({
        userId,
        characterId,
        name,
        world,
        icon,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          userCharacters.userId,
          userCharacters.characterId,
          userCharacters.world,
        ],
        set: {
          name,
          icon,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .pipe(
        Effect.asVoid,
        Effect.catch((error) => {
          logger.warn(
            `Failed to upsert character ${characterId} for user ${userId}`,
            error,
          );

          return Effect.void;
        }),
        Effect.withSpan("BattleMetadata_upsertCharacter", {
          attributes: { adapter: "drizzle", retryCount: 0 },
        }),
      );

  const searchWarriors = (query: string, userId: string) =>
    Effect.gen(function* () {
      if (!query || query.trim().length < 2) {
        return { warriors: [] };
      }

      const term = `%${query.trim()}%`;

      // The latest appearance supplies the icon, profession and level.
      const latest = drizzle
        .selectDistinctOn([battleWarriorFilters.name], {
          name: battleWarriorFilters.name,
          lvl: battleWarriorFilters.lvl,
          battleId: battleWarriorFilters.battleId,
          originalId: battleWarriorFilters.originalId,
        })
        .from(battleWarriorFilters)
        .where(
          and(
            eq(battleWarriorFilters.userId, userId),
            ilike(battleWarriorFilters.name, term),
          ),
        )
        .orderBy(battleWarriorFilters.name, desc(battleWarriorFilters.battleId))
        .limit(10)
        .as("latest");

      const results = yield* drizzle
        .select({
          name: latest.name,
          icon: battleWarriors.icon,
          prof: battleWarriors.prof,
          lvl: latest.lvl,
        })
        .from(latest)
        .innerJoin(
          battleWarriors,
          and(
            eq(battleWarriors.battleId, latest.battleId),
            eq(battleWarriors.originalId, latest.originalId),
          ),
        )
        .orderBy(latest.name)
        .pipe(read);

      return { warriors: results };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          logger.error("Failed to search warriors:", error);
        }),
      ),
      Effect.withSpan("BattleMetadata_searchWarriors", {
        attributes: { adapter: "drizzle", retryCount: 0 },
      }),
    );

  return {
    getUserCharacters,
    searchWarriors,
    upsertUserCharacter,
  };
};

export type BattleMetadata = ReturnType<typeof makeBattleMetadata>;
