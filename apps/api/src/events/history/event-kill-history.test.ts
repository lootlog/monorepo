import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventKillPointTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventPresenceLogTable,
  eventRankingTable,
  eventRespawnWindowSummaryTable,
  eventTable,
  guildTable,
  memberTable,
  type roleTable,
} from "#src/database/drizzle/schema";
import { makeEventReadCache } from "#src/events/catalog/event-read-cache.service";
import { makeEventAccess } from "#src/events/event-access";
import { makeEventEmitter } from "#src/events/event-emitter";
import { makeEventPointsStore } from "#src/events/kills/event-points.repository";
import { makeEventPoints } from "#src/events/kills/event-points.service";
import { makeEventPointEdits } from "#src/events/kills/event-point-edits";
import type { RedisGetOrSetJsonBestEffortOptions } from "#src/redis/redis.service";
import { applicationLogger } from "#src/shared/application-logger";
import { makeEventKillHistory } from "./event-kill-history.js";

const time = (value: string) => new Date(`2026-09-27T${value}:00.000Z`);

const uuid = (value: string) =>
  `${value.padStart(8, "0")}-1111-4111-8111-111111111111`;

const orderedIds = ["f", "a", "d", "b", "c"].map(uuid);

const hiddenId = uuid("ee");

const otherEventId = uuid("dd");

const foreignId = uuid("cc");

const role = (maximum: number): typeof roleTable.$inferSelect => ({
  id: "reader",
  guildId: "guild-1",
  name: "Reader",
  color: null,
  position: null,
  permissions: [Permission.LOOTLOG_EVENTS_READ],
  lvlRangeFrom: 1,
  lvlRangeTo: maximum,
  createdAt: time("00:00"),
  updatedAt: time("00:00"),
});

const context = (maximum = 100) => ({
  guildId: "guild-1",
  eventId: "event-1",
  roles: [role(maximum)],
  accessPolicy: createAccessPolicy({
    capabilities: [Permission.LOOTLOG_EVENTS_READ],
  }),
});

const fixture = async () => {
  const boundary = await createDatabaseBoundary();
  const database = boundary.database;

  // Redis is the external boundary; the real cache owner still chooses keys and codecs.
  const entries = new Map<
    string,
    { value: string; scopes: readonly string[] }
  >();

  const redis = {
    invalidateScopes: async (...scopes: string[]) => {
      for (const [key, entry] of entries) {
        if (entry.scopes.some((scope) => scopes.includes(scope))) {
          entries.delete(key);
        }
      }
    },
    deleteByPattern: () => Promise.resolve(0),
    getOrSetJsonEffect<T, E>(
      options: Omit<RedisGetOrSetJsonBestEffortOptions<T>, "factory"> & {
        factory: Effect.Effect<T, E>;
      },
    ) {
      return Effect.gen(function* () {
        const cached = entries.get(options.key);

        if (cached !== undefined) return options.codec.parse(cached.value);
        const value = yield* options.factory;
        entries.set(options.key, {
          value: options.codec.stringify(value),
          scopes: options.scopes ?? [],
        });

        return value;
      });
    },
  };

  const readCache = makeEventReadCache(redis);

  const points = makeEventPoints(
    makeEventPointsStore(database),
    makeEventEmitter({
      publish: () => Effect.die("History must not publish events"),
    }),
    readCache,
  );

  const history = makeEventKillHistory({
    database,
    eventAccess: makeEventAccess(database),
    readCache,
    points,
  });

  try {
    await boundary.run(
      Effect.gen(function* () {
        yield* database
          .insert(guildTable)
          .values([
            createGuildFixture(),
            createGuildFixture({ id: "guild-2" }),
          ]);
        yield* database.insert(memberTable).values([
          createMemberFixture(),
          createMemberFixture({ id: 2, userId: "user-2", name: "Second" }),
          createMemberFixture({
            id: 3,
            guildId: "guild-2",
            userId: "user-3",
          }),
        ]);
        yield* database.insert(eventTable).values([
          {
            id: "event-1",
            guildId: "guild-1",
            name: "Event",
            world: "Aldous",
            updatedAt: time("00:00"),
          },
          {
            id: "event-2",
            guildId: "guild-1",
            name: "Other event",
            world: "Aldous",
            updatedAt: time("00:00"),
          },
          {
            id: "event-3",
            guildId: "guild-2",
            name: "Other Organization",
            world: "Aldous",
            updatedAt: time("00:00"),
          },
        ]);
        yield* database.insert(eventHeroNpcTable).values([
          { id: "low", eventId: "event-1", npcName: "Low", npcLvl: 50 },
          { id: "high", eventId: "event-1", npcName: "High", npcLvl: 300 },
          { id: "other", eventId: "event-2", npcName: "Other", npcLvl: 50 },
          { id: "foreign", eventId: "event-3", npcName: "Foreign", npcLvl: 50 },
        ]);
        yield* database.insert(eventHeroKillTable).values([
          ...orderedIds.map((id, index) => ({
            id,
            heroNpcId: "low",
            killedAt: time(
              ["12:00", "11:00", "10:00", "10:00", "09:00"][index],
            ),
            minSpawnTimeAtKill: time("08:00"),
            maxSpawnTimeAtKill: time("13:00"),
          })),
          ...[
            { id: hiddenId, heroNpcId: "high" },
            { id: otherEventId, heroNpcId: "other" },
            { id: foreignId, heroNpcId: "foreign" },
          ].map((kill) => ({
            ...kill,
            killedAt: time("13:00"),
            minSpawnTimeAtKill: time("08:00"),
            maxSpawnTimeAtKill: time("13:00"),
          })),
        ]);
        yield* database.insert(eventKillPointTable).values(
          [
            ...orderedIds.map((killId, index) => ({
              killId,
              memberId: 2,
              wasPresent: index !== 0,
            })),
            ...[
              orderedIds[0],
              orderedIds[2],
              orderedIds[4],
              hiddenId,
              otherEventId,
            ].map((killId) => ({ killId, memberId: 1, wasPresent: true })),
            { killId: foreignId, memberId: 3, wasPresent: true },
          ].map((point, index) => ({
            ...point,
            id: `point-${index}`,
            basePoints: 1,
            points: 7.25,
            manualAdjustmentPoints: 2,
            timeOnMapSeconds: 120,
            afkPercentage: 0,
            trackingDurationSeconds: 240,
            trackingDurationPercentage: 40,
          })),
        );
      }),
    );

    return { ...boundary, history, points, readCache, redis };
  } catch (cause) {
    await boundary.dispose();
    throw cause;
  }
};

