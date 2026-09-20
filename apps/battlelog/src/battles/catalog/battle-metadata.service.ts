import { Logger } from "#src/infrastructure/logger";
import type { RedisStore } from "#src/infrastructure/redis-store";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { makeBattleAnalyticsCache } from "#src/battles/analytics/battle-analytics-cache.service";
import type { BattleReadBudget } from "#src/database/battle-read-budget";
import type { DrizzleDatabase } from "#src/database/database";
import { battles, battleWarriors, userCharacters } from "#src/database/schema";

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

const UserWorldsResponseSchema = Schema.Struct({
  worlds: Schema.Array(Schema.String),
});

type UserWorldsResponse = typeof UserWorldsResponseSchema.Type;

type BattleMetadataDatabase = Pick<
  DrizzleDatabase,
  "select" | "selectDistinctOn" | "insert"
>;

export const makeBattleMetadata = (
  drizzle: BattleMetadataDatabase,
  redisService: RedisStore,
  read: BattleReadBudget,
) => {
  const logger = new Logger("BattleMetadata");
  const cache = makeBattleAnalyticsCache(redisService);

  const getUserCharactersCacheKey = (userId: string) =>
    `battle-characters:list:${userId}`;

  const getUserWorldsCacheKey = (userId: string) =>
    `battle-worlds:${userId}:list`;

  // Keep the join inside LIMIT: an incomplete newest battle must not hide
  // the character's last recorded level/profession.
  const latestCharacterWarrior = drizzle
    .select({ lvl: battleWarriors.lvl, prof: battleWarriors.prof })
    .from(battles)
    .innerJoin(
      battleWarriors,
      and(
        eq(battleWarriors.battleId, battles.id),
        eq(battleWarriors.originalId, battles.characterId),
      ),
    )
    .where(
      and(
        eq(battles.userId, userCharacters.userId),
        eq(battles.characterId, userCharacters.characterId),
        eq(battles.world, userCharacters.world),
      ),
    )
    .orderBy(desc(battles.createdAt))
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

  const getUserWorldsUncached = (userId: string) =>
    drizzle
      .selectDistinctOn([userCharacters.world], {
        world: userCharacters.world,
      })
      .from(userCharacters)
      .where(eq(userCharacters.userId, userId))
      .orderBy(userCharacters.world)
      .pipe(
        read,
        Effect.mapError((error) => {
          logger.error("Failed to retrieve user worlds:", error);

          return new Error(
            `Failed to retrieve user worlds: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }),
        Effect.map(
          (results) =>
            ({
              worlds: results.map((character) => character.world),
            }) satisfies UserWorldsResponse,
        ),
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

  const getUserWorlds = (userId: string) =>
    cached(
      userId,
      getUserWorldsCacheKey(userId),
      getUserWorldsUncached(userId),
      UserWorldsResponseSchema,
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

      const ownedBattles = drizzle
        .select({ id: battles.id })
        .from(battles)
        .where(eq(battles.userId, userId));

      // One owner-scoped array lets PostgreSQL batch the index lookup instead
      // of probing participants separately for every battle. Keep the scan
      // covered by IDs/names; hydrate only the ten selected representatives.
      const matches = drizzle
        .selectDistinctOn([battleWarriors.name], {
          id: battleWarriors.id,
          name: battleWarriors.name,
        })
        .from(battleWarriors)
        .where(
          and(
            sql`${battleWarriors.battleId} = ANY(ARRAY(${ownedBattles.getSQL()}))`,
            ilike(battleWarriors.name, `%${query.trim()}%`),
          ),
        )
        .orderBy(battleWarriors.name, desc(battleWarriors.id))
        .limit(10)
        .as("warrior_matches");

      const results = yield* drizzle
        .select({
          name: battleWarriors.name,
          icon: battleWarriors.icon,
          prof: battleWarriors.prof,
          lvl: battleWarriors.lvl,
        })
        .from(matches)
        .innerJoin(battleWarriors, eq(battleWarriors.id, matches.id))
        .orderBy(matches.name)
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
    getUserWorlds,
    searchWarriors,
    upsertUserCharacter,
  };
};

export type BattleMetadata = ReturnType<typeof makeBattleMetadata>;
