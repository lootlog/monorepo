import { expect, test } from "bun:test";
import { toNpcSeedDocuments } from "./npc-seed-query.js";

const row = {
  id: 257_636,
  identityNamespace: "template",
  name: "Vonaros",
  type: "HERO" as const,
  prof: "MAGE" as const,
  icon: "vonaros.gif",
  lvl: 64,
  wt: 31,
  margonemType: 2,
  world: "fobos",
  gameVersion: "pl" as const,
  latestLootId: 1,
  firstSeenAt: Date.parse("2026-10-01T10:00:00.000Z"),
};

test("a rebuild merges the worlds of an edition, keeps the latest observation and the first sighting", () => {
  // The revision with the latest loot wins, whatever the row order.
  expect(
    toNpcSeedDocuments([
      {
        ...row,
        world: "tarhuna",
        lvl: 70,
        latestLootId: 3,
        firstSeenAt: Date.parse("2026-10-20T10:00:00.000Z"),
      },
      row,
      { ...row, world: "cronus", gameVersion: "en" },
      { ...row, identityNamespace: "legacy" },
    ]),
  ).toEqual([
    expect.objectContaining({
      uid: "pl_template_257636_2",
      identityNamespace: "template",
      lvl: 70,
      worlds: ["fobos", "tarhuna"],
      // The latest revision keeps the entry's first sighting.
      firstSeenAt: Date.parse("2026-10-01T10:00:00.000Z"),
    }),
    expect.objectContaining({
      uid: "en_template_257636_2",
      worlds: ["cronus"],
    }),
    expect.objectContaining({
      uid: "pl_257636_2",
      identityNamespace: "legacy",
      worlds: ["fobos"],
    }),
  ]);
});
