import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { asc, eq, sql } from "drizzle-orm";
import { Effect, ManagedRuntime } from "effect";
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
import { makeReservationsCleanup } from "../src/reservations/reservations-cleanup.js";
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
    expect(result).toMatchObject({ _tag: "Failure", failure });
    expect(rows).toMatchObject([
      { status: "FAILED", processedMembers: 0, completedAt: expect.any(Date) },
    ]);
    expect(publications).toBe(2);
  });
});
