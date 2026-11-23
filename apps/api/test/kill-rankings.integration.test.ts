import type { StaleKillQueryCache } from "#src/kills/kill-query-support";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Capability } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { ApiDatabase } from "../src/database/drizzle/database.js";
import {
  guildKillBucketTable,
  guildKillDayTable,
  guildKillTotalTable,
} from "../src/database/drizzle/kill-statistics.schema.js";
import { makeKillStatsPersistence } from "../src/kills/kill-stats.repository.js";
import { makeGuildKillQueries } from "../src/kills/guild-kill-queries.js";
import {
  getKillStatsBucketStart,
  toStatsDate,
  toStatsHour,
} from "../src/kills/kill-stats-period.js";
import { makeKillRankingFixture } from "./kill-rankings-fixtures.js";

const { runtime, guildId, timelineGuildId, memberIds, seed, cleanup } =
  makeKillRankingFixture();

const policy = createAccessPolicy({ capabilities: [Capability.OWNER] });

const cache: StaleKillQueryCache = {
  getOrSetStale: (_key, _schema, load) =>
    Effect.map(load, (value) => ({
      value,
      computedAt: new Date().toISOString(),
    })),
};

const queries = Effect.map(ApiDatabase, (db) =>
  makeGuildKillQueries(makeKillStatsPersistence(db), cache),
);

const limitedLootsRole = (roleGuildId: string) => ({
  id: "limited",
  guildId: roleGuildId,
  name: "Limited",
  color: null,
  position: null,
  permissions: [Capability.LOOTLOG_LOOTS_READ],
  lvlRangeFrom: 0,
  lvlRangeTo: 150,
  createdAt: new Date(),
  updatedAt: new Date(),
});

beforeAll(seed);

afterAll(cleanup);

for (const period of ["all", "24h"] as const) {
  test(`SQL rankings preserve cross-world sums, per-type limits and metadata outside the top member (${period})`, async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* queries;

        const top = yield* service.getGuildTopNpcs(guildId, policy, [], {
          limit: 1,
          npcType: NpcType.ELITE2,
          period,
        });

        expect(top.topNpcs).toEqual([
          expect.objectContaining({
            npcId: 1,
            uniqueKills: 12,
            npcLvl: 200,
            npcName: "High",
          }),
        ]);

        const members = yield* service.getGuildTopKillersByType(
          guildId,
          policy,
          [],
          [NpcType.ELITE2, NpcType.HERO, NpcType.TITAN],
          { limit: 1, period },
        );

        expect(new Map(Object.entries(members)).get(NpcType.ELITE2)).toEqual([
          {
            member: expect.objectContaining({ name: "first" }),
            totalParticipations: 12,
          },
        ]);
        expect(members[NpcType.HERO]).toEqual([
          {
            member: expect.objectContaining({ name: "second" }),
            totalParticipations: 50,
          },
        ]);
        expect(members[NpcType.TITAN]).toEqual([]);

        const npc = yield* service.getNpcKillers(
          guildId,
          policy,
          [],
          1,
          1,
          undefined,
          period,
        );

        expect(npc?.npc).toEqual(
          expect.objectContaining({
            npcName: "High",
            npcLvl: 200,
            uniqueGuildKills: 12,
            totalMemberParticipations: 15,
          }),
        );
        expect(npc?.killers).toEqual([
          {
            member: {
              id: memberIds.first,
              name: "first",
              avatar: null,
              userId: "first",
            },
            participationCount: 12,
          },
        ]);
      }),
    );
  });
}

test("filters before ranking and keeps all-time metadata with zero counts for an empty world", async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const service = yield* queries;

      const filtered = yield* service.getGuildTopNpcs(guildId, policy, [], {
        limit: 5,
        npcType: NpcType.ELITE2,
        world: "a",
        search: "low",
        npcLevelMin: 1,
        npcLevelMax: 150,
        period: "all",
      });

      expect(filtered.topNpcs).toEqual([
        expect.objectContaining({ npcName: "Low", uniqueKills: 7 }),
      ]);

      const empty = yield* service.getNpcKillers(
        guildId,
        policy,
        [],
        1,
        1,
        "missing",
        "24h",
      );

      expect(empty?.npc).toEqual(
        expect.objectContaining({
          npcName: "High",
          uniqueGuildKills: 0,
          totalMemberParticipations: 0,
        }),
      );
      expect(empty?.killers).toEqual([]);
      expect(yield* service.getNpcKillers(guildId, policy, [], -1)).toBeNull();
      const db = yield* ApiDatabase;
      const persistence = makeKillStatsPersistence(db);

      const visible = yield* persistence.topMembersByType(
        { guildId, OR: [{ npcType: NpcType.ELITE2, npcLvl: { lte: 150 } }] },
        1,
      );

      expect(visible).toEqual([
        expect.objectContaining({
          memberName: "first",
          totalParticipations: 12,
        }),
      ]);
    }),
  );
});

