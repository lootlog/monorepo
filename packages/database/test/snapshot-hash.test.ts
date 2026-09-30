import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  createItemStatsHash,
  createNpcSnapshotHash,
  createPlayerSnapshotHash,
} from "../src/snapshot-hash.js";

test("seed and live ingestion keep item identity despite ordering and transient stats", () => {
  const expected = createHash("sha256").update("ac=15;lvl=100").digest("hex");
  expect(
    createItemStatsHash("lvl=100;created=1;ac=15;gold=50;amount=2;opis=text;"),
  ).toBe(expected);
  expect(createItemStatsHash("ac=15;lvl=100")).toBe(expected);
  expect(createItemStatsHash("ac=16;lvl=100")).not.toBe(expected);
  expect(createItemStatsHash("ac=15;ac=15;lvl=100")).not.toBe(expected);
});

test("player snapshots retain existing identity across the shared hash implementation", () => {
  expect(createPlayerSnapshotHash("Player", "w", "hero.gif")).toBe(
    createHash("sha256").update("Playerwhero.gif").digest("hex"),
  );
  expect(createPlayerSnapshotHash("Player", "WARRIOR", "hero.gif")).toBe(
    createHash("sha256").update("PlayerWARRIORhero.gif").digest("hex"),
  );
  expect(createPlayerSnapshotHash("Player", "", "")).toBe(
    createHash("sha256").update("Player").digest("hex"),
  );
});

test("NPC revisions separate game versions and keep revisions stored without one", () => {
  const observation = {
    identityNamespace: "template",
    world: "fobos",
    npcId: 700,
    name: "Kotołak",
    lvl: 30,
  };

  const storedWithoutGameVersion = createHash("sha256")
    .update(
      JSON.stringify([
        "npc-observation-v1",
        "template",
        "fobos",
        700,
        "Kotołak",
        null,
        30,
        null,
        null,
        null,
        null,
      ]),
    )
    .digest("hex");

  expect(createNpcSnapshotHash(observation)).toBe(storedWithoutGameVersion);
  expect(createNpcSnapshotHash({ ...observation, gameVersion: null })).toBe(
    storedWithoutGameVersion,
  );
  expect(
    new Set([
      storedWithoutGameVersion,
      createNpcSnapshotHash({ ...observation, gameVersion: "pl" }),
      createNpcSnapshotHash({ ...observation, gameVersion: "en" }),
    ]).size,
  ).toBe(3);
});
