import { expect, test } from "vitest";
import { findStatRevisions } from "./item-revision-changes";

test("lists the stats a change altered, added and removed, leaving out those it kept", () => {
  const revisions = findStatRevisions({
    previousStat: "lvl=70;manabon=18;pierceb=60;reqp=mt;resfrost=13",
    stat: "lvl=70;manabon=23;pierceb=60;reqp=m;evade=5",
  });

  expect(
    revisions.map(({ key, before, after }) => [
      key,
      before === undefined ? "added" : "had",
      after === undefined ? "removed" : "has",
    ]),
  ).toEqual([
    // In the order the item now shows its stats, then those it lost.
    ["evade", "added", "has"],
    ["manabon", "had", "has"],
    ["reqp", "had", "has"],
    ["resfrost", "had", "removed"],
  ]);
});
