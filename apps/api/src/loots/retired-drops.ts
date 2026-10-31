import { and, eq, sql } from "drizzle-orm";
import { groupBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { itemSnapshotTable, lootItemTable } from "#src/database/drizzle/schema";
import { buildMonsterFights } from "./monster-fights.js";

/**
 * A drop is retired when its observed drops are this unlikely to all fall
 * before its last one if the monster still dropped the item at a steady rate.
 * Tens of thousands of drops are tested a run, so the bar sits far below
 * one false retirement.
 */
const RETIREMENT_LIKELIHOOD = 1e-6;

// Too few fights since the last drop prove nothing, whatever the likelihood.
const MIN_FIGHTS_SINCE_LAST_DROP = 500;

/** A monster's drop statistics over its recorded fights. */
export type DropStatistics = {
  /** Fights the item dropped in. */
  readonly drops: number;
  /** The monster's fight, counted from its first, that last dropped the item. */
  readonly lastDropFight: number;
  /** Every recorded fight of the monster. */
  readonly fights: number;
};

/**
 * Whether a monster no longer drops an item. While it does, its drops spread
 * evenly over the monster's recorded fights, so all `drops` falling within the
 * first `lastDropFight` of `fights` has the likelihood
 * `(lastDropFight / fights) ^ drops`. That holds while the item's share of
 * recorded fights is steady; only a loot change that makes other drops
 * several times more common could pass for a retirement, and a new drop of
 * the item clears it.
 */
export const isRetiredDrop = ({
  drops,
  lastDropFight,
  fights,
}: DropStatistics) =>
  fights - lastDropFight >= MIN_FIGHTS_SINCE_LAST_DROP &&
  drops * Math.log(lastDropFight / fights) < Math.log(RETIREMENT_LIKELIHOOD);

/** Every item each monster dropped, with its drop statistics. */
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
        // Some older loots name another edition's NPC, as drop sources skip.
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

/** A monster's drop statistics for one item, as the query returns them. */
type ItemDropStatistics = DropStatistics & {
  readonly gameVersion: string;
  readonly name: string;
  readonly type: string | null;
  readonly itemId: number;
};

/** For every monster that dropped anything, the items it no longer drops. */
export const toRetiredDrops = (rows: ReadonlyArray<ItemDropStatistics>) =>
  Object.values(
    groupBy(rows, ({ gameVersion, name, type }) =>
      JSON.stringify([gameVersion, name, type]),
    ),
  ).flatMap((drops) => {
    const [first] = drops;

    return first
      ? [
          {
            gameVersion: first.gameVersion,
            name: first.name,
            type: first.type,
            retiredItemIds: drops
              .filter(isRetiredDrop)
              .map(({ itemId }) => itemId),
          },
        ]
      : [];
  });
