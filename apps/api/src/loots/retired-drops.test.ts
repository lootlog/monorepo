import { expect, test } from "bun:test";
import { isRetiredDrop, toRetiredDrops } from "./retired-drops.js";

test("retires the drops a rework replaced", () => {
  expect(
    isRetiredDrop({ drops: 166, lastDropFight: 32_040, fights: 46_863 }),
  ).toBe(true);
  expect(isRetiredDrop({ drops: 4, lastDropFight: 25, fights: 22_977 })).toBe(
    true,
  );
});

test("keeps rare drops that still fall at their usual rate", () => {
  expect(
    isRetiredDrop({ drops: 271, lastDropFight: 46_799, fights: 46_863 }),
  ).toBe(false);
  expect(
    isRetiredDrop({ drops: 1, lastDropFight: 9_000, fights: 22_977 }),
  ).toBe(false);
});

test("does not retire a drop on a monster fought too rarely to tell", () => {
  expect(isRetiredDrop({ drops: 30, lastDropFight: 40, fights: 400 })).toBe(
    false,
  );
});

test("retires a Hero Tracker's drops that its hero no longer drops", () => {
  const monster = (type: string, fights: number) => ({
    gameVersion: "pl" as const,
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
