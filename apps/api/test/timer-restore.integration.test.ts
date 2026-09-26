import { afterAll, beforeAll, expect, it } from "bun:test";
import { Client } from "pg";
import { and, desc, eq } from "drizzle-orm";
import { Effect, ManagedRuntime, Result, Schema } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { makeDeleteTimer } from "#src/http-api/handlers/timers/timer-delete.data-layer";
import { makeRestoreTimer } from "#src/http-api/handlers/timers/timer-restore.data-layer";
import { makeResetTimer } from "#src/http-api/handlers/timers/timer-reset.data-layer";
import { requireIsolatedTestDatabase } from "./isolated-test-database.js";
import { createGuildFixture } from "./organization-fixtures.js";

const client = new Client({ connectionString: requireIsolatedTestDatabase() });

const runtime = ManagedRuntime.make(ApiDatabaseLive);

let database: typeof ApiDatabase.Service;

const waitForTimerLocks = async (expected: number) => {
  let blocked = 0;
  const deadline = Date.now() + 5000;

  while (blocked < expected && Date.now() < deadline) {
    const result =
      await client.query(`SELECT count(*)::int AS count FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid()
        AND wait_event_type = 'Lock' AND query LIKE '%"Timer"%'`);

    blocked =
      Schema.decodeUnknownSync(
        Schema.Array(Schema.Struct({ count: Schema.Number })),
      )(result.rows)[0]?.count ?? 0;

    if (blocked < expected) await Bun.sleep(10);
  }

  return blocked;
};

beforeAll(async () => {
  database = await runtime.runPromise(ApiDatabase);
  await client.connect();
  // Hold restores after their initial read so the competing write wins first.
  await client.query(`CREATE FUNCTION pause_timer_restore() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.world = 'timer-restore-race' THEN
        PERFORM pg_advisory_xact_lock(882311);
      END IF;
      RETURN NEW;
    END $$`);
  await client.query(`CREATE TRIGGER pause_timer_restore BEFORE INSERT ON "Timer"
    FOR EACH ROW EXECUTE FUNCTION pause_timer_restore()`);
});

afterAll(async () => {
  try {
    await client.query('DROP TRIGGER IF EXISTS pause_timer_restore ON "Timer"');
    await client.query("DROP FUNCTION IF EXISTS pause_timer_restore()");
  } finally {
    await client.end();
    await runtime.dispose();
  }
});

it.each(["restore", "new spawn"] as const)(
  "does not overwrite a concurrent %s with the deleted timer snapshot",
  async (competingWrite) => {
    const now = new Date();
    const guild = createGuildFixture({ id: crypto.randomUUID() });
    await runtime.runPromise(database.insert(guildTable).values(guild));

    const [member] = await runtime.runPromise(
      database
        .insert(memberTable)
        .values({
          guildId: guild.id,
          userId: crypto.randomUUID(),
          name: "Restorer",
          updatedAt: now,
        })
        .returning(),
    );

    if (!member) throw new Error("Member fixture missing");

    const timer = {
      guildId: guild.id,
      world: "timer-restore-race",
      timerKey: "300:hero",
      npcId: 300,
      npc: { id: 300, name: "Hero", lvl: 300, type: "HERO" },
      createdById: member.id,
      minSpawnTime: now,
      maxSpawnTime: new Date(now.getTime() + 60_000),
      latestRespBaseSeconds: 60,
      latestRespawnRandomness: 10,
      updatedAt: now,
    };

    const scope = and(
      eq(timerTable.guildId, timer.guildId),
      eq(timerTable.world, timer.world),
      eq(timerTable.timerKey, timer.timerKey),
    );

    await runtime.runPromise(database.insert(timerTable).values(timer));

    const access = {
      guild,
      userId: member.userId,
      discordId: member.userId,
      roles: [],
      accessPolicy: createAccessPolicy({ capabilities: [Permission.ADMIN] }),
    };

    const publications: string[] = [];

    const ports = {
      invalidateList: () => Effect.void,
      publish: (key: string) =>
        Effect.sync(() => {
          publications.push(key);
        }),
    };

    await runtime.runPromise(
      makeDeleteTimer(database, ports)(access, timer.timerKey, timer.world),
    );
    publications.length = 0;

    const [deletion] = await runtime.runPromise(
      database
        .select()
        .from(timerHistoryEntryTable)
        .where(eq(timerHistoryEntryTable.guildId, guild.id)),
    );

    if (!deletion) throw new Error("Deletion fixture missing");

    const restore = makeRestoreTimer(database, ports);
    const restoreCount = competingWrite === "restore" ? 2 : 1;

    const newSpawnWindow = {
      minSpawnTime: new Date(now.getTime() + 120_000),
      maxSpawnTime: new Date(now.getTime() + 180_000),
      deletedAt: null,
    };

    await client.query("SELECT pg_advisory_lock(882311)");

    const pending = Array.from({ length: restoreCount }, () =>
      runtime.runPromise(restore(access, deletion.id).pipe(Effect.result)),
    );

    let blocked = 0;

    try {
      blocked = await waitForTimerLocks(restoreCount);

      if (competingWrite === "new spawn") {
        await runtime.runPromise(
          database.update(timerTable).set(newSpawnWindow).where(scope),
        );
      }
    } finally {
      await client.query("SELECT pg_advisory_unlock(882311)");
    }

    const results = await Promise.all(pending);
    expect(blocked).toBe(restoreCount);
    expect(results.filter(Result.isFailure)).toMatchObject([
      {
        failure: { kind: "conflict", response: { message: "EXISTING_TIMER" } },
      },
    ]);
    const successfulRestores = competingWrite === "restore" ? 1 : 0;
    expect(results.filter(Result.isSuccess)).toHaveLength(successfulRestores);

    const [persisted] = await runtime.runPromise(
      database.select().from(timerTable).where(scope),
    );

    expect(persisted).toMatchObject(
      competingWrite === "restore"
        ? {
            minSpawnTime: timer.minSpawnTime,
            maxSpawnTime: timer.maxSpawnTime,
            deletedAt: null,
          }
        : newSpawnWindow,
    );

    const restorationHistory = await runtime.runPromise(
      database
        .select()
        .from(timerHistoryEntryTable)
        .where(
          and(
            eq(timerHistoryEntryTable.guildId, guild.id),
            eq(timerHistoryEntryTable.action, "RESTORE"),
          ),
        ),
    );

    expect(restorationHistory).toHaveLength(successfulRestores);
    expect(publications).toHaveLength(successfulRestores * 2);
  },
  10_000,
);

