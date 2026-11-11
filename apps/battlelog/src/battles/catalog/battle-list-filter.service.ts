import { firstBattleIdAt, lastBattleIdAt } from "#src/battles/battle-id";
import { warriorExists } from "#src/battles/battle-warrior-query";
import {
  and,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  not,
  notInArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { EmptyFilter } from "drizzle-orm/relations";
import { Effect } from "effect";
import type { BattleListQuery } from "#src/battles/catalog/query-battles";
import type { DrizzleDatabase } from "#src/database/database";
import { battles, battleWarriors } from "#src/database/schema";

type BattleListFilterDatabase = {
  query: {
    userCharacters: Pick<
      DrizzleDatabase["query"]["userCharacters"],
      "findMany"
    >;
  };
};

// Margonem levels run from 1 to 500; the web panel's default range is the same.
const MIN_WARRIOR_LEVEL = 1;

const MAX_WARRIOR_LEVEL = 500;

export const makeBattleListFilter = (drizzle: BattleListFilterDatabase) => {
  const appendTeamResultConditions = (
    resultConditions: (SQL | undefined)[],
    battlesRef: typeof battles,
    characterIds: string[],
    resultColumn: "winningTeam" | "losingTeam",
  ): void => {
    if (!characterIds.length) {
      // The user has no characters in this world, so they cannot have won or lost here.
      resultConditions.push(sql`false`);

      return;
    }

    resultConditions.push(
      and(
        warriorExists(
          battlesRef,
          inArray(battleWarriors.originalId, characterIds),
          eq(battleWarriors.team, battlesRef[resultColumn]),
        ),
        inArray(battlesRef[resultColumn], [1, 2]),
        eq(battlesRef.hasFlee, false),
      ),
    );
  };

  const appendResultConditions = (
    conditions: (SQL | undefined)[],
    battlesRef: typeof battles,
    query: BattleListQuery,
    characterIds: string[],
    characterScoped: boolean,
  ): void => {
    if (!query.result?.length || (!characterIds.length && !characterScoped)) {
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

    // The panel sends the full range (1 to 500) while no level filter is set.
    // Such a bound excludes no warrior, but the EXISTS below would still probe
    // battle_warriors once per battle the user owns.
    const minLevel =
      query.minLevel !== undefined && query.minLevel > MIN_WARRIOR_LEVEL
        ? query.minLevel
        : undefined;

    const maxLevel =
      query.maxLevel !== undefined && query.maxLevel < MAX_WARRIOR_LEVEL
        ? query.maxLevel
        : undefined;

    // Selected characters still need an opponent besides themselves.
    if (
      minLevel === undefined &&
      maxLevel === undefined &&
      !characterIds.length
    ) {
      return;
    }

    const levelConditions: (SQL | undefined)[] = [];

    if (minLevel !== undefined) {
      levelConditions.push(gte(battleWarriors.lvl, minLevel));
    }

    if (maxLevel !== undefined) {
      levelConditions.push(lte(battleWarriors.lvl, maxLevel));
    }

    if (characterIds.length) {
      levelConditions.push(notInArray(battleWarriors.originalId, characterIds));
    }

    conditions.push(warriorExists(battlesRef, ...levelConditions));
  };

  const buildFilterConditions = (query: BattleListQuery, userId?: string) =>
    Effect.gen(function* () {
      let characterIds = query.characterId ?? [];

      const characterScoped = Boolean(
        query.result?.length && (characterIds.length || userId),
      );

      if (query.result?.length && !characterIds.length && userId) {
        const userChars = yield* drizzle.query.userCharacters.findMany({
          where: { userId, world: query.world || EmptyFilter },
          columns: { characterId: true },
        });

        characterIds = userChars.map((character) => character.characterId);
      }

      return (battlesRef: typeof battles) => {
        const conditions: (SQL | undefined)[] = [];

        if (query.world) conditions.push(eq(battlesRef.world, query.world));

        if (query.userId) conditions.push(eq(battlesRef.userId, query.userId));

        if (query.public !== undefined)
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

        appendResultConditions(
          conditions,
          battlesRef,
          query,
          characterIds,
          characterScoped,
        );
        appendPhCondition(conditions, battlesRef, query, characterIds);

        if (query.matchmaking !== undefined) {
          conditions.push(eq(battlesRef.matchmaking, query.matchmaking));
        }

        if (query.startDate) {
          conditions.push(
            gte(battlesRef.id, firstBattleIdAt(new Date(query.startDate))),
          );
        }

        if (query.endDate) {
          conditions.push(
            lte(battlesRef.id, lastBattleIdAt(new Date(query.endDate))),
          );
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
