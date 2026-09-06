import { describe, expect, it } from "bun:test";
import { DateTime } from "effect";
import {
  buildKillActivity,
  buildKillAnalytics,
} from "./user-kill-analytics.js";
import { getKillAnalyticsRange } from "./user-kill-analytics-query.js";

const range = getKillAnalyticsRange(
  DateTime.makeUnsafe("2026-10-25T02:30:00Z"),
  7,
);
const base = {
  allTimeKills: 30,
  timedKills: 30,
  firstBucketAt: "2026-10-18T00:00:00Z",
  daily: [
    { date: "2026-10-23", world: "tempest", kills: 8 },
    { date: "2026-10-24", world: "tempest", kills: 4 },
    { date: "2026-10-25", world: "tempest", kills: 18 },
  ],
};
const raw = {
  ...base,
  currentKills: 19,
  previousKills: 5,
  uniqueNpcs: 2,
  hourlyWeekday: [],
  types: [],
  npcs: [],
  npcGains: [],
  worldComparisons: [
    { world: "tempest", comparisonKills: 19, previousKills: 5 },
    { world: "lunia", comparisonKills: 0, previousKills: 9 },
  ],
};

describe("personal kill analytics calendar semantics", () => {
  it("aligns ranges to Warsaw calendar days through DST rather than 24-hour subtraction", () => {
    expect(range.start).toBe("2026-10-18T22:00:00.000Z");
    expect(range.through).toBe("2026-10-25T02:00:00.000Z");
    expect(range.previousThrough).toBe("2026-10-18T01:00:00.000Z");
    const spring = getKillAnalyticsRange(
      DateTime.makeUnsafe("2026-03-29T01:30:00Z"),
      7,
    );
    expect(spring.start).toBe("2026-03-22T23:00:00.000Z");
    expect(spring.previousThrough).toBe("2026-03-22T02:00:00.000Z");
  });
  it("never distributes lifetime kills into unknown historical dates", () => {
    const result = buildKillActivity(
      { ...base, allTimeKills: 130, firstBucketAt: "2026-10-23T10:00:00Z" },
      range,
    );
    expect(result.meta.untimedKills).toBe(100);
    expect(result.meta.coverage).toBe("partial");
    expect(result.daily[0]).toEqual({
      date: "2026-10-19",
      kills: null,
      partial: true,
    });
    expect(result.daily[4]).toEqual({
      date: "2026-10-23",
      kills: 8,
      partial: true,
    });
    expect(result.daily[5]).toEqual({
      date: "2026-10-24",
      kills: 4,
      partial: false,
    });
  });
  it("uses active days for the average and preserves yesterday's current streak", () => {
    const result = buildKillAnalytics(raw, range);
    expect(result.overview).toEqual({
      totalKills: 30,
      activeDays: 3,
      averagePerDay: 10,
      currentStreak: 3,
      longestStreak: 3,
      uniqueNpcs: 2,
    });
    const yesterday = buildKillAnalytics(
      { ...raw, daily: base.daily.slice(0, 2) },
      range,
    );
    expect(yesterday.overview.currentStreak).toBe(2);
    const broken = buildKillAnalytics(
      { ...raw, daily: base.daily.slice(0, 1) },
      range,
    );
    expect(broken.overview.currentStreak).toBe(0);
  });
  it("retains previous-only worlds and distinguishes covered zeroes from missing history", () => {
    const result = buildKillAnalytics(raw, range);
    const previous = result.worlds.find((world) => world.world === "lunia");
    expect(previous?.totalKills).toBe(0);
    expect(previous?.deltaKills).toBe(-9);
    expect(previous?.deltaPercent).toBe(-100);
    expect(previous?.daily).toHaveLength(7);
    expect(previous?.daily.every((day) => day.kills === 0)).toBe(true);
  });
  it("exposes partial calendar records and never produces Infinity comparisons", () => {
    const result = buildKillAnalytics({ ...raw, previousKills: 0 }, range);
    expect(result.comparison.deltaPercent).toBeNull();
    expect(result.comparison.partial).toBe(true);
    expect(result.records.bestDay?.startDate).toBe("2026-10-25");
    expect(result.records.bestDay?.partial).toBe(true);
    expect(result.records.bestMonth?.partial).toBe(true);
    expect(result.hourlyWeekday).toHaveLength(168);
  });
  it("returns an unavailable calendar for only untimed history, not fabricated zeros", () => {
    const result = buildKillAnalytics(
      {
        ...raw,
        allTimeKills: 100,
        timedKills: 0,
        firstBucketAt: null,
        daily: [],
        currentKills: 0,
        uniqueNpcs: 0,
      },
      range,
    );
    expect(result.meta.coverage).toBe("unavailable");
    expect(result.daily.every((day) => day.kills === null)).toBe(true);
    expect(result.overview.averagePerDay).toBeNull();
    expect(result.records.bestDay).toBeNull();
  });
});
