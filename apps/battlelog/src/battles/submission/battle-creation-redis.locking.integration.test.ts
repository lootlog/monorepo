import { expect, it } from "bun:test";
import { Effect, Exit } from "effect";
import {
  unusedDeleteQueue,
  unusedWeaponKills,
} from "../../../test/battle-fixtures.js";
import { makeBattlelogOperations } from "#src/battles/battlelog-operations";
import { makeBattlelogTestBoundary } from "../../../test/battlelog-test-boundary.js";
import {
  data,
  userId,
  lockKey,
  waitForLock,
  integration,
  useBattleRedisIntegration,
} from "./battle-creation-redis.integration.fixtures.js";

useBattleRedisIntegration();

it("renews the real Lua lock beyond its TTL while concurrent callers create one canonical battle", async () => {
  const blocker = await integration.pool.connect();
  const creations: Promise<{ battleId: string }>[] = [];

  try {
    await blocker.query("BEGIN; LOCK TABLE battles IN SHARE MODE");
    creations.push(
      integration.runtime.runPromise(
        integration.services.battles.createBattle({
          data: { ...data, submissionId: "first" },
          userId,
        }),
      ),
    );
    const token = await waitForLock();
    await Bun.sleep(1_250);
    expect(
      await integration.runtime.runPromise(
        integration.services.redis.get(lockKey),
      ),
    ).toBe(token);
    expect(
      await integration.runtime.runPromise(
        integration.services.redisApi.send<number>("PTTL", lockKey),
      ),
    ).toBeGreaterThan(0);
    creations.push(
      integration.runtime.runPromise(
        integration.services.battles.createBattle({
          data: { ...data, submissionId: "second" },
          userId,
        }),
      ),
    );
    await Bun.sleep(100);
    expect(
      await integration.runtime.runPromise(
        integration.services.redis.get(lockKey),
      ),
    ).toBe(token);
    await blocker.query("COMMIT");
    const [first, second] = await Promise.all(creations);
    expect(second).toEqual(first);
    expect(
      (await integration.pool.query("SELECT id FROM battles")).rows,
    ).toEqual([{ id: first!.battleId }]);
    expect(
      (await integration.pool.query('SELECT "battleId" FROM battle_timelines'))
        .rows,
    ).toEqual([{ battleId: first!.battleId }]);
    expect(
      await integration.runtime.runPromise(
        integration.services.redis.get(lockKey),
      ),
    ).toBeNull();
  } finally {
    await blocker.query("ROLLBACK");
    blocker.release();
    await Promise.allSettled(creations);
  }
}, 10_000);

it("does not renew or release another owner's real Redis lock after ownership changes", async () => {
  const blocker = await integration.pool.connect();
  let creation: Promise<Exit.Exit<unknown, unknown>> | undefined;

  try {
    await blocker.query("BEGIN; LOCK TABLE battles IN SHARE MODE");
    creation = integration.runtime.runPromise(
      Effect.exit(integration.services.battles.createBattle({ data, userId })),
    );
    await waitForLock();
    await integration.runtime.runPromise(
      integration.services.redis.set(lockKey, "replacement-owner", 5),
    );
    await Bun.sleep(250);
    expect(
      await integration.runtime.runPromise(
        integration.services.redisApi.send<number>("PTTL", lockKey),
      ),
    ).toBeGreaterThan(3_000);
    await blocker.query("COMMIT");
    expect(Exit.isFailure(await creation)).toBe(true);
    expect(
      await integration.runtime.runPromise(
        integration.services.redis.get(lockKey),
      ),
    ).toBe("replacement-owner");
  } finally {
    await blocker.query("ROLLBACK");
    blocker.release();
    await creation;
  }
}, 10_000);

