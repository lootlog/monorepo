import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "../src/database/drizzle/database.js";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventRankingTable,
  eventTable,
} from "../src/database/drizzle/event.schema.js";
import { memberTable } from "../src/database/drizzle/organization.schema.js";
import { makeEventPointsStore } from "../src/events/kills/event-points.repository.js";
import { makeKillRankingFixture } from "./kill-rankings-fixtures.js";

const { runtime, guildId, memberIds, seed, cleanup } = makeKillRankingFixture();

beforeAll(seed);

afterAll(cleanup);

test("event rankings accumulate concurrent kills and count a retried kill once", async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;
      const store = makeEventPointsStore(db);
      const eventId = crypto.randomUUID();
      const heroNpcName = "Kotołak";

      const [firstKill, secondKill, retriedKill] = [
        crypto.randomUUID(),
        crypto.randomUUID(),
        crypto.randomUUID(),
      ];

      const now = new Date();

      const others = yield* db
        .insert(memberTable)
        .values(
          Array.from({ length: 18 }, (_, index) => ({
            guildId,
            userId: `crew-${index}`,
            name: `crew-${index}`,
            updatedAt: now,
          })),
        )
        .returning({ id: memberTable.id });

      const crew = [
        memberIds.first,
        memberIds.second,
        ...others.map(({ id }) => id),
      ];

      yield* db.insert(eventTable).values({
        id: eventId,
        guildId,
        name: "Ranking event",
        world: "a",
        updatedAt: now,
      });
      yield* db
        .insert(eventHeroNpcTable)
        .values({ id: eventId, eventId, npcName: heroNpcName });
      yield* db.insert(eventHeroKillTable).values(
        [firstKill, secondKill, retriedKill].map((id) => ({
          id,
          heroNpcId: eventId,
          minSpawnTimeAtKill: now,
          maxSpawnTimeAtKill: now,
        })),
      );
      yield* db.insert(eventRankingTable).values({
        id: crypto.randomUUID(),
        eventId,
        memberId: memberIds.first,
        heroNpcName,
        totalPoints: 15,
        manualAdjustmentPoints: 5,
        totalKills: 1,
        totalTimeSeconds: 60,
        avgAfkPercentage: 10,
        pointsModified: true,
        updatedAt: now,
      });

      const entry = (
        memberId: number,
        points: number,
        afkPercentage: number,
        pointsModified = false,
      ) => ({
        memberId,
        points,
        trackingSeconds: 30,
        afkPercentage,
        pointsModified,
      });

      const applied = yield* Effect.all(
        [
          store.addKillToRankings(
            eventId,
            firstKill,
            crew.map((memberId) => entry(memberId, 1, 40)),
          ),
          store.addKillToRankings(
            eventId,
            secondKill,
            crew
              .map((memberId) =>
                entry(memberId, 2, 20, memberId === memberIds.second),
              )
              .reverse(),
          ),
        ],
        { concurrency: "unbounded" },
      );

      expect(applied).toEqual([true, true]);

      const failedAttempt = yield* Effect.exit(
        store.addKillToRankings(eventId, retriedKill, [
          entry(2_147_483_647, 100, 100),
          entry(memberIds.second, 100, 100),
        ]),
      );

      expect(failedAttempt._tag).toBe("Failure");
      expect(
        yield* store.addKillToRankings(eventId, retriedKill, [
          entry(memberIds.second, 1, 0),
        ]),
      ).toBe(true);

      const rankings = yield* db
        .select({
          memberId: eventRankingTable.memberId,
          totalPoints: eventRankingTable.totalPoints,
          manualAdjustmentPoints: eventRankingTable.manualAdjustmentPoints,
          totalKills: eventRankingTable.totalKills,
          totalTimeSeconds: eventRankingTable.totalTimeSeconds,
          avgAfkPercentage: eventRankingTable.avgAfkPercentage,
          pointsModified: eventRankingTable.pointsModified,
        })
        .from(eventRankingTable)
        .where(eq(eventRankingTable.eventId, eventId));

      expect(
        rankings.toSorted((left, right) => left.memberId - right.memberId),
      ).toEqual(
        crew
          .toSorted((left, right) => left - right)
          .map((memberId) => {
            if (memberId === memberIds.first)
              return {
                memberId,
                totalPoints: 18,
                manualAdjustmentPoints: 5,
                totalKills: 3,
                totalTimeSeconds: 120,
                avgAfkPercentage: 23.33,
                pointsModified: true,
              };

            if (memberId === memberIds.second)
              return {
                memberId,
                totalPoints: 4,
                manualAdjustmentPoints: 0,
                totalKills: 3,
                totalTimeSeconds: 90,
                avgAfkPercentage: 20,
                pointsModified: true,
              };

            return {
              memberId,
              totalPoints: 3,
              manualAdjustmentPoints: 0,
              totalKills: 2,
              totalTimeSeconds: 60,
              avgAfkPercentage: 30,
              pointsModified: false,
            };
          }),
      );
    }),
  );
});
