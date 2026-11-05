import { describe, expect, it } from "bun:test";
import {
  capturesMapPlayers,
  groupedLootDrawTicketOrder,
  isLootDrawItem,
  isLootDrawTicketOrder,
  lootDrawWinnerTickets,
  shuffleLootDrawTicketOrder,
} from "./loot-draw.js";

const mageWand = { prof: ["MAGE"] };

describe("lootDrawWinnerTickets", () => {
  it("counts every party member who can wear the item, the winner included", () => {
    const party = [
      { prof: "MAGE" },
      { prof: "MAGE" },
      { prof: "MAGE" },
      { prof: "WARRIOR" },
    ];

    expect(lootDrawWinnerTickets(mageWand, party)).toBe(3);
  });

  it("counts party members by profession alone, whatever their level", () => {
    const party = [
      { prof: "MAGE", lvl: 300 },
      { prof: "MAGE", lvl: 120 },
    ];

    expect(lootDrawWinnerTickets(mageWand, party)).toBe(2);
  });

  it("gives a winner who cannot wear the item one ticket when nobody else can", () => {
    expect(lootDrawWinnerTickets(mageWand, [{ prof: "WARRIOR" }])).toBe(1);
  });
});

describe("isLootDrawTicketOrder", () => {
  const entrants = [{ tickets: 3 }, { tickets: 1 }];

  it("accepts any arrangement of every entrant's tickets", () => {
    expect(isLootDrawTicketOrder([0, 1, 0, 0], entrants)).toBe(true);
  });

  it("rejects an order that gives an entrant more or fewer tickets", () => {
    for (const order of [
      [0, 0, 1, 1],
      [0, 0, 0],
      [0, 0, 0, 1, 2],
    ]) {
      expect(isLootDrawTicketOrder(order, entrants)).toBe(false);
    }
  });

  it("keeps every ticket through a shuffle", () => {
    const shuffled = shuffleLootDrawTicketOrder(
      groupedLootDrawTicketOrder(entrants),
    );

    expect(isLootDrawTicketOrder(shuffled, entrants)).toBe(true);
  });
});

describe("isLootDrawItem", () => {
  it("draws only legendary items that are not bound for good", () => {
    expect(isLootDrawItem({ rarity: "LEGENDARY", stat: "binds;lvl=243" })).toBe(
      true,
    );
    expect(
      isLootDrawItem({ rarity: "LEGENDARY", stat: "lvl=279;permbound" }),
    ).toBe(false);
    expect(isLootDrawItem({ rarity: "UNIQUE", stat: "lvl=279" })).toBe(false);
  });
});

describe("capturesMapPlayers", () => {
  it("keeps map players only for fights that dropped a legendary item", () => {
    expect(
      capturesMapPlayers({ source: "FIGHT", rarities: [null, "LEGENDARY"] }),
    ).toBe(true);
    expect(
      capturesMapPlayers({ source: "FIGHT", rarities: ["UNIQUE", "HEROIC"] }),
    ).toBe(false);
    expect(
      capturesMapPlayers({ source: "DIALOG", rarities: ["LEGENDARY"] }),
    ).toBe(false);
  });
});
