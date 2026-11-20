import { expect, test } from "bun:test";
import {
  getUnreadHighlightIds,
  groupChangelogByWeek,
  type ChangelogItem,
} from "./changelog.js";

const item = (
  id: string,
  date: string,
  rest: Partial<ChangelogItem> = {},
): ChangelogItem => ({
  id,
  date,
  type: "improvement",
  surfaces: ["web"],
  title: id,
  ...rest,
});

test("a Sunday closes its week and the next Monday opens a new one", () => {
  const weeks = groupChangelogByWeek([
    item("sunday", "2026-11-15"),
    item("monday", "2026-11-16"),
    item("fix", "2026-11-17", { type: "fix" }),
    item("highlight", "2026-11-16", { type: "feature", highlight: true }),
  ]);

  expect(
    weeks.map((week) => ({
      weekStart: week.weekStart,
      entries: week.entries.map((entry) => entry.id),
      fixes: week.fixes.map((fix) => fix.id),
    })),
  ).toEqual([
    {
      weekStart: "2026-11-16",
      entries: ["highlight", "monday"],
      fixes: ["fix"],
    },
    { weekStart: "2026-11-09", entries: ["sunday"], fixes: [] },
  ]);
});

test("a new player gets no backlog; a returning one gets what shipped since", () => {
  const items = [
    item("old", "2026-11-01", { highlight: true }),
    item("new", "2026-11-18", { highlight: true }),
    item("quiet", "2026-11-18"),
  ];

  expect(getUnreadHighlightIds(items, null)).toEqual([]);
  expect(getUnreadHighlightIds(items, ["old"])).toEqual(["new"]);
});
