import { afterAll, beforeAll, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { Effect, ManagedRuntime } from "effect";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import { npcSpawnPositionTable } from "#src/database/drizzle/npc-spawn.schema";
import { recordNpcSpawnPositions } from "#src/npc-spawns/npc-spawn-positions";

const runtime = ManagedRuntime.make(ApiDatabaseLive);

let database: typeof ApiDatabase.Service;

beforeAll(async () => {
  database = await runtime.runPromise(ApiDatabase);
});

afterAll(async () => {
  await runtime.dispose();
});

it("counts every report of a tile once per submission and keeps the elite's spawn area", async () => {
  const name = `Elita ${crypto.randomUUID()}`;

  const elite = (x: number, y: number, templateId: number | null = 77) => ({
    name,
    templateId,
    location: "Grota Dzikiego Kota",
    mapId: 1234,
    x,
    y,
  });

  await runtime.runPromise(
    Effect.gen(function* () {
      yield* recordNpcSpawnPositions(database, "pl", [
        elite(10, 12),
        elite(10, 12),
        { ...elite(0, 0), name: `${name} sługa`, x: undefined },
      ]);
      yield* recordNpcSpawnPositions(database, "pl", [elite(14, 9)]);
      yield* recordNpcSpawnPositions(database, "pl", [elite(10, 12, null)]);
      yield* recordNpcSpawnPositions(database, undefined, [elite(1, 1)]);
    }),
  );

  const rows = await runtime.runPromise(
    database
      .select({
        x: npcSpawnPositionTable.x,
        y: npcSpawnPositionTable.y,
        mapId: npcSpawnPositionTable.mapId,
        templateId: npcSpawnPositionTable.templateId,
        reports: npcSpawnPositionTable.reports,
      })
      .from(npcSpawnPositionTable)
      .where(eq(npcSpawnPositionTable.npcName, name))
      .orderBy(npcSpawnPositionTable.x),
  );

  expect(rows).toEqual([
    { x: 10, y: 12, mapId: 1234, templateId: 77, reports: 2 },
    { x: 14, y: 9, mapId: 1234, templateId: 77, reports: 1 },
  ]);
});
