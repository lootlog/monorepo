import { expect, test } from "bun:test";
import {
  type LootedItemRevision,
  toItemRevisionHistories,
} from "./item-revisions.js";

let snapshotId = 0;

const revision = (
  stat: string,
  firstLootedAt: string,
  lastLootedAt: string,
  overrides: Partial<LootedItemRevision> = {},
): LootedItemRevision => ({
  gameVersion: "pl",
  itemId: 42242,
  snapshotId: (snapshotId += 1),
  name: "Podziemna gwiazda",
  icon: "mie/miecz533.gif",
  lvl: 218,
  stat,
  firstLootedAt: new Date(firstLootedAt),
  lastLootedAt: new Date(lastLootedAt),
  ...overrides,
});

test("dates a change between the old revision's last loot and the new one's first, as Polish days", () => {
  const [item] = toItemRevisionHistories([
    revision(
      "lvl=218;wound=25,1098",
      "2026-07-28T10:05:00Z",
      "2026-09-01T12:00:00Z",
    ),
    // Last looted at 23:30 in Poland, which is still the 27th there.
    revision(
      "lvl=218;wound=20,1098",
      "2026-05-02T08:00:00Z",
      "2026-07-27T21:30:00Z",
    ),
  ]);

  expect(item?.revisions).toEqual([
    {
      name: "Podziemna gwiazda",
      icon: "mie/miecz533.gif",
      lvl: 218,
      stat: "lvl=218;wound=25,1098",
      previousName: "Podziemna gwiazda",
      previousIcon: "mie/miecz533.gif",
      previousStat: "lvl=218;wound=20,1098",
      changedAfter: "2026-07-27",
      changedBy: "2026-07-28",
    },
  ]);
});

test("leaves out an item whose revisions are looted side by side, as variants are", () => {
  // Stats that follow something other than the item's level alternate.
  expect(
    toItemRevisionHistories([
      revision(
        "lvl=100;hp=857",
        "2025-10-06T09:00:00Z",
        "2025-10-13T08:00:00Z",
      ),
      revision(
        "lvl=100;hp=2198",
        "2025-10-06T10:00:00Z",
        "2025-10-13T07:00:00Z",
      ),
    ]),
  ).toEqual([{ gameVersion: "pl", id: 42242, revisions: [] }]);
});

test("keeps an elastic item's levels apart and narrows one change to when every level saw it", () => {
  const elastic = (lvl: number, sa: number, first: string, last: string) =>
    revision(`lvl=${lvl};sa=${sa};etiquette=Wielkanoc`, first, last, { lvl });

  const [item] = toItemRevisionHistories([
    // Each level is its own revision; none of them is a change.
    ...[40, 90, 140, 190].map((lvl) =>
      elastic(lvl, lvl, "2026-03-26T10:00:00Z", "2026-04-02T10:00:00Z"),
    ),
    elastic(240, 240, "2026-03-26T10:00:00Z", "2026-04-06T10:00:00Z"),
    // The game raised the item's attack speed: level 90 saw it between the
    // 2nd and the 9th, level 240 between the 6th and the 12th, so it was
    // between the 6th and the 9th.
    elastic(90, 95, "2026-04-09T10:00:00Z", "2026-04-20T10:00:00Z"),
    elastic(240, 245, "2026-04-12T10:00:00Z", "2026-04-20T10:00:00Z"),
  ]);

  expect(item?.revisions).toHaveLength(1);
  expect(item?.revisions[0]).toMatchObject({
    lvl: 240,
    previousStat: "lvl=240;sa=240",
    changedAfter: "2026-04-06",
    changedBy: "2026-04-09",
  });
});

test("does not count the events the game writes onto an event item as a change", () => {
  const [item] = toItemRevisionHistories([
    revision("lvl=218;ac=40", "2025-10-20T10:00:00Z", "2025-11-06T10:00:00Z"),
    // The event ended: the game named it on the item and left its stats.
    revision(
      "lvl=218;ac=40;etiquette=Dzień Piekielnego Kościeja",
      "2025-11-01T10:00:00Z",
      "2026-01-25T10:00:00Z",
    ),
    // The event came back with a stronger item.
    revision(
      "lvl=218;ac=45;etiquette=Dzień Piekielnego Kościeja 2026 r.",
      "2026-11-06T10:00:00Z",
      "2026-11-07T10:00:00Z",
    ),
  ]);

  expect(item?.revisions).toEqual([
    expect.objectContaining({
      previousStat: "lvl=218;ac=40",
      stat: "lvl=218;ac=45",
      changedAfter: "2026-01-25",
      changedBy: "2026-11-06",
    }),
  ]);
});
