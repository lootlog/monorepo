import {
  and,
  eq,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  not,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import type { QueryBattlesDto } from "#src/battles/dto/query-battles.dto";
import { DrizzleService } from "#src/shared/modules/drizzle/drizzle.service";
import { battles, battleWarriors } from "#src/shared/modules/drizzle/schema";

export type BattleListWhereBuilder = (
  battlesRef: typeof battles,
) => SQL | undefined;

export class BattleListFilterService {
  constructor(private readonly drizzle: DrizzleService) {}

  async buildFilterConditions(
    query: QueryBattlesDto,
    userId?: string,
  ): Promise<BattleListWhereBuilder> {
    let characterIds = query.characterId ?? [];
    if (query.result?.length && !characterIds.length && userId) {
      const userChars = await this.drizzle.run(
        this.drizzle.db.query.userCharacters.findMany({
          where: { userId },
          columns: { characterId: true },
        }),
      );
      characterIds = userChars.map((character) => character.characterId);
    }

    return (battlesRef: typeof battles) => {
      const conditions: (SQL | undefined)[] = [];

      if (query.world) conditions.push(eq(battlesRef.world, query.world));
      if (query.userId) conditions.push(eq(battlesRef.userId, query.userId));
      if (typeof query.public === "boolean")
        conditions.push(eq(battlesRef.public, query.public));

      if (characterIds.length) {
        conditions.push(
          characterIds.length === 1
            ? eq(battlesRef.characterId, characterIds[0])
            : inArray(battlesRef.characterId, characterIds),
        );
      }

      if (query.type?.length) {
        const hasSolo = query.type.includes("solo");
        const hasGroup = query.type.includes("group");
        if (hasSolo && !hasGroup) {
          conditions.push(eq(battlesRef.type, "1v1"));
        } else if (hasGroup && !hasSolo) {
          conditions.push(not(eq(battlesRef.type, "1v1")));
        }
      }

      this.appendResultConditions(conditions, battlesRef, query, characterIds);
      this.appendPhCondition(conditions, battlesRef, query, characterIds);

      if (query.matchmaking !== undefined) {
        conditions.push(eq(battlesRef.matchmaking, query.matchmaking));
      }

      if (query.startDate) {
        conditions.push(gte(battlesRef.createdAt, new Date(query.startDate)));
      }

      if (query.endDate) {
        conditions.push(lte(battlesRef.createdAt, new Date(query.endDate)));
      }

      if (query.search) {
        conditions.push(
          this.warriorExists(
            battlesRef,
            ilike(battleWarriors.name, `%${query.search}%`),
          ),
        );
      }

      this.appendLevelCondition(conditions, battlesRef, query, characterIds);

      return conditions.length ? and(...conditions) : undefined;
    };
  }

  private appendResultConditions(
    conditions: (SQL | undefined)[],
    battlesRef: typeof battles,
    query: QueryBattlesDto,
    characterIds: string[],
  ): void {
    if (!query.result?.length || !characterIds.length) {
      return;
    }

    const resultConditions: (SQL | undefined)[] = [];

    if (query.result.includes("won")) {
      this.appendTeamResultConditions(
        resultConditions,
        battlesRef,
        characterIds,
        "winningTeam",
      );
    }

    if (query.result.includes("lost")) {
      this.appendTeamResultConditions(
        resultConditions,
        battlesRef,
        characterIds,
        "losingTeam",
      );
    }

    if (query.result.includes("flee")) {
      resultConditions.push(eq(battlesRef.hasFlee, true));
    }

    if (resultConditions.length) {
      conditions.push(or(...resultConditions));
    }
  }

  private appendTeamResultConditions(
    resultConditions: (SQL | undefined)[],
    battlesRef: typeof battles,
    characterIds: string[],
    resultColumn: "winningTeam" | "losingTeam",
  ): void {
    for (const characterId of characterIds) {
      for (const team of [1, 2]) {
        resultConditions.push(
          and(
            this.warriorExists(
              battlesRef,
              eq(battleWarriors.originalId, characterId),
              eq(battleWarriors.team, team),
            ),
            eq(battlesRef[resultColumn], team),
            eq(battlesRef.hasFlee, false),
          ),
        );
      }
    }
  }

  private appendPhCondition(
    conditions: (SQL | undefined)[],
    battlesRef: typeof battles,
    query: QueryBattlesDto,
    characterIds: string[],
  ): void {
    if (query.ph !== true) {
      return;
    }

    const phConditions: (SQL | undefined)[] = [gt(battleWarriors.ph, 0)];
    if (characterIds.length) {
      phConditions.push(inArray(battleWarriors.originalId, characterIds));
    }
    conditions.push(this.warriorExists(battlesRef, ...phConditions));
  }

  private appendLevelCondition(
    conditions: (SQL | undefined)[],
    battlesRef: typeof battles,
    query: QueryBattlesDto,
    characterIds: string[],
  ): void {
    if (query.minLevel === undefined && query.maxLevel === undefined) {
      return;
    }

    const levelConditions: (SQL | undefined)[] = [];

    if (query.minLevel !== undefined && query.maxLevel !== undefined) {
      levelConditions.push(gte(battleWarriors.lvl, query.minLevel));
      levelConditions.push(lte(battleWarriors.lvl, query.maxLevel));
    } else if (query.minLevel !== undefined) {
      levelConditions.push(gte(battleWarriors.lvl, query.minLevel));
    } else if (query.maxLevel !== undefined) {
      levelConditions.push(lte(battleWarriors.lvl, query.maxLevel));
    }

    if (characterIds.length) {
      levelConditions.push(notInArray(battleWarriors.originalId, characterIds));
    }

    conditions.push(this.warriorExists(battlesRef, ...levelConditions));
  }

  private warriorExists(
    battlesRef: typeof battles,
    ...conditions: (SQL | undefined)[]
  ) {
    return exists(
      this.drizzle.db
        .select({ one: eq(battleWarriors.id, battleWarriors.id) })
        .from(battleWarriors)
        .where(and(eq(battleWarriors.battleId, battlesRef.id), ...conditions)),
    );
  }
}
