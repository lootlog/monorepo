import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import { eq, inArray } from "drizzle-orm";
import { Effect, ManagedRuntime } from "effect";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventKillPointTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventTable,
  guildTable,
  memberTable,
} from "../src/database/drizzle/schema.js";
import { makeEventReadCache } from "../src/events/catalog/event-read-cache.service.js";
import { makeEventEmitter } from "../src/events/event-emitter.js";
import { makeEventPointsStore } from "../src/events/kills/event-points.repository.js";
import { makeEventPoints } from "../src/events/kills/event-points.service.js";

const runtime = ManagedRuntime.make(ApiDatabaseLive);

const guildId = `event-scoring-presence-${randomUUID()}`;

const at = (clock: string) => new Date(`2026-01-15T${clock}.000Z`);

const share = (value: number) =>
  ({
    type: "NUMERIC",
    factor: "trackingDurationPercentage",
    operator: ">=",
    value,
  }) as const;

const rules: EventScoringRules = {
  version: 1,
  timezone: "Europe/Warsaw",
  hardCapPoints: 5,
  minTrackingPercentForBonuses: 50,
  rules: [
    {
      id: "half",
      conditions: [share(50)],
      action: { type: "SET_BASE", points: 0.5 },
    },
    {
      id: "full",
      conditions: [{ type: "RESPAWN_JOIN", toleranceSeconds: 300 }, share(90)],
      action: { type: "SET_BASE", points: 1 },
    },
    {
      id: "solo",
      conditions: [
        share(50),
        {
          type: "GROUP_SIZE",
          counting: "TIMELINE",
          size: { comparison: "EXACT", value: 1, to: 1 },
          minSharePercentage: 50,
          minTimePercentage: 90,
        },
      ],
      action: { type: "SET_BASE", points: 3 },
    },
  ],
};

const points = Effect.map(ApiDatabase, (db) =>
  makeEventPoints(
    makeEventPointsStore(db),
    makeEventEmitter({ publish: () => Effect.void }),
    makeEventReadCache({
      invalidateScopes: async () => {},
      getOrSetJsonEffect: (options) => options.factory,
    }),
  ),
);

beforeAll(async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;
      yield* db.insert(guildTable).values({
        id: guildId,
        name: "Scoring presence",
        ownerId: "owner",
        updatedAt: new Date(),
      });
    }),
  );
});

afterAll(async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;

      const events = yield* db
        .select({ id: eventTable.id })
        .from(eventTable)
        .where(eq(eventTable.guildId, guildId));

      if (events.length > 0)
        yield* db.delete(eventTable).where(
          inArray(
            eventTable.id,
            events.map(({ id }) => id),
          ),
        );
      yield* db.delete(memberTable).where(eq(memberTable.guildId, guildId));
      yield* db.delete(guildTable).where(eq(guildTable.id, guildId));
    }),
  );
  await runtime.dispose();
});

/**
 * Seeds one 100-minute kill (08:00–09:40) and its kill points, then runs the
 * explicit recalculation and returns each member's stored base points.
 */
const recalculate = (params: {
  assignments: Array<{ member: "solo" | "late"; from: string; to: string }>;
  pointMembers: Array<"solo" | "late">;
}) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;
      const now = new Date();
      const eventId = randomUUID();
      const mapId = randomUUID();
      const killId = randomUUID();

      const [solo, late] = yield* db
        .insert(memberTable)
        .values(
          ["solo", "late"].map((name) => ({
            guildId,
            userId: `${name}-${randomUUID()}`,
            name,
            updatedAt: now,
          })),
        )
        .returning({ id: memberTable.id });

      if (!solo || !late) throw new Error("Expected seeded members");

      const memberIds = { solo: solo.id, late: late.id };

      yield* db.insert(eventTable).values({
        id: eventId,
        guildId,
        name: "Presence scoring",
        world: "a",
        scoringMode: "ADVANCED",
        scoringRules: rules,
        updatedAt: now,
      });
      yield* db
        .insert(eventHeroNpcTable)
        .values({ id: eventId, eventId, npcName: "Kotołak" });
      yield* db.insert(eventMapTable).values({
        id: mapId,
        heroNpcId: eventId,
        mapId: 1,
        mapName: "Mapa",
        updatedAt: now,
      });
      yield* db.insert(eventHeroKillTable).values({
        id: killId,
        heroNpcId: eventId,
        killedAt: at("09:40:00"),
        minSpawnTimeAtKill: at("08:00:00"),
        maxSpawnTimeAtKill: at("10:00:00"),
      });
      yield* db.insert(eventMapAssignmentHistoryTable).values(
        params.assignments.map((assignment) => ({
          id: randomUUID(),
          mapId,
          heroNpcId: eventId,
          memberId: memberIds[assignment.member],
          assignedAt: at(assignment.from),
          unassignedAt: at(assignment.to),
        })),
      );
      yield* db.insert(eventKillPointTable).values(
        params.pointMembers.map((member) => ({
          id: randomUUID(),
          killId,
          memberId: memberIds[member],
          basePoints: 0,
          points: 0,
          timeOnMapSeconds: 0,
          afkPercentage: 0,
          wasPresent: true,
          confirmedAt: at("09:40:00"),
        })),
      );

      yield* (yield* points).recalculateEventPoints(eventId, 1);

      const rows = yield* db
        .select({
          memberId: eventKillPointTable.memberId,
          basePoints: eventKillPointTable.basePoints,
          trackingDurationPercentage:
            eventKillPointTable.trackingDurationPercentage,
        })
        .from(eventKillPointTable)
        .where(eq(eventKillPointTable.killId, killId));

      return {
        solo: rows.find((row) => row.memberId === memberIds.solo),
        late: rows.find((row) => row.memberId === memberIds.late),
      };
    }),
  );

test("explicit recalculation awards the solo base from historical presence", async () => {
  const result = await recalculate({
    assignments: [
      { member: "solo", from: "07:50:00", to: "09:40:00" },
      { member: "late", from: "09:35:00", to: "09:40:00" },
    ],
    pointMembers: ["solo", "late"],
  });

  expect(result.solo).toMatchObject({
    basePoints: 3,
    trackingDurationPercentage: 100,
  });
  expect(result.late).toMatchObject({
    basePoints: 0,
    trackingDurationPercentage: 5,
  });
});

test("recalculation does not read missing participant history as solo", async () => {
  const result = await recalculate({
    assignments: [{ member: "solo", from: "07:50:00", to: "09:40:00" }],
    pointMembers: ["solo", "late"],
  });

  expect(result.solo?.basePoints).toBe(1);
});
