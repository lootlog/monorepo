import { expect, it, mock } from "bun:test";
import { eq } from "drizzle-orm";
import { Effect, Queue } from "effect";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { RedisService } from "#src/redis/redis.service";
import { RedlockService } from "#src/redis/redlock";
import { applicationLogger } from "#src/shared/application-logger";
import { buildTimerKey } from "#src/timers/timer-key";
import { makeEventTimerStore } from "./event-timer.store.js";
import { makeEventTimersPort } from "./event-timers.port.js";

it("credits a reopened respawn window to the member who opened it", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const database = boundary.database;
    await boundary.run(
      database.insert(guildTable).values(createGuildFixture()),
    );
    await boundary.run(
      database
        .insert(memberTable)
        .values([
          createMemberFixture({ id: 1, userId: "previous", active: false }),
          createMemberFixture({ id: 2, userId: "opener" }),
        ]),
    );
    await boundary.run(
      database.insert(timerTable).values({
        guildId: "guild-1",
        world: "Aldous",
        npcId: 1,
        timerKey: buildTimerKey(1, "Hero"),
        createdById: 1,
        actorCharacterLvl: 120,
        minSpawnTime: new Date(0),
        maxSpawnTime: new Date(1000),
        updatedAt: new Date(0),
        npc: { name: "Hero" },
      }),
    );

    const redis = new RedisService(
      {
        // SAFETY: Cache invalidation only writes generation keys and ignores the reply; Redis's caller-selected A is erased at this fake transport boundary.
        send: <A>() => Effect.succeed("OK" as A),
        eval: () => () => Effect.die("unused"),
        subscribe: () => Queue.unbounded(),
      },
      {},
      Effect.runPromise,
    );

    const timers = makeEventTimersPort({
      store: makeEventTimerStore(database),
      redis,
      redlock: new RedlockService({ eval: mock().mockResolvedValue(1) }),
      logger: applicationLogger,
      amqp: { publish: () => Effect.void },
    });

    await boundary.run(
      timers.openEventRespawnTimer({
        guildId: "guild-1",
        world: "Aldous",
        npcId: 1,
        npcName: "Hero",
        npcIcon: null,
        minSpawnTime: new Date(60_000),
        maxSpawnTime: new Date(120_000),
        createdById: 2,
        isUsingSyntheticId: false,
      }),
    );

    const [timer] = await boundary.run(
      database
        .select({
          createdById: timerTable.createdById,
          actorCharacterLvl: timerTable.actorCharacterLvl,
        })
        .from(timerTable)
        .where(eq(timerTable.guildId, "guild-1")),
    );

    expect(timer).toEqual({ createdById: 2, actorCharacterLvl: null });
  } finally {
    await boundary.dispose();
  }
});
