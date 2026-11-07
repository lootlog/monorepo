import { expect, test } from "bun:test";
import {
  type ItemDropRate,
  type LootParties,
  toMonsterDropRates,
} from "./drop-rates.js";

const noMembers = { w: 0, p: 0, b: 0, m: 0, t: 0, h: 0 };

const rate = (overrides: Partial<ItemDropRate>): ItemDropRate => ({
  gameVersion: "pl",
  name: "Mushita",
  type: "ELITE2",
  itemId: 1,
  professions: null,
  drops: 60,
  kills: 1000,
  partyKills: 0,
  lootRolls: 0,
  ...noMembers,
  ...overrides,
});

const parties = (overrides: Partial<LootParties>): LootParties => ({
  gameVersion: "pl",
  name: "Mushita",
  type: "ELITE2",
  players: 1,
  fights: 100,
  items: 100,
  ...noMembers,
  ...overrides,
});

const onlyRate = (monsters: ReturnType<typeof toMonsterDropRates>) =>
  monsters[0]?.dropRates[0];

test("counts the rolls of full parties, not their kills", () => {
  // 1000 kills in parties of 10 rolled 5500 times.
  expect(
    onlyRate(
      toMonsterDropRates(
        [rate({ partyKills: 400, lootRolls: 2200 })],
        [parties({})],
      ),
    ),
  ).toEqual({ itemId: 1, drops: 60, kills: 1000, rolls: 5500, basis: "PARTY" });
});

test("estimates the rolls from recorded loots until enough kills name their party", () => {
  const monsters = toMonsterDropRates(
    [rate({ partyKills: 99, lootRolls: 99 })],
    // Half the fights solo, half in tens: 3.25 rolls a fight.
    [parties({ players: 1 }), parties({ players: 10, items: 300 })],
  );

  expect(onlyRate(monsters)).toMatchObject({ rolls: 3250, basis: "LOOTS" });
});

test("rolls a personal colossus loot once per member who wears the item", () => {
  const colossus = { name: "Draugr Zastępowy", type: "COLOSSUS" };

  const monsters = toMonsterDropRates(
    [
      // A warriors' item, from kills with 3 warriors and 7 others each.
      rate({
        ...colossus,
        professions: "w",
        drops: 150,
        partyKills: 1000,
        w: 3000,
        m: 7000,
      }),
    ],
    [parties({ ...colossus, players: 10, items: 1000 })],
  );

  expect(monsters[0]?.lootMode).toBe("PERSONAL");
  expect(onlyRate(monsters)).toMatchObject({ rolls: 3000, basis: "PARTY" });
});

test("shares the loot of a colossus summoned by a Hero Tracker", () => {
  const colossus = { name: "Młody Smok", type: "COLOSSUS" };

  const monsters = toMonsterDropRates(
    [rate({ ...colossus, partyKills: 1000, lootRolls: 5500, w: 10_000 })],
    [parties({ ...colossus, players: 10, items: 280 })],
  );

  expect(monsters[0]?.lootMode).toBe("SHARED");
  expect(onlyRate(monsters)).toMatchObject({ rolls: 5500 });
});

test("says nothing below 100 kills", () => {
  expect(toMonsterDropRates([rate({ kills: 99 })], [parties({})])).toEqual([]);
});
