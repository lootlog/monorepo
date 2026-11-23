import { expect, it } from "bun:test";
import {
  data,
  userId,
  integration,
  useBattleRedisIntegration,
} from "./battle-creation-redis.integration.fixtures.js";

useBattleRedisIntegration();

it("toggles visibility, serves public links and deletes battles stored in compressed chunks", async () => {
  const createInWorld = (world: string) =>
    integration.runtime.runPromise(
      integration.services.battles.createBattle({
        data: { ...data, world, submissionId: world },
        userId,
      }),
    );

  const [kept, removed] = await Promise.all([
    createInWorld("kept-world"),
    createInWorld("removed-world"),
  ]);

  for (const table of ["battles"])
    await integration.pool.query(
      `SELECT compress_chunk(chunk) FROM show_chunks('${table}') chunk`,
    );
  expect(
    (
      await integration.pool.query(
        "SELECT count(*)::int AS uncompressed FROM timescaledb_information.chunks WHERE hypertable_name = 'battles' AND NOT is_compressed",
      )
    ).rows,
  ).toEqual([{ uncompressed: 0 }]);

  await integration.runtime.runPromise(
    integration.services.battles.updateBattle(kept.battleId, { public: true }),
  );

  const visible = await integration.runtime.runPromise(
    integration.services.battles.getPublicBattle(kept.battleId),
  );

  expect(visible.warriors.map((warrior) => warrior.name).sort()).toEqual(
    data.events[0]?.f.w
      ? Object.values(data.events[0].f.w)
          .map((warrior) => warrior.name)
          .sort()
      : [],
  );

  await integration.runtime.runPromise(
    integration.services.battles.deleteBattle(removed.battleId),
  );
  expect(
    (
      await integration.pool.query(
        'SELECT DISTINCT "battleId" FROM battle_warriors ORDER BY "battleId"',
      )
    ).rows,
  ).toEqual([{ battleId: kept.battleId }]);

  await integration.runtime.runPromise(
    integration.services.battles.deleteUserBattles(userId),
  );

  for (const table of [
    "battles",
    "battle_warriors",
    "battle_timelines",
    "battle_submissions",
  ])
    expect(
      (
        await integration.pool.query(
          `SELECT count(*)::int AS left FROM ${table}`,
        )
      ).rows,
    ).toEqual([{ left: 0 }]);
});