test("role visibility restricts totals and metadata before every SQL ranking", async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const service = yield* queries;

      const restricted = createAccessPolicy({
        capabilities: [Capability.LOOTLOG_LOOTS_READ],
      });

      const roles = [limitedLootsRole(guildId)];

      const top = yield* service.getGuildTopNpcs(guildId, restricted, roles, {
        limit: 5,
        period: "all",
      });

      expect(top.topNpcs).toEqual([
        expect.objectContaining({ npcId: 1, npcLvl: 100, uniqueKills: 7 }),
      ]);

      const members = yield* service.getGuildTopKillersByType(
        guildId,
        restricted,
        roles,
        [NpcType.ELITE2, NpcType.HERO],
        { period: "all" },
      );

      expect(members[NpcType.HERO]).toEqual([]);
      expect(new Map(Object.entries(members)).get(NpcType.ELITE2)).toEqual([
        {
          member: expect.objectContaining({ name: "first" }),
          totalParticipations: 12,
        },
      ]);

      const npc = yield* service.getNpcKillers(
        guildId,
        restricted,
        roles,
        1,
        undefined,
        undefined,
        "all",
      );

      expect(npc?.npc).toEqual(
        expect.objectContaining({
          npcLvl: 100,
          totalMemberParticipations: 12,
          uniqueGuildKills: 7,
        }),
      );
      expect(
        yield* service.getNpcKillers(
          guildId,
          restricted,
          roles,
          2,
          undefined,
          undefined,
          "all",
        ),
      ).toBeNull();
    }),
  );
});

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const warsawSlot = (date: Date) => {
  const parts = new Map(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Warsaw",
      weekday: "short",
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );

  return {
    weekday: WEEKDAYS.indexOf(parts.get("weekday") ?? "") + 1,
    hour: Number(parts.get("hour")),
  };
};

test("the kill timeline and weekly hours follow Warsaw days, fill quiet days, count untimed history and respect role visibility", async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;
      const service = yield* queries;
      const currentHour = getKillStatsBucketStart(new Date());

      const bucket = (
        periodStart: Date,
        kills: number,
        npcType: NpcType = NpcType.ELITE2,
        bucketGuildId = timelineGuildId,
      ) => ({
        guildId: bucketGuildId,
        world: "a",
        npcId: npcType === NpcType.HERO ? 2 : 1,
        npcName: "Timeline",
        npcType,
        npcLvl: 100,
        npcProf: "w",
        npcIcon: "timeline.gif",
        kills,
        periodStart,
        lastKilledAt: periodStart,
      });

      const buckets = [
        bucket(new Date("2026-07-14T21:00:00Z"), 2),
        bucket(new Date("2026-07-14T22:00:00Z"), 3),
        bucket(new Date("2026-07-15T22:00:00Z"), 50, NpcType.HERO),
        bucket(new Date("2026-07-14T22:00:00Z"), 999, NpcType.ELITE2, guildId),
        bucket(currentHour, 4),
      ];

      yield* db.insert(guildKillBucketTable).values(buckets);

      yield* db.insert(guildKillDayTable).values(
        buckets.map(({ periodStart, kills, ...row }) => ({
          guildId: row.guildId,
          world: row.world,
          npcId: row.npcId,
          npcName: row.npcName,
          npcType: row.npcType,
          npcLvl: row.npcLvl,
          day: toStatsDate(periodStart),
          kills,
          hours: Array.from({ length: 24 }, (_, hour) =>
            hour === toStatsHour(periodStart) ? kills : 0,
          ),
        })),
      );

      yield* db
        .insert(guildKillTotalTable)
        .values(
          [bucket(currentHour, 109), bucket(currentHour, 50, NpcType.HERO)].map(
            ({ periodStart: _start, ...total }) => total,
          ),
        );

      const all = yield* service.getGuildKillStats(
        timelineGuildId,
        policy,
        [],
        {
          period: "all",
        },
      );

      expect(all.timeline.unit).toBe("day");
      expect(all.timeline.untimedKills).toBe(100);
      expect(all.timeline.points.slice(0, 4)).toEqual([
        { date: "2026-07-14", kills: 2 },
        { date: "2026-07-15", kills: 3 },
        { date: "2026-07-16", kills: 50 },
        { date: "2026-07-17", kills: 0 },
      ]);
      expect(all.timeline.points.at(-1)?.kills).toBe(4);
      const now = warsawSlot(currentHour);

      const slot = (weekday: number, hour: number, kills: number) => ({
        weekday,
        hour,
        kills: now.weekday === weekday && now.hour === hour ? kills + 4 : kills,
      });

      expect(all.hourlyWeekday).toEqual(
        expect.arrayContaining([slot(2, 23, 2), slot(3, 0, 3), slot(4, 0, 50)]),
      );

      const day = yield* service.getGuildKillStats(
        timelineGuildId,
        policy,
        [],
        {
          period: "24h",
        },
      );

      expect(day.timeline.unit).toBe("hour");
      expect(day.timeline.untimedKills).toBe(0);
      expect(day.timeline.points).toHaveLength(25);
      expect(day.timeline.points.at(-1)).toEqual({
        date: currentHour.toISOString(),
        kills: 4,
      });

      const restricted = yield* service.getGuildKillStats(
        timelineGuildId,
        createAccessPolicy({ capabilities: [Capability.LOOTLOG_LOOTS_READ] }),
        [limitedLootsRole(timelineGuildId)],
        { period: "all" },
      );

      expect(restricted.timeline.untimedKills).toBe(100);
      expect(restricted.timeline.points[2]).toEqual({
        date: "2026-07-16",
        kills: 0,
      });
      expect(
        restricted.hourlyWeekday.find(
          (cell) => cell.weekday === 4 && cell.hour === 0,
        ),
      ).toBeUndefined();
    }),
  );
});
