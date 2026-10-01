import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  createItemSnapshotHash,
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

test("item revisions separate edition and presentation but not per-instance stats", () => {
  const observation = {
    gameVersion: "pl" as const,
    itemId: 62_271,
    name: "Wojenne trofeum Seta",
    icon: "trophy.gif",
    itemType: "trophies",
    stat: "rarity=heroic;contra=40",
  };

  const revision = createItemSnapshotHash(observation);

  expect(
    createItemSnapshotHash({
      ...observation,
      stat: "created=1;contra=40;amount=5;rarity=heroic;gold=2;opis=x",
    }),
  ).toBe(revision);
  expect(
    new Set([
      revision,
      createItemSnapshotHash({ ...observation, gameVersion: "en" }),
      createItemSnapshotHash({ ...observation, name: "Seth's War Trophy" }),
      createItemSnapshotHash({ ...observation, icon: "trophy-v2.gif" }),
      createItemSnapshotHash({ ...observation, itemType: "neutral" }),
      createItemSnapshotHash({
        ...observation,
        stat: "rarity=heroic;contra=50",
      }),
    ]).size,
  ).toBe(6);
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

test("NPC revisions are one per edition, never per world", () => {
  const observation = {
    identityNamespace: "template",
    gameVersion: "pl",
    npcId: 700,
    name: "Kotołak",
    lvl: 30,
  } as const;

  // The API writer, the seed writer and the repair store this hash; the
  // world is not part of it. Changing its input splits new observations from
  // every revision already stored under it.
  expect(createNpcSnapshotHash(observation)).toBe(
    createHash("sha256")
      .update(
        JSON.stringify([
          "npc-observation-v2",
          "template",
          "pl",
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
      .digest("hex"),
  );
  expect(createNpcSnapshotHash({ ...observation, gameVersion: "en" })).not.toBe(
    createNpcSnapshotHash(observation),
  );
});
