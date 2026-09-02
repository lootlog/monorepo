import { Logger } from "#src/platform/logger";
import { RedisService } from "#src/shared/modules/redis/redis.service";
import { and, desc, eq, ilike } from "drizzle-orm";
import { DrizzleService } from "#src/shared/modules/drizzle/drizzle.service";
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

export class BattleMetadataService {
  private readonly logger = new Logger(BattleMetadataService.name);
  private readonly USER_METADATA_CACHE_TTL_SECONDS = 5 * 60;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redisService: RedisService,
  ) {}

  getUserCharacters(userId: string): Promise<UserCharactersResponse> {
    return this.redisService.getOrSetJsonBestEffort({
      key: this.getUserCharactersCacheKey(userId),
      ttlSeconds: this.USER_METADATA_CACHE_TTL_SECONDS,
      onError: (error) =>
        this.logger.warn("User characters cache unavailable", error),
      factory: () => this.getUserCharactersUncached(userId),
    });
  }

  getUserWorlds(userId: string): Promise<UserWorldsResponse> {
    return this.redisService.getOrSetJsonBestEffort({
      key: this.getUserWorldsCacheKey(userId),
      ttlSeconds: this.USER_METADATA_CACHE_TTL_SECONDS,
      onError: (error) =>
        this.logger.warn("User worlds cache unavailable", error),
      factory: () => this.getUserWorldsUncached(userId),
    });
  }

  async upsertUserCharacter({
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
  }): Promise<void> {
    try {
      await this.drizzle.run(
        this.drizzle.db
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
            set: { name, icon, lastSeenAt: new Date(), updatedAt: new Date() },
          }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to upsert character ${characterId} for user ${userId}`,
        error,
      );
    }
  }

  async searchWarriors(
    query: string,
    userId: string,
  ): Promise<WarriorsSearchResponse> {
    try {
      if (!query || query.trim().length < 2) {
        return { warriors: [] };
      }

      const results = await this.drizzle.run(
        this.drizzle.db
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
      );

      return { warriors: results };
    } catch (error) {
      this.logger.error("Failed to search warriors:", error);
      throw error;
    }
  }

  private getUserCharactersCacheKey(userId: string) {
    return `battle-characters:list:${userId}`;
  }

  private getUserWorldsCacheKey(userId: string) {
    return `battle-worlds:${userId}:list`;
  }

  private async getUserCharactersUncached(
    userId: string,
  ): Promise<UserCharactersResponse> {
    try {
      const results = await this.drizzle.run(
        this.drizzle.db.query.userCharacters.findMany({
          where: { userId },
          orderBy: { lastSeenAt: "desc" },
          columns: {
            characterId: true,
            name: true,
            world: true,
            icon: true,
          },
        }),
      );

      const characters = results.map((character) => ({
        id: character.characterId,
        name: character.name,
        world: character.world,
        icon: character.icon,
      }));

      return { characters };
    } catch (error) {
      this.logger.error("Failed to retrieve user characters:", error);
      throw new Error(
        `Failed to retrieve user characters: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async getUserWorldsUncached(
    userId: string,
  ): Promise<UserWorldsResponse> {
    try {
      const results = await this.drizzle.run(
        this.drizzle.db
          .selectDistinctOn([userCharacters.world], {
            world: userCharacters.world,
          })
          .from(userCharacters)
          .where(eq(userCharacters.userId, userId))
          .orderBy(userCharacters.world),
      );

      const worlds = results.map((character) => character.world);

      return { worlds };
    } catch (error) {
      this.logger.error("Failed to retrieve user worlds:", error);
      throw new Error(
        `Failed to retrieve user worlds: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
