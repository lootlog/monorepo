import { sql } from "drizzle-orm";
import { groupBy, maxBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { LOCATION_FIGHTS } from "./monster-locations.js";
import { buildMonsterFights } from "./monster-fights.js";

/**
 * A level holding fewer of the monster's fights than this is noise, such as
 * a client that reported a stale level, and no version of the monster.
 */
const MIN_LEVEL_SHARE = 0.01;

/**
 * A monster fought at more levels than this follows its fighter's level, as
 * Margonem's elastic monsters do; its levels are no history.
 */
const MAX_LEVEL_VERSIONS = 4;

/**
 * A level first fought within this many days of another one is a second
 * monster of the same name, such as one on another map, not a new version.
 */
const MIN_VERSION_DAYS = 7;

const DAY = 24 * 60 * 60 * 1000;

/** The fights of a monster recorded at one level. */
export type MonsterLevelFights = {
  readonly gameVersion: string;
  readonly name: string;
  readonly type: string | null;
  readonly lvl: number | null;
  readonly fights: number;
  /** The monster's fight, counted from its first, that first had the level. */
  readonly firstFight: number;
  /** The UTC day that fight was recorded, as `YYYY-MM-DD`. */
  readonly firstFoughtOn: string;
  /** Fights at the level among the monster's latest `LOCATION_FIGHTS`. */
  readonly recentFights: number;
};

/** Every level each monster was fought at, with when and how often. */
export const buildMonsterLevelsQuery = (database: ApiDatabaseValue) => {
  const { ctes, fights, monsterFights, isMonsterOfFight } =
    buildMonsterFights(database);

  return database
    .with(...ctes)
    .select({
      gameVersion: fights.gameVersion,
      name: fights.name,
      type: fights.type,
      lvl: fights.lvl,
      fights: sql<number>`count(*)::int`,
      firstFight: sql<number>`min(${fights.fight})::int`,
      // Loot times are stored as UTC.
      firstFoughtOn: sql<string>`to_char(min(${fights.foughtAt}), 'YYYY-MM-DD')`,
      recentFights: sql<number>`(count(*) filter (where ${fights.fight} > ${monsterFights.fights} - ${LOCATION_FIGHTS}))::int`,
    })
    .from(fights)
    .innerJoin(monsterFights, isMonsterOfFight)
    .groupBy(fights.gameVersion, fights.name, fights.type, fights.lvl);
};

/**
 * Each monster's former levels, oldest first, each with the day its next
 * version was first fought. A version is the level of a share of the
 * monster's fights, and the current one holds most of its latest fights.
 * Older clients went on reporting a rebalanced monster's former level for
 * months, sometimes more often than the current one, so a version ends when
 * the next one is first fought, not at its own last fight.
 */
export const toMonsterFormerLevels = (
  rows: ReadonlyArray<MonsterLevelFights>,
) =>
  Object.values(
    groupBy(rows, ({ gameVersion, name, type }) =>
      JSON.stringify([gameVersion, name, type]),
    ),
  ).flatMap((levels) => {
    const [first] = levels;

    if (!first) return [];

    const total = levels.reduce((sum, { fights }) => sum + fights, 0);

    const versions = levels
      .filter(
        ({ lvl, fights }) => Boolean(lvl) && fights / total >= MIN_LEVEL_SHARE,
      )
      .toSorted((a, b) => a.firstFight - b.firstFight);

    const current = maxBy(versions, ({ recentFights }) => recentFights);

    const former =
      versions.length > MAX_LEVEL_VERSIONS || current === undefined
        ? []
        : versions.slice(0, versions.indexOf(current));

    return [
      {
        gameVersion: first.gameVersion,
        name: first.name,
        type: first.type,
        formerLevels: former.flatMap((version, index) => {
          const next = versions[index + 1];

          return version.lvl !== null &&
            next &&
            Date.parse(next.firstFoughtOn) -
              Date.parse(version.firstFoughtOn) >=
              MIN_VERSION_DAYS * DAY
            ? [{ lvl: version.lvl, until: next.firstFoughtOn }]
            : [];
        }),
      },
    ];
  });
