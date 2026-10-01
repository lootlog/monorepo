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
};

test("a rebuild merges the worlds of an edition and keeps the latest observation", () => {
  // The revision with the latest loot wins, whatever the row order.
  expect(
    toNpcSeedDocuments([
      { ...row, world: "tarhuna", lvl: 70, latestLootId: 3 },
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
