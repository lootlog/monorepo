import { expect, test } from "bun:test";
import { toNpcSeedDocument } from "./npc-seed-query.js";

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
  gameVersion: null,
  snapshotHash: "observed",
};

test("a rebuilt NPC document keeps the identity namespace of its snapshot", () => {
  expect(toNpcSeedDocument(row)).toMatchObject({
    identityNamespace: "template",
    catalogKey: "template_257636_2_fobos",
  });
  expect(
    toNpcSeedDocument({ ...row, identityNamespace: "legacy" }).catalogKey,
  ).toBe("257636_2_fobos");
});

test("a rebuilt NPC document keeps the game version of its snapshot", () => {
  expect(toNpcSeedDocument({ ...row, gameVersion: "en" })).toMatchObject({
    gameVersion: "en",
    catalogKey: "en_template_257636_2_fobos",
  });
});
