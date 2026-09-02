import { Logger } from "#src/platform/logger";
import type { RedisStore } from "#src/shared/modules/redis/redis.service";
import { and, desc, eq, ilike } from "drizzle-orm";
import { Effect } from "effect";
import type { DrizzleDatabase } from "#src/shared/modules/drizzle/drizzle.service";
import {
  battles,
  battleWarriors,
  userCharacters,
} from "#src/shared/modules/drizzle/schema";

type UserCharactersResponse = {
  characters: Array<{
    id: string;
    name: string;
    world: string;
    icon: string;
  }>;
};

type UserWorldsResponse = {
  worlds: string[];
};

type WarriorsSearchResponse = {
  warriors: Array<{ name: string; icon: string; prof: string; lvl: number }>;
};

const USER_METADATA_CACHE_TTL_SECONDS = 5 * 60;

export const makeBattleMetadata = (
  drizzle: DrizzleDatabase,
  redisService: RedisStore,
) => {
  const logger = new Logger("BattleMetadata");
  const getUserCharactersCacheKey = (userId: string) =>
    `battle-characters:list:${userId}`;
  const getUserWorldsCacheKey = (userId: string) =>
    `battle-worlds:${userId}:list`;

  const getUserCharactersUncached = (userId: string) =>
    Effect.tryPromise({
      try: () =>
        drizzle.run(
          drizzle.db.query.userCharacters.findMany({
            where: { userId },
            orderBy: { lastSeenAt: "desc" },
            columns: {
              characterId: true,
              name: true,
              world: true,
              icon: true,
            },
          }),
        ),
      catch: (error) => {
        logger.error("Failed to retrieve user characters:", error);
        return new Error(
          `Failed to retrieve user characters: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      },
    }).pipe(
      Effect.map(
        (results) =>
          ({
            characters: results.map((character) => ({
              id: character.characterId,
              name: character.name,
              world: character.world,
              icon: character.icon,
            })),
          }) satisfies UserCharactersResponse,
      ),
    );

  const getUserWorldsUncached = (userId: string) =>
    Effect.tryPromise({
      try: () =>
        drizzle.run(
          drizzle.db
            .selectDistinctOn([userCharacters.world], {
              world: userCharacters.world,
            })
            .from(userCharacters)
            .where(eq(userCharacters.userId, userId))
            .orderBy(userCharacters.world),
        ),
      catch: (error) => {
        logger.error("Failed to retrieve user worlds:", error);
        return new Error(
          `Failed to retrieve user worlds: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      },
    }).pipe(
      Effect.map(
        (results) =>
          ({
            worlds: results.map((character) => character.world),
          }) satisfies UserWorldsResponse,
      ),
    );

  const cached = <A>(key: string, load: Effect.Effect<A, unknown>) =>
    Effect.tryPromise({
      try: () => Promise.resolve(redisService.getJson<A>(key)),
      catch: (cause) => cause,
    }).pipe(
      Effect.catch((error) => {
        logger.warn("User metadata cache unavailable", error);
        return Effect.succeed(null);
      }),
      Effect.flatMap((value) =>
        value === null ? load : Effect.succeed(value),
      ),
      Effect.tap((value) =>
        Effect.tryPromise({
          try: () =>
            Promise.resolve(
              redisService.setJson(key, value, USER_METADATA_CACHE_TTL_SECONDS),
            ),
          catch: (cause) => cause,
        }).pipe(Effect.catch(() => Effect.void)),
      ),
      Effect.withSpan("BattleMetadata_cached", {
        attributes: { adapter: "redis", retryCount: 0 },
      }),
    );

  const getUserCharacters = (userId: string) =>
    cached(
      getUserCharactersCacheKey(userId),
      getUserCharactersUncached(userId),
    );

  const getUserWorlds = (userId: string) =>
    cached(getUserWorldsCacheKey(userId), getUserWorldsUncached(userId));

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
    Effect.tryPromise({
      try: () =>
        drizzle.run(
          drizzle.db
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
            }),
        ),
      catch: (cause) => cause,
    }).pipe(
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

      const results = yield* Effect.tryPromise({
        try: () =>
          drizzle.run(
            drizzle.db
              .selectDistinctOn([battleWarriors.name], {
                name: battleWarriors.name,
                icon: battleWarriors.icon,
                prof: battleWarriors.prof,
                lvl: battleWarriors.lvl,
              })
              .from(battleWarriors)
              .innerJoin(battles, eq(battleWarriors.battleId, battles.id))
              .where(
                and(
                  eq(battles.userId, userId),
                  ilike(battleWarriors.name, `%${query.trim()}%`),
                ),
              )
              .orderBy(battleWarriors.name, desc(battleWarriors.id))
              .limit(10),
          ),
        catch: (cause) => cause,
      });

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
