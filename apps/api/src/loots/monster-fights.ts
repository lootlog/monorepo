import { DROP_SOURCE_BOSS_TYPES } from "@lootlog/domain/npc-type";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
} from "#src/database/drizzle/schema";

/**
 * Every recorded fight of every monster, numbered from the monster's first,
 * with the total its monster has. A monster is its edition, name and type, as
 * the search catalog names it, so a rework that gives it a new id keeps
 * counting its fights. Fights name their only NPC or the only boss among a
 * group, as drop sources do. The game client records a fight only when it
 * drops something above common, so fights are a sample of kills, not every
 * kill.
 */
export const buildMonsterFights = (database: ApiDatabaseValue) => {
  const isBoss = inArray(npcSnapshotTable.type, [...DROP_SOURCE_BOSS_TYPES]);

  const fightSources = database.$with("fight_sources").as(
    database
      .select({
        lootId: lootNpcTable.lootId,
        npcSnapshotId: sql<number | null>`case
          when count(*) = 1 then min(${lootNpcTable.npcSnapshotId})
          when count(*) filter (where ${isBoss}) = 1
            then min(${lootNpcTable.npcSnapshotId}) filter (where ${isBoss})
        end`.as("npc_snapshot_id"),
      })
      .from(lootNpcTable)
      .innerJoin(lootTable, eq(lootTable.id, lootNpcTable.lootId))
      .innerJoin(
        npcSnapshotTable,
        eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
      )
      .where(eq(lootTable.source, "FIGHT"))
      .groupBy(lootNpcTable.lootId),
  );

  // Columns stay table columns where they can: Drizzle names an aliased
  // expression without its CTE, which the joins below would make ambiguous.
  const fights = database.$with("fights").as(
    database
      .select({
        lootId: fightSources.lootId,
        location: lootTable.location,
        gameVersion: npcSnapshotTable.gameVersion,
        name: npcSnapshotTable.name,
        type: npcSnapshotTable.type,
        fight: sql<number>`row_number() over (
          partition by ${npcSnapshotTable.gameVersion}, ${npcSnapshotTable.name}, ${npcSnapshotTable.type}
          order by ${lootTable.createdAt}, ${lootTable.id}
        )`.as("fight"),
      })
      .from(fightSources)
      .innerJoin(lootTable, eq(lootTable.id, fightSources.lootId))
      .innerJoin(
        npcSnapshotTable,
        eq(npcSnapshotTable.id, fightSources.npcSnapshotId),
      ),
  );

  const monsterFights = database.$with("monster_fights").as(
    database
      .select({
        gameVersion: fights.gameVersion,
        name: fights.name,
        type: fights.type,
        fights: sql<number>`max(${fights.fight})::int`.as("fight_count"),
      })
      .from(fights)
      .groupBy(fights.gameVersion, fights.name, fights.type),
  );

  // A query declares them all once, in this order.
  const ctes = [fightSources, fights, monsterFights] as const;

  /** Joins a fight to its monster's total. */
  const isMonsterOfFight = and(
    eq(monsterFights.gameVersion, fights.gameVersion),
    eq(monsterFights.name, fights.name),
    sql`${monsterFights.type} is not distinct from ${fights.type}`,
  );

  return { ctes, fights, monsterFights, isMonsterOfFight };
};
