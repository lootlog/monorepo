import type { GameVersion } from "@lootlog/schema/game-version";
import { and, eq, sql } from "drizzle-orm";
import { groupBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  itemSnapshotTable,
  lootItemTable,
} from "#src/database/drizzle/loot.schema";
import { buildMonsterFights } from "./monster-fights.js";

const RETIREMENT_LIKELIHOOD = 1e-6;

const MIN_FIGHTS_SINCE_LAST_DROP = 500;

export type DropStatistics = {
  readonly drops: number;
  readonly lastDropFight: number;
  readonly fights: number;
};

export const isRetiredDrop = ({
  drops,
  lastDropFight,
  fights,
}: DropStatistics) =>
  fights - lastDropFight >= MIN_FIGHTS_SINCE_LAST_DROP &&
  drops * Math.log(lastDropFight / fights) < Math.log(RETIREMENT_LIKELIHOOD);

export const buildDropStatisticsQuery = (database: ApiDatabaseValue) => {
  const { ctes, fights, monsterFights, isMonsterOfFight } =
    buildMonsterFights(database);

  return database
    .with(...ctes)
    .select({
      gameVersion: fights.gameVersion,
      name: fights.name,
      type: fights.type,
      itemId: itemSnapshotTable.itemId,
      itemName: sql<string>`max(${itemSnapshotTable.name})`,
      drops: sql<number>`count(distinct ${fights.lootId})::int`,
      lastDropFight: sql<number>`max(${fights.fight})::int`,
      fights: sql<number>`max(${monsterFights.fights})`,
    })
    .from(fights)
    .innerJoin(monsterFights, isMonsterOfFight)
    .innerJoin(lootItemTable, eq(lootItemTable.lootId, fights.lootId))
    .innerJoin(
      itemSnapshotTable,
      and(
        eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
        sql`${itemSnapshotTable.gameVersion}::text = ${fights.gameVersion}::text`,
      ),
    )
    .groupBy(
      fights.gameVersion,
      fights.name,
      fights.type,
      itemSnapshotTable.itemId,
    );
};

type ItemDropStatistics = DropStatistics & {
  readonly gameVersion: GameVersion;
  readonly name: string;
  readonly type: string | null;
  readonly itemId: number;
  readonly itemName: string;
};

const monsterKey = ({ gameVersion, name, type }: ItemDropStatistics) =>
  JSON.stringify([gameVersion, name, type]);

const namesakeItemKey = ({ gameVersion, name, itemName }: ItemDropStatistics) =>
  JSON.stringify([gameVersion, name, itemName]);

export const toRetiredDrops = (rows: ReadonlyArray<ItemDropStatistics>) => {
  const retiredBy = new Map<string, Set<string>>();

  for (const drops of Object.values(
    groupBy(rows, (row) => JSON.stringify([monsterKey(row), row.itemName])),
  )) {
    const [first] = drops;

    if (first && drops.every(isRetiredDrop)) {
      const key = namesakeItemKey(first);

      retiredBy.set(
        key,
        (retiredBy.get(key) ?? new Set()).add(monsterKey(first)),
      );
    }
  }

  const isRetired = (row: ItemDropStatistics) =>
    isRetiredDrop(row) ||
    [...(retiredBy.get(namesakeItemKey(row)) ?? [])].some(
      (key) => key !== monsterKey(row),
    );

  return Object.values(groupBy(rows, monsterKey)).flatMap((drops) => {
    const [first] = drops;

    return first
      ? [
          {
            gameVersion: first.gameVersion,
            name: first.name,
            type: first.type,
            retiredItemIds: drops.filter(isRetired).map(({ itemId }) => itemId),
          },
        ]
      : [];
  });
};
