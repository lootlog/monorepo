import { expect, test } from "bun:test";
import {
  filterChangelog,
  getUnreadHighlightIds,
  groupChangelogByWeek,
  markHighlightsSeen,
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
    item("feature", "2026-11-16", { type: "feature" }),
    item("tuesday", "2026-11-17"),
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
      entries: ["highlight", "feature", "tuesday", "monday"],
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

test("opening the list in an older build keeps what a newer build marked seen", () => {
  const olderBuild = [item("old", "2026-11-01", { highlight: true })];

  expect(markHighlightsSeen(olderBuild, ["old", "newer"])).toEqual([
    "old",
    "newer",
  ]);
  expect(markHighlightsSeen(olderBuild, null)).toEqual(["old"]);
});

test("a filter keeps an entry met on any chosen surface and narrows by type", () => {
  const items = [
    item("both", "2026-11-18", { surfaces: ["game-client", "web"] }),
    item("wiki", "2026-11-18", { surfaces: ["wiki"] }),
    item("web-fix", "2026-11-18", { type: "fix", title: "Lista WALK" }),
  ];

  const ids = (filters: Parameters<typeof filterChangelog>[1]) =>
    filterChangelog(items, filters).map((entry) => entry.id);

  expect(ids({ surfaces: ["web"], types: [], search: "" })).toEqual([
    "both",
    "web-fix",
  ]);
  expect(ids({ surfaces: ["web"], types: ["fix"], search: "" })).toEqual([
    "web-fix",
  ]);
  expect(ids({ surfaces: [], types: [], search: " walk " })).toEqual([
    "web-fix",
  ]);
});
