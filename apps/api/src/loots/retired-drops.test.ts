import { expect, test } from "bun:test";
import { isRetiredDrop, toRetiredDrops } from "./retired-drops.js";

// Drop statistics of Chaegd Agnrakh and Czempion Furboli, whose reworks
// replaced their loot.
test("retires the drops a rework replaced", () => {
  // Klejnot królewski: about one drop in 190 fights, none in the last 14 823.
  expect(
    isRetiredDrop({ drops: 166, lastDropFight: 32_040, fights: 46_863 }),
  ).toBe(true);
  // Four early drops of a Furboli legendary before 22 900 fights without one.
  expect(isRetiredDrop({ drops: 4, lastDropFight: 25, fights: 22_977 })).toBe(
    true,
  );
});

test("keeps rare drops that still fall at their usual rate", () => {
  // Kryształ Chaegda Agnrakha: one drop in 173 fights, the last 64 fights ago.
  expect(
    isRetiredDrop({ drops: 271, lastDropFight: 46_799, fights: 46_863 }),
  ).toBe(false);
  // One drop in thousands of fights proves nothing about its rate.
  expect(
    isRetiredDrop({ drops: 1, lastDropFight: 9_000, fights: 22_977 }),
  ).toBe(false);
});

test("does not retire a drop on a monster fought too rarely to tell", () => {
  expect(isRetiredDrop({ drops: 30, lastDropFight: 40, fights: 400 })).toBe(
    false,
  );
});

// Negthotep's hero lost its old loot; its Hero Tracker, a colossus fought only
// over three event days, drops the same items under its own ids.
test("retires a Hero Tracker's drops that its hero no longer drops", () => {
  const monster = (type: string, fights: number) => ({
    gameVersion: "pl",
    name: "Negthotep Czarny Kapłan",
    type,
    fights,
  });

  const hero = monster("HERO", 33_135);
  const tracker = monster("COLOSSUS", 2_064);

  expect(
    toRetiredDrops([
      {
        ...hero,
        itemId: 32_541,
        itemName: "Korona Negthotepa",
        drops: 300,
        lastDropFight: 20_000,
      },
      {
        ...hero,
        itemId: 40_001,
        itemName: "Okucia Chaosu",
        drops: 40,
        lastDropFight: 33_100,
      },
      {
        ...tracker,
        itemId: 36_580,
        itemName: "Korona Negthotepa",
        drops: 20,
        lastDropFight: 2_050,
      },
      {
        ...tracker,
        itemId: 40_002,
        itemName: "Okucia Chaosu",
        drops: 3,
        lastDropFight: 2_000,
      },
    ]),
  ).toEqual([
    {
      gameVersion: "pl",
      name: hero.name,
      type: "HERO",
      retiredItemIds: [32_541],
    },
    {
      gameVersion: "pl",
      name: tracker.name,
      type: "COLOSSUS",
      retiredItemIds: [36_580],
    },
  ]);
});
