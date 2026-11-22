import type { GameVersion } from "@lootlog/schema/game-version";
import { sql } from "drizzle-orm";
import { groupBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { npcSpawnPositionTable } from "#src/database/drizzle/npc-spawn.schema";
import { buildMonsterFights } from "./monster-fights.js";

export const LOCATION_FIGHTS = 1000;

const MIN_LOCATION_SHARE = 0.01;

const MAX_SPAWN_TILES = 100;

export type MonsterLocationFights = {
  readonly gameVersion: GameVersion;
  readonly name: string;
  readonly type: string | null;
  readonly map: string;
  readonly fights: number;
};

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

export type MonsterSpawnTileReports = {
  readonly gameVersion: GameVersion;
  readonly name: string;
  readonly mapId: number;
  readonly map: string;
  readonly x: number;
  readonly y: number;
  readonly reports: number;
};

export const buildMonsterSpawnTilesQuery = (database: ApiDatabaseValue) =>
  database
    .select({
      gameVersion: npcSpawnPositionTable.gameVersion,
      name: npcSpawnPositionTable.npcName,
      mapId: npcSpawnPositionTable.mapId,
      map: npcSpawnPositionTable.mapName,
      x: npcSpawnPositionTable.x,
      y: npcSpawnPositionTable.y,
      reports: npcSpawnPositionTable.reports,
    })
    .from(npcSpawnPositionTable);

const spawnMapKey = (gameVersion: GameVersion, name: string, map: string) =>
  JSON.stringify([gameVersion, name, map]);

const toSpawnTilesByMap = (tiles: ReadonlyArray<MonsterSpawnTileReports>) =>
  new Map(
    Object.entries(
      groupBy(tiles, ({ gameVersion, name, map }) =>
        spawnMapKey(gameVersion, name, map),
      ),
    ).map(([key, mapTiles]) => {
      const byMapId = Object.values(groupBy(mapTiles, ({ mapId }) => mapId));

      const reportsOf = (group: ReadonlyArray<MonsterSpawnTileReports>) =>
        group.reduce((sum, { reports }) => sum + reports, 0);

      const dominant = byMapId.reduce((best, group) =>
        reportsOf(group) > reportsOf(best) ? group : best,
      );

      return [
        key,
        dominant
          .toSorted((a, b) => b.reports - a.reports || a.x - b.x || a.y - b.y)
          .slice(0, MAX_SPAWN_TILES)
          .map(({ x, y }) => ({ x, y }))
          .toSorted((a, b) => a.x - b.x || a.y - b.y),
      ];
    }),
  );

export const toMonsterLocations = (
  rows: ReadonlyArray<MonsterLocationFights>,
  spawnTiles: ReadonlyArray<MonsterSpawnTileReports> = [],
) => {
  const tilesByMap = toSpawnTilesByMap(spawnTiles);

  return Object.values(
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
            tiles:
              tilesByMap.get(spawnMapKey(first.gameVersion, first.name, map)) ??
              [],
          })),
      },
    ];
  });
};
