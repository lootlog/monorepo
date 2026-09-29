import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { Queue, Worker } from "bullmq";
import { asc, eq, sql } from "drizzle-orm";
import { Effect, ManagedRuntime, Redacted, Result } from "effect";
import { TestClock } from "effect/testing";
import { MessagingError, type RabbitMessaging } from "@lootlog/messaging";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import {
  guildTable,
  memberTable,
  memberRefreshJobTable,
  reservationTable,
  timerTable,
} from "../src/database/drizzle/schema.js";
import { makeMemberBulkRefreshProcessor } from "../src/members/member-bulk-refresh.processor.js";
import { MEMBER_REFRESH_PRIORITY } from "../src/members/member-refresh-queue.js";
import { makeMemberRefreshProcessor } from "../src/members/member-refresh.processor.js";
import { makeReservationsCleanup } from "../src/reservations/reservations-cleanup.js";
import { redisUrl } from "../src/runtime/infrastructure/api-redis.js";
import { makeTimersCleanup } from "../src/timers/timers-cleanup.js";

const runtime = ManagedRuntime.make(ApiDatabaseLive);

const guildId = "background-feature-test";

const now = new Date("2026-09-04T12:00:00Z");

const cutoff = new Date("2026-08-28T12:00:00Z");

const older = new Date(cutoff.getTime() - 1);

const newer = new Date(cutoff.getTime() + 1);