it("rolls back the battle and skips object upload when participant storage fails", async () => {
  await integration.pool.query(`
    CREATE FUNCTION reject_test_warrior() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Participant storage unavailable'; END;
    $$;
    CREATE TRIGGER reject_test_warrior BEFORE INSERT ON battle_warriors
    FOR EACH ROW EXECUTE FUNCTION reject_test_warrior();
  `);

  try {
    const result = await integration.runtime.runPromise(
      Effect.exit(integration.services.battles.createBattle({ data, userId })),
    );

    expect(Exit.isFailure(result)).toBe(true);
    expect(
      (await integration.pool.query("SELECT id FROM battles")).rows,
    ).toEqual([]);
    expect(
      (await integration.pool.query(`SELECT "battleId" FROM battle_warriors`))
        .rows,
    ).toEqual([]);
    expect(
      (await integration.pool.query('SELECT "battleId" FROM battle_timelines'))
        .rows,
    ).toEqual([]);
  } finally {
    await integration.pool.query(`
      DROP TRIGGER reject_test_warrior ON battle_warriors;
      DROP FUNCTION reject_test_warrior();
    `);
  }

  const retried = await integration.runtime.runPromise(
    integration.services.battles.createBattle({ data, userId }),
  );

  expect((await integration.pool.query("SELECT id FROM battles")).rows).toEqual(
    [{ id: retried.battleId }],
  );
  expect(
    (await integration.pool.query(`SELECT "battleId" FROM battle_warriors`))
      .rows,
  ).toHaveLength(2);
  expect(
    (
      await integration.pool.query(
        `SELECT "userId" FROM battle_warrior_filters`,
      )
    ).rows,
  ).toEqual([{ userId }, { userId }]);
  expect(
    (await integration.pool.query('SELECT "battleId" FROM battle_timelines'))
      .rows,
  ).toEqual([{ battleId: retried.battleId }]);
});

it("keeps HTTP submissions durable and retry-safe during concurrent catalog reads", async () => {
  const boundary = makeBattlelogTestBoundary(
    makeBattlelogOperations(
      integration.services.battles,
      integration.services.analytics,
      integration.services.metadata,
      unusedDeleteQueue,
      unusedWeaponKills,
    ),
  );

  const headers = {
    "x-auth-user-id": userId,
    "x-auth-discord-id": "discord",
    "content-type": "application/json",
  };

  const submit = () =>
    boundary.handler(
      new Request("http://battlelog.test/battles", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }),
    );

  try {
    const [submitted, ...reads] = await Promise.all([
      submit(),
      ...Array.from({ length: 20 }, (_, index) =>
        boundary.handler(
          new Request(
            `http://battlelog.test/battles/@me/warriors/search?q=${index % 2 === 0 ? "first" : "second"}`,
            { headers },
          ),
        ),
      ),
    ]);

    expect(submitted.status).toBe(201);
    expect(reads.map((response) => response.status)).toEqual(
      Array(20).fill(200),
    );
    const created = await submitted.json();
    const retried = await submit();
    expect(retried.status).toBe(201);
    expect(await retried.json()).toEqual(created);
    expect(
      (
        await integration.pool.query(
          'SELECT id FROM battles WHERE "userId" = $1',
          [userId],
        )
      ).rows,
    ).toEqual([{ id: created.battleId }]);
    expect(
      (
        await integration.pool.query(
          'SELECT "originalId", name, team, "damageDealt", "damageTaken" FROM battle_warriors WHERE "battleId" = $1 ORDER BY name',
          [created.battleId],
        )
      ).rows,
    ).toEqual([
      expect.objectContaining({
        originalId: "220",
        name: "first",
        team: 1,
        damageDealt: 10,
      }),
      expect.objectContaining({
        originalId: "7533",
        name: "second",
        team: 2,
        damageTaken: 10,
      }),
    ]);
    expect(
      (await integration.pool.query('SELECT "battleId" FROM battle_timelines'))
        .rows,
    ).toEqual([{ battleId: created.battleId }]);
  } finally {
    await boundary.dispose();
  }
});
