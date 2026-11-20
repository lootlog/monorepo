import { expect, it } from "vitest";
import { summarizeKillRecords } from "./summarize-kill-records";

const cells = [
  { weekday: 1, hour: 0, kills: 9 },
  { weekday: 3, hour: 21, kills: 4 },
];

it("keeps the longest streak when a quiet day breaks a later, shorter one", () => {
  const records = summarizeKillRecords(
    [
      { date: "2026-08-01", kills: 3 },
      { date: "2026-08-02", kills: 8 },
      { date: "2026-08-03", kills: 1 },
      { date: "2026-08-04", kills: 0 },
      { date: "2026-08-05", kills: 8 },
      { date: "2026-08-06", kills: 2 },
    ],
    cells,
  );

  expect(records).toEqual({
    best: { date: "2026-08-02", kills: 8 },
    longestStreak: 3,
    peak: { weekday: 1, hour: 0, kills: 9 },
  });
});

it("reports no records for a period without kills", () => {
  expect(
    summarizeKillRecords([{ date: "2026-08-01", kills: 0 }], []),
  ).toBeNull();
});
