import { afterEach, beforeEach, expect, it, mock } from "bun:test";
import { eq } from "drizzle-orm";
import { Effect, Queue } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { makeEventTimerStore } from "#src/events/respawn/event-timer.store";
import { makeEventTimersPort } from "#src/events/respawn/event-timers.port";
import { RedisService } from "#src/redis/redis.service";
import { RedlockService } from "#src/redis/redlock";
import { applicationLogger } from "#src/shared/application-logger";
import { makeManualTimer } from "./timer-manual.data-layer.js";
import { makeResetTimer } from "./timer-reset.data-layer.js";
import type { TimersGuildAccess } from "./timers.handlers.js";

const MINUTE_MS = 60_000;

let boundary: Awaited<ReturnType<typeof createDatabaseBoundary>>;

const guild = createGuildFixture();

const member = createMemberFixture();

const access: TimersGuildAccess = {
  guild,
  userId: member.userId,
  discordId: member.userId,
  roles: [],
  accessPolicy: createAccessPolicy({ capabilities: [Permission.ADMIN] }),
};

const ports = {
  invalidateList: () => Effect.void,
  publish: () => Effect.void,
};

beforeEach(async () => {
  boundary = await createDatabaseBoundary();
  await boundary.run(boundary.database.insert(guildTable).values(guild));
  await boundary.run(boundary.database.insert(memberTable).values(member));
});

afterEach(() => boundary.dispose());

const readTimer = async () => {
  const [timer] = await boundary.run(
    boundary.database
      .select()
      .from(timerTable)
      .where(eq(timerTable.guildId, guild.id)),
  );

  if (!timer) throw new Error("Timer missing");

  return timer;
};

/** The reset window as minutes from the reset. */
const resetWindowMinutes = async () => {
  const { timerKey, world } = await readTimer();
  await boundary.run(
    makeResetTimer(boundary.database, {
      ...ports,
      withLock: (_key, operation) => operation,
    })(access, timerKey, { world }),
  );
  const reset = await readTimer();
  const resetAt = reset.updatedAt.getTime();

  return [
    (reset.minSpawnTime.getTime() - resetAt) / MINUTE_MS,
    (reset.maxSpawnTime.getTime() - resetAt) / MINUTE_MS,
  ];
};

it("resets a manual timer entered as durations to the same durations", async () => {
  await boundary.run(
    makeManualTimer(boundary.database, ports)(access, {
      name: "Kocioł",
      world: "Aldous",
      minSeconds: 60 * 60,
      maxSeconds: 90 * 60,
    }),
  );

  expect(await resetWindowMinutes()).toEqual([60, 90]);
});

it("resets a manual timer entered as dates to the window as entered", async () => {
  const now = Date.now();
  await boundary.run(
    makeManualTimer(boundary.database, ports)(access, {
      name: "Kocioł",
      world: "Aldous",
      customMinSpawnTime: new Date(now + 60 * MINUTE_MS).toISOString(),
      customMaxSpawnTime: new Date(now + 180 * MINUTE_MS).toISOString(),
    }),
  );

  const [min, max] = await resetWindowMinutes();

  expect(min).toBeCloseTo(60, 0);
  expect(max).toBeCloseTo(180, 0);
});

it("resets an event respawn timer to the window the event opened", async () => {
  const timers = makeEventTimersPort({
    store: makeEventTimerStore(boundary.database),
    redis: new RedisService(
      {
        // SAFETY: Cache invalidation only writes generation keys and ignores the reply; Redis's caller-selected A is erased at this fake transport boundary.
        send: <A>() => Effect.succeed("OK" as A),
        eval: () => () => Effect.die("unused"),
        subscribe: () => Queue.unbounded(),
      },
      {},
      Effect.runPromise,
    ),
    redlock: new RedlockService({ eval: mock().mockResolvedValue(1) }),
    logger: applicationLogger,
    amqp: { publish: () => Effect.void },
  });

  const now = Date.now();

  // No event is active any more, so the window may be reset.
  await boundary.run(
    timers.openEventRespawnTimer({
      guildId: guild.id,
      world: "Aldous",
      npcId: 1,
      npcName: "Mroczny Patryk",
      npcIcon: null,
      minSpawnTime: new Date(now + 30 * MINUTE_MS),
      maxSpawnTime: new Date(now + 120 * MINUTE_MS),
      createdById: member.id,
      isUsingSyntheticId: false,
    }),
  );

  const [min, max] = await resetWindowMinutes();

  expect(min).toBeCloseTo(30, 0);
  expect(max).toBeCloseTo(120, 0);
});
