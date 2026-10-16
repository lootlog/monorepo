import { describe, expect, it } from "vitest";
import { summarizePlayTime } from "./summarize-play-time";
import { summarizeWeeks } from "./summarize-weeks";

describe("play time", () => {
  it("rates kills only over days whose online time is known", () => {
    const summary = summarizePlayTime(
      [
        { date: "2026-10-01", onlineSeconds: null },
        { date: "2026-10-02", onlineSeconds: 7200 },
        { date: "2026-10-03", onlineSeconds: 0 },
      ],
      [
        { date: "2026-10-01", kills: 500 },
        { date: "2026-10-02", kills: 60 },
        { date: "2026-10-03", kills: 0 },
      ],
    );

    expect(summary.killsPerHour).toBe(30);
    expect(summary.playedDays).toBe(1);
    expect(summary.longest).toEqual({ date: "2026-10-02", seconds: 7200 });
  });
});

describe("week comparison", () => {
  it("compares this week to the same days of the previous week", () => {
    // 2026-10-07 is a Wednesday.
    const daily = [
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ].map((date, index) => ({ date, kills: index < 7 ? 10 : 5 }));

    const weeks = summarizeWeeks(daily);

    expect(weeks?.currentKills).toBe(15);
    expect(weeks?.previousKills).toBe(30);
    expect(weeks?.days[3]).toEqual({ weekday: 4, current: null, previous: 10 });
  });
});