describe("background feature processors against migrated PostgreSQL", () => {
  beforeEach(async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;
        yield* db.execute(
          sql`TRUNCATE TABLE "Guild", "MemberRefreshJob" RESTART IDENTITY CASCADE`,
        );
        yield* db.insert(guildTable).values({
          id: guildId,
          name: "Test",
          ownerId: "owner",
          updatedAt: now,
        });
      }),
    );
  });
  afterAll(() => runtime.dispose());

  it("cleans only reservations strictly older than retention, and respects disabling cleanup", async () => {
    const rows = await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;
        yield* db.insert(reservationTable).values(
          [older, cutoff, newer].map((endsAt, index) => ({
            guildId,
            spotId: `spot-${index}`,
            spotName: "Spot",
            authorDisplayName: "User",
            startsAt: new Date(endsAt.getTime() - 60_000),
            endsAt,
            updatedAt: now,
          })),
        );
        yield* TestClock.setTime(now.getTime());
        yield* makeReservationsCleanup(db, {
          enabled: false,
          retentionDays: 7,
        });
        const disabled = yield* db.select().from(reservationTable);
        yield* makeReservationsCleanup(db, { enabled: true, retentionDays: 7 });

        const enabled = yield* db
          .select()
          .from(reservationTable)
          .orderBy(asc(reservationTable.id));

        return { disabled, enabled };
      }).pipe(Effect.provide(TestClock.layer())),
    );

    expect(rows.disabled).toHaveLength(3);
    expect(rows.enabled.map((row) => row.endsAt)).toEqual([cutoff, newer]);
  });

  it("cleans only expired custom manual timers, preserving NPC timers and the cutoff boundary", async () => {
    const rows = await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;

        const [member] = yield* db
          .insert(memberTable)
          .values({
            guildId,
            userId: "discord-user",
            name: "User",
            updatedAt: now,
          })
          .returning();

        if (!member) return yield* Effect.die("Expected member fixture");

        const fixtures = [
          { timerKey: "manual-old", maxSpawnTime: older, margonemType: 999 },
          {
            timerKey: "manual-boundary",
            maxSpawnTime: cutoff,
            margonemType: 999,
          },
          { timerKey: "manual-new", maxSpawnTime: newer, margonemType: 999 },
          { timerKey: "npc-old", maxSpawnTime: older, margonemType: 3 },
        ];

        yield* db.insert(timerTable).values(
          fixtures.map(({ margonemType, ...fixture }, index) => ({
            ...fixture,
            guildId,
            world: "test",
            createdById: member.id,
            npcId: index + 1,
            minSpawnTime: older,
            npc: { margonemType },
            updatedAt: now,
          })),
        );
        yield* TestClock.setTime(now.getTime());
        yield* makeTimersCleanup(db, { enabled: false, retentionDays: 7 });
        const disabled = yield* db.select().from(timerTable);
        yield* makeTimersCleanup(db, { enabled: true, retentionDays: 7 });

        const enabled = yield* db
          .select()
          .from(timerTable)
          .orderBy(asc(timerTable.timerKey));

        return { disabled, enabled };
      }).pipe(Effect.provide(TestClock.layer())),
    );

    expect(rows.disabled).toHaveLength(4);
    expect(rows.enabled.map((row) => row.timerKey)).toEqual([
      "manual-boundary",
      "manual-new",
      "npc-old",
    ]);
  });

  it("persists bulk progress and publishes final refreshed, skipped and failed member identities", async () => {
    const publications: unknown[] = [];

    const rabbit: Pick<RabbitMessaging["Service"], "publish"> = {
      publish: (message) =>
        Effect.sync(() => {
          publications.push(
            JSON.parse(new TextDecoder().decode(message.content)),
          );
        }),
    };

    const rows = await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;

        const [job] = yield* db
          .insert(memberRefreshJobTable)
          .values({
            guildId,
            requestedBy: "owner",
            totalMembers: 6,
            updatedAt: now,
          })
          .returning();

        if (!job) return yield* Effect.die("Expected job fixture");

        const refresh = ({ discordId }: { discordId: string }) =>
          discordId === "failed"
            ? Effect.fail(new Error("Discord unavailable"))
            : Effect.succeed(
                discordId === "missing"
                  ? null
                  : { refreshQueued: discordId === "queued" },
              );

        yield* makeMemberBulkRefreshProcessor(
          db,
          rabbit,
          refresh,
        )({
          data: {
            jobId: job.id,
            guildId,
            memberIds: [
              "first",
              "missing",
              "failed",
              "queued",
              "second",
              "third",
            ],
          },
        });

        return yield* db
          .select()
          .from(memberRefreshJobTable)
          .where(eq(memberRefreshJobTable.id, job.id));
      }),
    );

    expect(rows).toMatchObject([
      {
        status: "COMPLETED",
        totalMembers: 6,
        processedMembers: 5,
        failedMembers: 1,
        completedAt: expect.any(Date),
      },
    ]);
    expect(publications).toMatchObject([
      { guildId, status: "PROCESSING", processedMembers: 0 },
      { guildId, status: "PROCESSING", processedMembers: 5, failedMembers: 1 },
      {
        guildId,
        status: "COMPLETED",
        processedMembers: 5,
        failedMembers: 1,
        refreshedIds: ["first", "second", "third"],
        skippedIds: ["missing", "queued"],
        failedIds: ["failed"],
      },
    ]);
  });

  it("keeps a member refresh queued while another guild job holds the user lock, without spending an attempt", async () => {
    const connection = {
      url: redisUrl({
        username: process.env.REDIS_USERNAME ?? "",
        password: Redacted.make(process.env.REDIS_PASSWORD ?? ""),
        host: process.env.REDIS_HOST ?? "localhost",
        port: Number(process.env.REDIS_PORT),
      }),
    };

    const queueName = `member-refresh-${crypto.randomUUID()}`;
    const queue = new Queue(queueName, { connection, prefix: "{bull}" });
    let lockOwner: string | null = "job:other-guild";
    const outcomes: string[] = [];
    const synced: string[] = [];

    const processRefresh = makeMemberRefreshProcessor({
      scheduler: {
        acquireUserRefreshLock: (_userId, owner) =>
          Effect.sync(() => {
            if (lockOwner) return false;
            lockOwner = owner;

            return true;
          }),
        getNextRefreshAt: () => Effect.succeed(null),
        extendUserRefreshLock: () => Effect.void,
        releaseUserRefreshLock: (_userId, owner) =>
          Effect.sync(() => {
            if (lockOwner === owner) lockOwner = null;
          }),
      },
      diagnostics: {
        recordMemberRefreshMetric: async ({ outcome }) => {
          outcomes.push(outcome);
        },
        recordMemberRefreshLatency: async () => {},
      },
      sync: {
        syncMemberFromDiscord: ({ guildId: syncedGuildId }) =>
          Effect.sync(() => {
            synced.push(syncedGuildId);

            return { member: null, status: "SUCCESS", nextRefreshAt: null };
          }),
      },
    });

    const worker = new Worker(
      queueName,
      (job, token) => Effect.runPromise(processRefresh(job, token)),
      { connection, prefix: "{bull}" },
    );

    const failures: unknown[] = [];
    worker.on("failed", (_job, error) => failures.push(error));

    const completed = new Promise((resolve) =>
      worker.once("completed", resolve),
    );

    try {
      // One attempt: a contended job that spent it would end in failed.
      const job = await queue.add(
        "member-refresh",
        {
          userId: "user-1",
          discordId: "discord-1",
          guildId: "guild-2",
          reason: "guild-access-background",
        },
        { priority: MEMBER_REFRESH_PRIORITY.BACKGROUND, attempts: 1 },
      );

      let state = await job.getState();

      while (!["delayed", "failed", "completed"].includes(state)) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        state = await job.getState();
      }

      expect(state).toBe("delayed");
      lockOwner = null;
      await completed;

      const finished = await queue.getJob(job.id ?? "");
      expect(await finished?.getState()).toBe("completed");
      expect(finished?.opts.priority).toBe(MEMBER_REFRESH_PRIORITY.BACKGROUND);
    } finally {
      await worker.close();
      await queue.obliterate({ force: true });
      await queue.close();
    }

    expect(failures).toEqual([]);
    expect(synced).toEqual(["guild-2"]);
    expect(outcomes).toContain("delayed");
    expect(outcomes).toContain("processed");
    expect(outcomes).not.toContain("failed");
  }, 15_000);

  it("marks failed bulk work in the database and keeps the failure observable to the worker", async () => {
    const failure = new MessagingError({
      operation: "publish",
      message: "Rabbit unavailable",
      cause: new Error("Rabbit unavailable"),
    });

    let publications = 0;

    const rabbit: Pick<RabbitMessaging["Service"], "publish"> = {
      publish: () =>
        ++publications === 1 ? Effect.fail(failure) : Effect.void,
    };

    const { rows, result } = await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;

        const [job] = yield* db
          .insert(memberRefreshJobTable)
          .values({
            guildId,
            requestedBy: "owner",
            totalMembers: 1,
            updatedAt: now,
          })
          .returning();

        if (!job) return yield* Effect.die("Expected job fixture");

        const process = makeMemberBulkRefreshProcessor(db, rabbit, () =>
          Effect.die("Must not refresh before initial state publication"),
        );

        const result = yield* Effect.result(
          process({ data: { jobId: job.id, guildId, memberIds: ["first"] } }),
        );

        const rows = yield* db
          .select()
          .from(memberRefreshJobTable)
          .where(eq(memberRefreshJobTable.id, job.id));

        return { rows, result };
      }),
    );

    expect(Result.isFailure(result)).toBe(true);
    expect(result).toMatchObject({ failure });
    expect(rows).toMatchObject([
      { status: "FAILED", processedMembers: 0, completedAt: expect.any(Date) },
    ]);
    expect(publications).toBe(2);
  });
});
