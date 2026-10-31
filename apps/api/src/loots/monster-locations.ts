import { sql } from "drizzle-orm";
import { groupBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { buildMonsterFights } from "./monster-fights.js";

/**
 * A monster's maps come from its latest fights, so a monster moved to another
 * map leaves the old one behind once enough fights there are recorded.
 */
export const LOCATION_FIGHTS = 1000;

/**
 * A map holding fewer of the monster's fights than this is noise: players
 * leave the map before the loot is recorded. Heroes keep spawn maps above it.
 */
export const MIN_LOCATION_SHARE = 0.01;

/** The fights of a monster recorded on one map. */
export type MonsterLocationFights = {
  readonly gameVersion: string;
  readonly name: string;
  readonly type: string | null;
  readonly map: string;
  readonly fights: number;
};

/** The fights each monster's latest `LOCATION_FIGHTS` recorded on each map. */
export const buildMonsterLocationsQuery = (database: ApiDatabaseValue) => {
  const { ctes, fights, monsterFights, isMonsterOfFight } =
    buildMonsterFights(database);

  return database
    .with(...ctes)
    .select({
      gameVersion: fights.gameVersion,
      name: fights.name,
      type: fights.type,
      map: fights.location,
      fights: sql<number>`count(*)::int`,
    })
    .from(fights)
    .innerJoin(monsterFights, isMonsterOfFight)
    .where(sql`${fights.fight} > ${monsterFights.fights} - ${LOCATION_FIGHTS}`)
    .groupBy(fights.gameVersion, fights.name, fights.type, fights.location);
};

/**
 * Each monster's maps with the share of its latest fights on each, most
 * fought first. A share is rounded to a whole percent: the catalog tells
 * where a monster is, not how often it is fought.
 */
export const toMonsterLocations = (
  rows: ReadonlyArray<MonsterLocationFights>,
) =>
  Object.values(
    groupBy(rows, ({ gameVersion, name, type }) =>
      JSON.stringify([gameVersion, name, type]),
    ),
  ).flatMap((maps) => {
    const [first] = maps;

    if (!first) return [];

    const total = maps.reduce((sum, { fights }) => sum + fights, 0);

    return [
      {
        gameVersion: first.gameVersion,
        name: first.name,
        type: first.type,
        locations: maps
          .filter(({ fights }) => fights / total >= MIN_LOCATION_SHARE)
          .toSorted((a, b) => b.fights - a.fights || a.map.localeCompare(b.map))
          .map(({ map, fights }) => ({
            map,
            share: Math.round((fights / total) * 100) / 100,
          })),
      },
    ];
  });
