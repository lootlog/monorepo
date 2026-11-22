import type { GameVersion } from "@lootlog/schema/game-version";
import { sql } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { sortBy, uniqBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { npcSpawnPositionTable } from "#src/database/drizzle/npc-spawn.schema";

export type ReportedNpcPosition = {
  readonly name: string;
  readonly templateId?: number | null;
  readonly location: string;
  readonly mapId?: number;
  readonly x?: number;
  readonly y?: number;
};

const MAX_TILE = 32_767;

const isTile = (value: number | undefined): value is number =>
  value !== undefined &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= MAX_TILE;

const toNpcSpawnPositions = (
  gameVersion: GameVersion,
  npcs: ReadonlyArray<ReportedNpcPosition>,
) =>
  sortBy(
    uniqBy(
      npcs.flatMap(({ name, templateId, location, mapId, x, y }) => {
        const npcName = name.trim();
        const mapName = location.trim();

        if (
          mapId === undefined ||
          !isTile(x) ||
          !isTile(y) ||
          !npcName ||
          !mapName
        )
          return [];

        return [
          {
            gameVersion,
            mapId,
            npcName,
            x,
            y,
            mapName,
            templateId: templateId ?? null,
          },
        ];
      }),
      ({ mapId, npcName, x, y }) => JSON.stringify([mapId, npcName, x, y]),
    ),
    ["mapId", "npcName", "x", "y"],
  );

export const recordNpcSpawnPositions = (
  database: ApiDatabaseValue,
  gameVersion: GameVersion | undefined,
  npcs: ReadonlyArray<ReportedNpcPosition>,
) =>
  Effect.gen(function* () {
    if (gameVersion === undefined) return;

    const rows = toNpcSpawnPositions(gameVersion, npcs);

    if (rows.length === 0) return;

    const reportedAt = new Date(yield* Clock.currentTimeMillis);

    yield* database
      .insert(npcSpawnPositionTable)
      .values(
        rows.map((row) => ({
          ...row,
          firstReportedAt: reportedAt,
          lastReportedAt: reportedAt,
        })),
      )
      .onConflictDoUpdate({
        target: [
          npcSpawnPositionTable.gameVersion,
          npcSpawnPositionTable.mapId,
          npcSpawnPositionTable.npcName,
          npcSpawnPositionTable.x,
          npcSpawnPositionTable.y,
        ],
        set: {
          reports: sql`${npcSpawnPositionTable.reports} + 1`,
          mapName: sql`excluded."mapName"`,
          templateId: sql`COALESCE(excluded."templateId", ${npcSpawnPositionTable.templateId})`,
          lastReportedAt: reportedAt,
        },
      });
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("Failed to record NPC spawn positions", cause),
    ),
  );
