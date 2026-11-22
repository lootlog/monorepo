import type { GameVersion } from "@lootlog/schema/game-version";
import { sql } from "drizzle-orm";
import { groupBy, maxBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { LOCATION_FIGHTS } from "./monster-locations.js";
import { buildMonsterFights } from "./monster-fights.js";

const MIN_LEVEL_SHARE = 0.01;

const MAX_LEVEL_VERSIONS = 4;

const MIN_VERSION_DAYS = 7;

const DAY = 24 * 60 * 60 * 1000;

export type MonsterLevelFights = {
  readonly gameVersion: GameVersion;
  readonly name: string;
  readonly type: string | null;
  readonly lvl: number | null;
  readonly fights: number;
  readonly firstFight: number;
  readonly firstFoughtOn: string;
  readonly recentFights: number;
};

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
      firstFoughtOn: sql<string>`to_char(min(${fights.foughtAt}), 'YYYY-MM-DD')`,
      recentFights: sql<number>`(count(*) filter (where ${fights.fight} > ${monsterFights.fights} - ${LOCATION_FIGHTS}))::int`,
    })
    .from(fights)
    .innerJoin(monsterFights, isMonsterOfFight)
    .groupBy(fights.gameVersion, fights.name, fights.type, fights.lvl);
};

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
