import { DROP_SOURCE_BOSS_TYPES } from "@lootlog/domain/npc-type";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
} from "#src/database/drizzle/loot.schema";

export const buildFightSources = (database: ApiDatabaseValue, since?: Date) => {
  const isBoss = inArray(npcSnapshotTable.type, [...DROP_SOURCE_BOSS_TYPES]);

  return database.$with("fight_sources").as(
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
      .where(
        and(
          eq(lootTable.source, "FIGHT"),
          since === undefined ? undefined : gte(lootTable.createdAt, since),
        ),
      )
      .groupBy(lootNpcTable.lootId),
  );
};

export const buildMonsterFights = (database: ApiDatabaseValue) => {
  const fightSources = buildFightSources(database);

  const fights = database.$with("fights").as(
    database
      .select({
        lootId: fightSources.lootId,
        location: lootTable.location,
        foughtAt: lootTable.createdAt,
        gameVersion: npcSnapshotTable.gameVersion,
        name: npcSnapshotTable.name,
        type: npcSnapshotTable.type,
        lvl: npcSnapshotTable.lvl,
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

  const ctes = [fightSources, fights, monsterFights] as const;

  const isMonsterOfFight = and(
    eq(monsterFights.gameVersion, fights.gameVersion),
    eq(monsterFights.name, fights.name),
    sql`${monsterFights.type} is not distinct from ${fights.type}`,
  );

  return { ctes, fights, monsterFights, isMonsterOfFight };
};
