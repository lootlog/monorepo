import {
  and,
  asc,
  eq,
  getColumns,
  gt,
  gte,
  inArray,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { Effect } from "effect";
import { groupBy } from "es-toolkit";
import {
  selectedWarriorOrder,
  warriorExists,
} from "#src/battles/battle-warrior-query";
import type { DrizzleDatabase } from "#src/database/database";
import { battles, battleWarriors } from "#src/database/schema";
import type { BattleAnalyticsQuery } from "./battle-analytics-query.service.js";
import { combatProfileCalculator } from "./combat-profile-calculator.service.js";
import type { BattleStatisticsQuery } from "./query-battle-statistics.js";

const BATCH_SIZE = 256;

const userColumns = {
  team: battleWarriors.team,
  ph: battleWarriors.ph,
  turns: battleWarriors.turns,
  turnsLost: battleWarriors.turnsLost,
  damageDealtAfterDefensive: battleWarriors.damageDealtAfterDefensive,
  damageTaken: battleWarriors.damageTaken,
  blockedDamage: battleWarriors.blockedDamage,
  blocks: battleWarriors.blocks,
  evasions: battleWarriors.evasions,
  meleeDamage: battleWarriors.meleeDamage,
  distanceDamage: battleWarriors.distanceDamage,
  auxiliaryDamage: battleWarriors.auxiliaryDamage,
  fireDamage: battleWarriors.fireDamage,
  frostDamage: battleWarriors.frostDamage,
  lightningDamage: battleWarriors.lightningDamage,
  thirdAttDamage: battleWarriors.thirdAttDamage,
  trueDamageDealt: battleWarriors.trueDamageDealt,
  rageDamageDealt: battleWarriors.rageDamageDealt,
  stigmaDamageDealt: battleWarriors.stigmaDamageDealt,
  spellsUsedMap: battleWarriors.spellsUsedMap,
};

export const makeBattleCombatProfileRead = (
  db: Pick<DrizzleDatabase, "select">,
  queryModule: Pick<
    BattleAnalyticsQuery,
    "buildCombatProfileWhere" | "getDateRangeFilter"
  >,
) => {
  const getCombatProfile = Effect.fnUntraced(function* (
    userId: string,
    query: BattleStatisticsQuery,
    characterIds: string[],
  ) {
    const accumulator = combatProfileCalculator.createAccumulator();

    if (characterIds.length === 0) return accumulator.result();

    const user = db
      .select(userColumns)
      .from(battleWarriors)
      .where(
        and(
          eq(battleWarriors.battleId, battles.id),
          inArray(battleWarriors.originalId, characterIds),
        ),
      )
      .orderBy(...selectedWarriorOrder(battles))
      .limit(1)
      .as("combat_user");

    const conditions = and(
      queryModule.buildCombatProfileWhere(battles, {
        userId,
        world: query.world,
        ...queryModule.getDateRangeFilter(query),
        matchmaking: query.matchmaking,
        characterIds,
        phFilter: query.ph,
      }),
      query.minLevel === undefined && query.maxLevel === undefined
        ? undefined
        : warriorExists(
            battles,
            notInArray(battleWarriors.originalId, characterIds),
            query.minLevel === undefined
              ? undefined
              : gte(battleWarriors.lvl, query.minLevel),
            query.maxLevel === undefined
              ? undefined
              : lte(battleWarriors.lvl, query.maxLevel),
          ),
      eq(battles.hasFlee, false),
      or(eq(user.team, battles.winningTeam), eq(user.team, battles.losingTeam)),
    );

    let cursor: { id: string; createdAt: string } | undefined;

    while (true) {
      const batch = yield* db
        .select({
          id: battles.id,
          createdAt: battles.createdAt,
          // Preserve PostgreSQL microseconds at the keyset boundary; Date loses them.
          cursorCreatedAt: sql<string>`${battles.createdAt}::text`,
          hasFlee: battles.hasFlee,
          winningTeam: battles.winningTeam,
          losingTeam: battles.losingTeam,
          ratingDelta: battles.ratingDelta,
          duration: battles.duration,
          userWarrior: getColumns(user),
        })
        .from(battles)
        .innerJoinLateral(user, sql`true`)
        .where(
          and(
            conditions,
            cursor
              ? or(
                  gt(battles.createdAt, sql`${cursor.createdAt}::timestamp`),
                  and(
                    eq(battles.createdAt, sql`${cursor.createdAt}::timestamp`),
                    gt(battles.id, cursor.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(asc(battles.createdAt), asc(battles.id))
        .limit(BATCH_SIZE);

      if (batch.length === 0) break;

      const warriors = yield* db
        .select({
          battleId: battleWarriors.battleId,
          team: battleWarriors.team,
          prof: battleWarriors.prof,
        })
        .from(battleWarriors)
        .where(
          inArray(
            battleWarriors.battleId,
            batch.map((battle) => battle.id),
          ),
        );

      const warriorsByBattle = groupBy(warriors, (warrior) => warrior.battleId);

      for (const battle of batch) {
        accumulator.add({
          ...battle,
          opponents: (warriorsByBattle[battle.id] ?? []).filter(
            (warrior) => warrior.team !== battle.userWarrior.team,
          ),
        });
      }

      if (batch.length < BATCH_SIZE) break;
      const last = batch[batch.length - 1];
      cursor = { id: last.id, createdAt: last.cursorCreatedAt };
    }

    return accumulator.result();
  });

  return { getCombatProfile };
};

export type BattleCombatProfileRead = ReturnType<
  typeof makeBattleCombatProfileRead
>;
