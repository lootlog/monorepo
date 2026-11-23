import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  eventHeroKillTable,
  eventKillPointTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventPresenceLogTable,
  eventRankingTable,
  eventRespawnWindowSummaryTable,
} from "#src/database/drizzle/event.schema";
import { makeEventPointEdits } from "#src/events/kills/event-point-edits";
import {
  context,
  fixture,
  orderedIds,
  time,
} from "./event-kill-history.fixtures.js";

describe("kill history points and presence", () => {
  it("clips presence windows and rounds short sessions only after aggregation", async () => {
    const f = await fixture();
    const start = time("10:00");

    const at = (milliseconds: number) =>
      new Date(start.getTime() + milliseconds);

    try {
      await f.run(
        Effect.gen(function* () {
          yield* f.database.insert(eventMapTable).values({
            id: "map",
            heroNpcId: "low",
            mapId: 1,
            mapName: "Map",
            updatedAt: time("00:00"),
          });
          yield* f.database.insert(eventPresenceLogTable).values(
            [
              { id: "crosses-start", start: -1000, end: 400, isAfk: false },
              { id: "short-session", start: 700, end: 1100, isAfk: false },
              { id: "open-afk", start: 1600, end: null, isAfk: true },
              { id: "after-window", start: 3000, end: 4000, isAfk: false },
            ].map((log) => ({
              id: log.id,
              mapId: "map",
              memberId: 1,
              isAfk: log.isAfk,
              startedAt: at(log.start),
              endedAt: log.end === null ? null : at(log.end),
            })),
          );
          yield* f.database.insert(eventPresenceLogTable).values({
            id: "crosses-end",
            mapId: "map",
            memberId: 2,
            isAfk: true,
            startedAt: at(1500),
            endedAt: at(3000),
          });
        }),
      );

      for (const since of [start, undefined]) {
        const presenceTimeSeconds = since ? 1 : 2;
        const afkPercentage = since ? 33.33 : 18.18;

        expect(
          await f.run(
            f.points.getMembersPresenceStats("low", [1, 2], since, at(2000)),
          ),
        ).toEqual([
          {
            memberId: 1,
            timeOnMapSeconds: presenceTimeSeconds,
            afkPercentage,
            wasPresent: true,
            mapName: "Map",
          },
          {
            memberId: 2,
            timeOnMapSeconds: 1,
            afkPercentage: 100,
            wasPresent: true,
            mapName: "Map",
          },
        ]);

        const members = await f.run(
          f.points.getMembersPresenceStatsPerMap(
            ["map"],
            [1, 2],
            since,
            at(2000),
          ),
        );

        expect(
          members.toSorted((left, right) => left.memberId - right.memberId),
        ).toEqual([
          { memberId: 1, mapId: "map", presenceTimeSeconds, afkTimeSeconds: 0 },
          {
            memberId: 2,
            mapId: "map",
            presenceTimeSeconds: 1,
            afkTimeSeconds: 1,
          },
        ]);
      }
    } finally {
      await f.dispose();
    }
  });

  it("refreshes cached member points and publishes edits excluded from ranking", async () => {
    const f = await fixture();

    try {
      await f.run(
        f.database
          .update(eventKillPointTable)
          .set({ confirmationDeadlineAt: time("11:00"), confirmedAt: null })
          .where(eq(eventKillPointTable.id, "point-0")),
      );
      await f.run(
        f.database.insert(eventRankingTable).values({
          id: "ranking-2",
          eventId: "event-1",
          memberId: 2,
          heroNpcName: "Low",
          totalPoints: 100,
          updatedAt: time("00:00"),
        }),
      );

      const before = await f.run(
        f.history.list(context(), { memberId: 2, limit: 1 }),
      );

      expect(before).toMatchObject({
        kind: "member",
        items: [{ id: orderedIds[0], memberPoint: { points: 7.25 } }],
      });

      const published: {
        routingKey: string;
        payload: { guildId: string; eventId: string };
      }[] = [];

      const edits = makeEventPointEdits(f.database, f.redis, {
        publish: (routingKey, payload) =>
          Effect.sync(() => {
            published.push({ routingKey, payload });
          }),
      });

      const updated = await f.run(
        edits.updateKillPoint(
          { id: "guild-1" },
          "event-1",
          orderedIds[0],
          "point-0",
          { pointsDelta: 3 },
          "user-1",
        ),
      );

      expect(updated?.points).toBe(10.25);
      expect(
        await f.run(f.history.list(context(), { memberId: 2, limit: 1 })),
      ).toMatchObject({
        kind: "member",
        items: [
          {
            id: orderedIds[0],
            memberPoint: { points: 10.25, manualAdjustmentPoints: 5 },
          },
        ],
      });
      expect(published).toEqual([
        {
          routingKey: RabbitRoutingKey.EVENT_RANKING_UPDATE,
          payload: { guildId: "guild-1", eventId: "event-1" },
        },
      ]);
      expect(
        await f.run(f.database.select().from(eventRankingTable)),
      ).toMatchObject([
        { id: "ranking-2", totalPoints: 100, pointsModified: false },
      ]);
    } finally {
      await f.dispose();
    }
  });

  it("keeps historical points and map snapshots while clipping fallback presence at respawn end", async () => {
    const f = await fixture();

    try {
      const killId = orderedIds[0];
      await f.run(
        Effect.gen(function* () {
          yield* f.database
            .update(eventHeroKillTable)
            .set({
              killedAt: time("12:30"),
              minSpawnTimeAtKill: time("10:00"),
              maxSpawnTimeAtKill: time("12:00"),
              isManualClose: true,
            })
            .where(eq(eventHeroKillTable.id, killId));
          yield* f.database.insert(eventMapTable).values({
            id: "map",
            heroNpcId: "low",
            mapId: 1,
            mapName: "Map",
            updatedAt: time("00:00"),
          });
          yield* f.database.insert(eventMapAssignmentHistoryTable).values(
            [1, 2].map((memberId) => ({
              id: `assignment-${memberId}`,
              mapId: "map",
              heroNpcId: "low",
              memberId,
              assignedAt: time("09:00"),
              unassignedAt: time("12:30"),
            })),
          );
          yield* f.database.insert(eventPresenceLogTable).values(
            [1, 2].map((memberId) => ({
              id: `presence-${memberId}`,
              mapId: "map",
              memberId,
              isAfk: false,
              startedAt: time("11:00"),
              endedAt: time("12:30"),
            })),
          );
          yield* f.database
            .update(eventKillPointTable)
            .set({
              mapPresenceData: [
                {
                  mapId: "map",
                  mapName: "Original map",
                  presenceTimeSeconds: 123,
                  afkTimeSeconds: 12,
                },
              ],
            })
            .where(
              and(
                eq(eventKillPointTable.killId, killId),
                eq(eventKillPointTable.memberId, 1),
              ),
            );
          yield* f.database.insert(eventRespawnWindowSummaryTable).values({
            id: "summary",
            heroNpcId: "low",
            killId,
            windowOpenedAt: time("09:00"),
            windowClosedAt: time("12:30"),
            minSpawnTime: time("10:00"),
            maxSpawnTime: time("12:00"),
            wasManualClose: true,
            totalWindowSeconds: 7200,
            totalCoverageSeconds: 3600,
            totalUncoveredSeconds: 0,
            totalUnassignedSeconds: 3600,
            coveragePercentage: 50,
            memberStats: [],
            mapStats: [],
            gapsTimeline: [
              {
                mapId: "map",
                mapName: "Snapshot map",
                gapType: "UNASSIGNED",
                startedAt: time("09:00").toISOString(),
                endedAt: time("10:00").toISOString(),
                durationSeconds: 3600,
              },
            ],
          });
        }),
      );

      const detail = await f.run(
        f.history.detail(context(), { heroId: "low", killId }),
      );

      expect(detail.kill).toMatchObject({
        respawnDurationSeconds: 7200,
        windowDurationSeconds: 7200,
        resolvedAfterMaxSpawnTimeMs: 1800000,
      });
      expect(
        detail.kill.points.find((point) => point.memberId === 1),
      ).toMatchObject({
        points: 7.25,
        basePoints: 1,
        manualAdjustmentPoints: 2,
        trackingDurationSeconds: 240,
        mapData: [
          {
            assignmentDurationSeconds: 7200,
            presenceTimeSeconds: 123,
            afkTimeSeconds: 12,
          },
        ],
      });
      expect(
        detail.kill.points.find((point) => point.memberId === 2),
      ).toMatchObject({
        points: 7.25,
        mapData: [
          {
            assignmentDurationSeconds: 7200,
            presenceTimeSeconds: 3600,
            afkTimeSeconds: 0,
          },
        ],
      });

      const timeline = await f.run(
        f.history.timeline(context(), { heroId: "low", killId }),
      );

      expect(timeline).toMatchObject([
        {
          mapId: "map",
          assignments: [
            {
              member: { id: 1 },
              assignedAt: time("09:00").toISOString(),
              unassignedAt: time("12:30").toISOString(),
            },
            {
              member: { id: 2 },
              assignedAt: time("09:00").toISOString(),
              unassignedAt: time("12:30").toISOString(),
            },
          ],
          gaps: [
            {
              gapType: "UNASSIGNED",
              startedAt: time("09:00").toISOString(),
              endedAt: time("10:00").toISOString(),
              durationSeconds: 3600,
            },
          ],
        },
      ]);
      await expect(
        f.run(f.history.detail(context(20), { heroId: "low", killId })),
      ).rejects.toThrow();
      await expect(
        f.run(f.history.timeline(context(), { heroId: "high", killId })),
      ).rejects.toThrow();
    } finally {
      await f.dispose();
    }
  });
});
