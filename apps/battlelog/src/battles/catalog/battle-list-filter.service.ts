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
import { Effect } from "effect";
import type { BattleListQuery } from "#src/battles/catalog/query-battles";
import type { DrizzleDatabase } from "#src/database/database";
import { battles, battleWarriors } from "#src/database/schema";

export type BattleListWhereBuilder = (
  battlesRef: typeof battles,
) => SQL | undefined;

export const makeBattleListFilter = (drizzle: DrizzleDatabase) => {
  const warriorExists = (
    battlesRef: typeof battles,
    ...conditions: (SQL | undefined)[]
  ) =>
    exists(
      drizzle
        .select({ one: eq(battleWarriors.id, battleWarriors.id) })
        .from(battleWarriors)
        .where(and(eq(battleWarriors.battleId, battlesRef.id), ...conditions)),
    );

  const appendTeamResultConditions = (
    resultConditions: (SQL | undefined)[],
    battlesRef: typeof battles,
    characterIds: string[],
    resultColumn: "winningTeam" | "losingTeam",
  ): void => {
    for (const characterId of characterIds) {
      for (const team of [1, 2]) {
        resultConditions.push(
          and(
            warriorExists(
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
  };

  const appendResultConditions = (
    conditions: (SQL | undefined)[],
    battlesRef: typeof battles,
    query: BattleListQuery,
    characterIds: string[],
  ): void => {
    if (!query.result?.length || !characterIds.length) {
      return;
    }

    const resultConditions: (SQL | undefined)[] = [];

    if (query.result.includes("won")) {
      appendTeamResultConditions(
        resultConditions,
        battlesRef,
        characterIds,
        "winningTeam",
      );
    }

    if (query.result.includes("lost")) {
      appendTeamResultConditions(
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
  };

  const appendPhCondition = (
    conditions: (SQL | undefined)[],
    battlesRef: typeof battles,
    query: BattleListQuery,
    characterIds: string[],
  ): void => {
    if (query.ph !== true) {
      return;
    }

    const phConditions: (SQL | undefined)[] = [gt(battleWarriors.ph, 0)];
    if (characterIds.length) {
      phConditions.push(inArray(battleWarriors.originalId, characterIds));
    }
    conditions.push(warriorExists(battlesRef, ...phConditions));
  };

  const appendLevelCondition = (
    conditions: (SQL | undefined)[],
    battlesRef: typeof battles,
    query: BattleListQuery,
    characterIds: string[],
  ): void => {
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

    conditions.push(warriorExists(battlesRef, ...levelConditions));
  };

  const buildFilterConditions = (query: BattleListQuery, userId?: string) =>
    Effect.gen(function* () {
      let characterIds = query.characterId ?? [];
      if (query.result?.length && !characterIds.length && userId) {
        const userChars = yield* drizzle.query.userCharacters.findMany({
          where: { userId },
          columns: { characterId: true },
        });
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

        appendResultConditions(conditions, battlesRef, query, characterIds);
        appendPhCondition(conditions, battlesRef, query, characterIds);

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
            warriorExists(
              battlesRef,
              ilike(battleWarriors.name, `%${query.search}%`),
            ),
          );
        }

        appendLevelCondition(conditions, battlesRef, query, characterIds);

        return conditions.length ? and(...conditions) : undefined;
      };
    }).pipe(
      Effect.withSpan("BattleListFilter_build", {
        attributes: { adapter: "drizzle", retryCount: 0 },
      }),
    );

  return { buildFilterConditions };
};

export type BattleListFilter = ReturnType<typeof makeBattleListFilter>;