describe("kill history database reads", () => {
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
        expect(
          await f.run(
            f.points.getMemberPresenceStatsPerMap(["map"], 1, since, at(2000)),
          ),
        ).toEqual([{ mapId: "map", presenceTimeSeconds, afkTimeSeconds: 0 }]);

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
        f.history.list(context(), { memberId: "2", limit: "1" }),
      );

      expect(before).toMatchObject({
        kind: "member",
        data: [{ id: orderedIds[0], memberPoint: { points: 7.25 } }],
      });

      const published: {
        routingKey: string;
        payload: { guildId: string; eventId: string };
      }[] = [];

      const edits = makeEventPointEdits(
        f.database,
        f.redis,
        {
          publish: (routingKey, payload) =>
            Effect.sync(() => {
              published.push({ routingKey, payload });
            }),
        },
        applicationLogger,
      );

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
        await f.run(f.history.list(context(), { memberId: "2", limit: "1" })),
      ).toMatchObject({
        kind: "member",
        data: [
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

  it("visits every scoped kill once despite unordered UUIDs and equal timestamps", async () => {
    const f = await fixture();

    try {
      for (const query of [
        {},
        { heroId: "low" },
        { memberId: "1" },
        { memberId: "1", heroId: "low" },
      ]) {
        const expected =
          "memberId" in query
            ? [orderedIds[0], orderedIds[2], orderedIds[4]]
            : orderedIds;

        const actual: string[] = [];
        let cursor: string | undefined;

        do {
          const page = await f.run(
            f.history.list(context(), { ...query, limit: "2", cursor }),
          );

          actual.push(...page.data.map((kill) => kill.id));
          cursor = page.nextCursor ?? undefined;
        } while (cursor !== undefined && actual.length <= 20);

        expect(actual).toEqual(expected);
      }

      const first = await f.run(f.history.list(context(), { limit: "1" }));
      expect(first.data[0]).toMatchObject({
        id: orderedIds[0],
        participantCount: 2,
      });

      const member = await f.run(
        f.history.list(context(), { memberId: "1", limit: "1" }),
      );

      expect(member).toMatchObject({
        kind: "member",
        member: { id: 1 },
        data: [{ memberPoint: { points: 7.25, trackingDurationSeconds: 240 } }],
      });
    } finally {
      await f.dispose();
    }
  });

  it("applies current hero visibility before reading cached pages and cursor anchors", async () => {
    const f = await fixture();

    try {
      const broad = await f.run(f.history.list(context(500), { limit: "1" }));
      expect(broad.data.map((kill) => kill.id)).toEqual([hiddenId]);
      const narrow = await f.run(f.history.list(context(), { limit: "1" }));
      expect(narrow.data.map((kill) => kill.id)).toEqual([orderedIds[0]]);

      const continuation = await f.run(
        f.history.list(context(), {
          cursor: broad.nextCursor ?? undefined,
          limit: "20",
        }),
      );

      expect(continuation.data.map((kill) => kill.id)).toEqual(orderedIds);
      const none = await f.run(f.history.list(context(20), {}));
      expect(none).toMatchObject({ data: [], nextCursor: null });

      for (const cursor of [hiddenId, otherEventId, foreignId, uuid("ff")]) {
        await expect(
          f.run(f.history.legacyEvent(context(), { cursor })),
        ).rejects.toThrow("Invalid cursor");
      }

      await expect(
        f.run(f.history.list(context(), { heroId: "high" })),
      ).rejects.toThrow("Hero not found");
      await expect(
        f.run(f.history.list(context(), { memberId: "3" })),
      ).rejects.toThrow("Member not found");
      await expect(
        f.run(f.history.list({ ...context(), guildId: "guild-2" }, {})),
      ).rejects.toThrow("Event not found");
    } finally {
      await f.dispose();
    }
  });

  it("continues after a deleted boundary and ignores subsequently inserted newer kills", async () => {
    const f = await fixture();

    try {
      const first = await f.run(f.history.list(context(), { limit: "2" }));
      await f.run(
        f.database
          .delete(eventHeroKillTable)
          .where(eq(eventHeroKillTable.id, orderedIds[1])),
      );
      await f.run(
        f.database.insert(eventHeroKillTable).values({
          id: uuid("aa"),
          heroNpcId: "low",
          killedAt: time("14:00"),
          minSpawnTimeAtKill: time("13:00"),
          maxSpawnTimeAtKill: time("15:00"),
        }),
      );
      await f.readCache.invalidateEvent("guild-1", "event-1");

      const next = await f.run(
        f.history.list(context(), {
          limit: "20",
          cursor: first.nextCursor ?? undefined,
        }),
      );

      expect(next.data.map((kill) => kill.id)).toEqual(orderedIds.slice(2));
      expect(next.nextCursor).toBeNull();
    } finally {
      await f.dispose();
    }
  });

  it("preserves UUID continuation on legacy event, hero and member lists", async () => {
    const f = await fixture();

    try {
      for (const query of [{}, { heroId: "low" }]) {
        const first = await f.run(
          f.history.legacyEvent(context(), { ...query, limit: "2" }),
        );

        expect(first.nextCursor).toBe(orderedIds[1]);

        const next = await f.run(
          f.history.legacyEvent(context(), {
            ...query,
            limit: "20",
            cursor: first.nextCursor ?? undefined,
          }),
        );

        expect([...first.data, ...next.data].map((kill) => kill.id)).toEqual(
          orderedIds,
        );
        expect(first.data[0]?.points).toHaveLength(2);
      }

      const first = await f.run(
        f.history.legacyMember(context(), { memberId: "1", limit: "1" }),
      );

      const next = await f.run(
        f.history.legacyMember(context(), {
          memberId: "1",
          cursor: first.nextCursor ?? undefined,
        }),
      );

      expect([...first.data, ...next.data].map((kill) => kill.id)).toEqual([
        orderedIds[0],
        orderedIds[2],
        orderedIds[4],
      ]);
      await expect(
        f.run(
          f.history.legacyMember(context(), {
            memberId: "1",
            cursor: orderedIds[1],
          }),
        ),
      ).rejects.toThrow("Invalid cursor");
    } finally {
      await f.dispose();
    }
  });

  it("rejects malformed or differently scoped cursors instead of restarting pagination", async () => {
    const f = await fixture();

    try {
      const first = await f.run(f.history.list(context(), { limit: "1" }));

      for (const query of [
        { cursor: "not-a-cursor" },
        { cursor: orderedIds[0] },
        { cursor: first.nextCursor ?? undefined, heroId: "low" },
        { cursor: first.nextCursor ?? undefined, memberId: "1" },
        { limit: "0" },
        { limit: "101" },
        { limit: "1.5" },
        { limit: "2garbage" },
        { limit: "-1" },
      ]) {
        await expect(f.run(f.history.list(context(), query))).rejects.toThrow();
      }

      if (first.nextCursor === null) throw new Error("Expected continuation");

      const payload = Buffer.from(first.nextCursor, "base64url").toString(
        "utf8",
      );

      for (const killedAt of [
        "0000-01-01T00:00:00.000Z",
        "2026-02-30T12:00:00.000Z",
      ]) {
        const cursor = Buffer.from(
          payload.replace(
            /"killedAt":"[^"]+"/,
            `"killedAt":${JSON.stringify(killedAt)}`,
          ),
        ).toString("base64url");

        await expect(
          f.run(f.history.list(context(), { cursor })),
        ).rejects.toThrow("Invalid cursor");
      }

      await expect(
        f.run(
          f.history.list(
            { ...context(), eventId: "event-2" },
            { cursor: first.nextCursor ?? undefined },
          ),
        ),
      ).rejects.toThrow("Invalid cursor");
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
              memberId: 1,
              assignedAt: time("09:00").toISOString(),
              unassignedAt: time("12:30").toISOString(),
            },
            {
              memberId: 2,
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
