import { describe, expect, it } from "bun:test";
import {
  canWearLootDrawItem,
  capturesMapPlayers,
  lootDrawWinnerTickets,
  pickLootDrawEntrant,
} from "./loot-draw.js";

const mageWand = { prof: ["MAGE"], lvl: 279, stat: "lvl=279;reqp=m" };

describe("lootDrawWinnerTickets", () => {
  it("counts every party member who can wear the item, the winner included", () => {
    const party = [
      { prof: "MAGE", lvl: 300 },
      { prof: "MAGE", lvl: 302 },
      { prof: "MAGE", lvl: 290 },
      { prof: "WARRIOR", lvl: 305 },
    ];

    expect(lootDrawWinnerTickets(mageWand, party)).toBe(3);
  });

  it("leaves out party members below the item's level", () => {
    const party = [
      { prof: "MAGE", lvl: 300 },
      { prof: "MAGE", lvl: 278 },
    ];

    expect(lootDrawWinnerTickets(mageWand, party)).toBe(1);
  });

  it("gives a winner who cannot wear the item one ticket when nobody else can", () => {
    expect(
      lootDrawWinnerTickets(mageWand, [{ prof: "WARRIOR", lvl: 300 }]),
    ).toBe(1);
  });
});

describe("canWearLootDrawItem", () => {
  it("ignores the level of an elastic item", () => {
    const elastic = { prof: ["MAGE"], lvl: 300, stat: "lvladjust;lvl=300" };

    expect(canWearLootDrawItem(elastic, { prof: "MAGE", lvl: 120 })).toBe(true);
  });

  it("keeps out a player whose level is unknown", () => {
    expect(canWearLootDrawItem(mageWand, { prof: "MAGE", lvl: null })).toBe(
      false,
    );
  });
});

describe("pickLootDrawEntrant", () => {
  const entrants = [
    { name: "winner", tickets: 3 },
    { name: "outsider", tickets: 1 },
  ];

  it("maps each roll to the entrant holding that ticket", () => {
    expect(
      [0, 1, 2, 3].map((roll) => pickLootDrawEntrant(entrants, roll).name),
    ).toEqual(["winner", "winner", "winner", "outsider"]);
  });

  it("rejects a roll past the last ticket", () => {
    expect(() => pickLootDrawEntrant(entrants, 4)).toThrow(RangeError);
  });
});

describe("capturesMapPlayers", () => {
  it("keeps map players for fights that dropped a unique or better item", () => {
    expect(
      capturesMapPlayers({ source: "FIGHT", rarities: [null, "UNIQUE"] }),
    ).toBe(true);
    expect(
      capturesMapPlayers({ source: "FIGHT", rarities: [null, "UPGRADED"] }),
    ).toBe(false);
    expect(
      capturesMapPlayers({ source: "DIALOG", rarities: ["LEGENDARY"] }),
    ).toBe(false);
  });
});