it.each(["rollback", "new spawn", "identical reset", "delete"] as const)(
  "serializes reset rollback against a concurrent %s",
  async (competingWrite) => {
    const now = new Date();
    const guild = createGuildFixture({ id: crypto.randomUUID() });
    await runtime.runPromise(database.insert(guildTable).values(guild));

    const [member] = await runtime.runPromise(
      database
        .insert(memberTable)
        .values({
          guildId: guild.id,
          userId: crypto.randomUUID(),
          name: "Restorer",
          updatedAt: now,
        })
        .returning(),
    );

    if (!member) throw new Error("Member fixture missing");

    const original = {
      guildId: guild.id,
      world: "timer-reset-rollback-race",
      timerKey: "300:hero",
      npcId: 300,
      npc: { id: 300, name: "Hero", lvl: 300, type: "HERO" },
      createdById: member.id,
      minSpawnTime: new Date(now.getTime() - 120_000),
      maxSpawnTime: new Date(now.getTime() - 60_000),
      latestRespBaseSeconds: 60,
      latestRespawnRandomness: 10,
      wasReset: false,
      updatedAt: now,
    };

    const scope = and(
      eq(timerTable.guildId, guild.id),
      eq(timerTable.world, original.world),
      eq(timerTable.timerKey, original.timerKey),
    );

    await runtime.runPromise(database.insert(timerTable).values(original));
    await runtime.runPromise(
      database.insert(timerHistoryEntryTable).values({
        ...original,
        action: "CREATE",
        actorMemberId: member.id,
        timerCreatedById: member.id,
        createdAt: new Date(now.getTime() - 180_000),
      }),
    );

    const access = {
      guild,
      userId: member.userId,
      discordId: member.userId,
      roles: [],
      accessPolicy: createAccessPolicy({ capabilities: [Permission.ADMIN] }),
    };

    const publications: string[] = [];

    const ports = {
      invalidateList: () => Effect.void,
      publish: (key: string) =>
        Effect.sync(() => {
          publications.push(key);
        }),
    };

    const reset = makeResetTimer(database, {
      ...ports,
      withLock: (_key, operation) => operation,
    });

    await runtime.runPromise(
      reset(access, original.timerKey, { world: original.world }),
    );
    publications.length = 0;

    const [resetEntry] = await runtime.runPromise(
      database
        .select()
        .from(timerHistoryEntryTable)
        .where(eq(timerHistoryEntryTable.guildId, guild.id))
        .orderBy(desc(timerHistoryEntryTable.id))
        .limit(1),
    );

    if (!resetEntry) throw new Error("Reset history fixture missing");

    const [resetTimer] = await runtime.runPromise(
      database.select().from(timerTable).where(scope),
    );

    if (!resetTimer) throw new Error("Reset timer fixture missing");

    const newSpawnWindow = {
      minSpawnTime: new Date(now.getTime() + 300_000),
      maxSpawnTime: new Date(now.getTime() + 360_000),
      wasReset: false,
    };

    const release = Promise.withResolvers<void>();
    const locked = Promise.withResolvers<void>();

    const competing = runtime.runPromise(
      database.transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction
            .select()
            .from(timerTable)
            .where(scope)
            .for("update");

          if (
            competingWrite === "new spawn" ||
            competingWrite === "identical reset"
          ) {
            const window =
              competingWrite === "new spawn" ? newSpawnWindow : resetTimer;

            yield* transaction
              .update(timerTable)
              .set({
                minSpawnTime: window.minSpawnTime,
                maxSpawnTime: window.maxSpawnTime,
                wasReset: window.wasReset,
              })
              .where(scope);
            const { id: _id, ...snapshot } = resetEntry;
            yield* transaction.insert(timerHistoryEntryTable).values({
              ...snapshot,
              action: competingWrite === "new spawn" ? "CREATE" : "RESET",
              createdAt: new Date(resetEntry.createdAt.getTime() - 60_000),
              minSpawnTime: window.minSpawnTime,
              maxSpawnTime: window.maxSpawnTime,
              wasReset: window.wasReset,
            });
          }

          locked.resolve();
          yield* Effect.promise(() => release.promise);
        }),
      ),
    );

    await Promise.race([locked.promise, competing]);
    const count = competingWrite === "rollback" ? 2 : 1;
    const restore = makeRestoreTimer(database, ports);

    const pending = Array.from({ length: count }, () =>
      runtime.runPromise(restore(access, resetEntry.id).pipe(Effect.result)),
    );

    let blocked = 0;
    let deletion: Promise<void> | undefined;

    try {
      blocked = await waitForTimerLocks(count);

      if (competingWrite === "delete") {
        deletion = runtime.runPromise(
          makeDeleteTimer(database, ports)(
            access,
            original.timerKey,
            original.world,
          ),
        );
        expect(await waitForTimerLocks(2)).toBe(2);
      }
    } finally {
      release.resolve();
      await competing;
    }

    const results = await Promise.all(pending);
    expect(blocked).toBe(count);

    if (deletion) {
      await deletion;
      expect(results.filter(Result.isSuccess)).toHaveLength(1);

      const [deleted] = await runtime.runPromise(
        database
          .select()
          .from(timerHistoryEntryTable)
          .where(
            and(
              eq(timerHistoryEntryTable.guildId, guild.id),
              eq(timerHistoryEntryTable.action, "DELETE"),
            ),
          ),
      );

      expect(deleted).toMatchObject({
        minSpawnTime: original.minSpawnTime,
        maxSpawnTime: original.maxSpawnTime,
        wasReset: false,
      });

      if (!deleted) throw new Error("Deletion history missing");
      const recovered = await runtime.runPromise(restore(access, deleted.id));
      expect(recovered).toMatchObject({
        minSpawnTime: original.minSpawnTime,
        maxSpawnTime: original.maxSpawnTime,
        wasReset: false,
        deletedAt: null,
      });
      expect(publications).toHaveLength(6);

      return;
    }

    const successes = competingWrite === "rollback" ? 1 : 0;
    expect(results.filter(Result.isSuccess)).toHaveLength(successes);
    expect(results.filter(Result.isFailure)).toMatchObject([
      { failure: { kind: "conflict" } },
    ]);

    const [persisted] = await runtime.runPromise(
      database.select().from(timerTable).where(scope),
    );

    let expected = {
      minSpawnTime: resetTimer.minSpawnTime,
      maxSpawnTime: resetTimer.maxSpawnTime,
      wasReset: resetTimer.wasReset,
    };

    if (competingWrite === "new spawn") expected = newSpawnWindow;

    if (competingWrite === "rollback") expected = original;
    expect(persisted).toMatchObject({
      minSpawnTime: expected.minSpawnTime,
      maxSpawnTime: expected.maxSpawnTime,
      wasReset: expected.wasReset,
    });

    const history = await runtime.runPromise(
      database
        .select()
        .from(timerHistoryEntryTable)
        .where(
          and(
            eq(timerHistoryEntryTable.guildId, guild.id),
            eq(timerHistoryEntryTable.action, "RESTORE"),
          ),
        ),
    );

    expect(history).toHaveLength(successes);
    expect(publications).toHaveLength(successes * 2);
  },
  10_000,
);
