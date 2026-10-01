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
};

test("a rebuild merges the worlds of an edition and keeps the latest revision", () => {
  // Rows arrive ordered by their latest loot link.
  expect(
    toNpcSeedDocuments([
      row,
      { ...row, world: "cronus", gameVersion: "en" },
      { ...row, world: "tarhuna", lvl: 70 },
      { ...row, identityNamespace: "legacy" },
    ]),
  ).toEqual([
    expect.objectContaining({
      catalogKey: "pl_template_257636_2",
      identityNamespace: "template",
      lvl: 70,
      worlds: ["fobos", "tarhuna"],
    }),
    expect.objectContaining({
      catalogKey: "en_template_257636_2",
      worlds: ["cronus"],
    }),
    expect.objectContaining({
      catalogKey: "pl_257636_2",
      identityNamespace: "legacy",
      worlds: ["fobos"],
    }),
  ]);
});
