import { describe, expect, it } from "bun:test";
import {
  capturesMapPlayers,
  DEFAULT_LOOT_DRAW_EXCLUDED_NPC_TYPES,
  formatLootDrawTickets,
  groupedLootDrawTicketOrder,
  isLootDrawItem,
  isLootDrawTicketOrder,
  lootDrawLandingOffset,
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
  const elite = { npcs: [{ type: "ELITE2" }] };
  const legendary = { rarity: "LEGENDARY", stat: "binds;lvl=243" };

  it("draws only legendary items that are not bound for good", () => {
    expect(isLootDrawItem(elite, legendary, [])).toBe(true);
    expect(
      isLootDrawItem(
        elite,
        { rarity: "LEGENDARY", stat: "lvl=279;permbound" },
        [],
      ),
    ).toBe(false);
    expect(
      isLootDrawItem(elite, { rarity: "UNIQUE", stat: "lvl=279" }, []),
    ).toBe(false);
  });

  it("skips the legendary items of an excluded boss, not of its escort", () => {
    const heroFight = { npcs: [{ type: "ELITE" }, { type: "HERO" }] };

    expect(
      isLootDrawItem(
        heroFight,
        legendary,
        DEFAULT_LOOT_DRAW_EXCLUDED_NPC_TYPES,
      ),
    ).toBe(false);
    expect(isLootDrawItem(heroFight, legendary, ["ELITE"])).toBe(true);
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

describe("formatLootDrawTickets", () => {
  it("declines the ticket count as Polish counts it", () => {
    expect([1, 2, 4, 5, 12, 22, 25].map(formatLootDrawTickets)).toEqual([
      "1 los",
      "2 losy",
      "4 losy",
      "5 losów",
      "12 losów",
      "22 losy",
      "25 losów",
    ]);
  });
});

describe("lootDrawLandingOffset", () => {
  it("never stops the pointer on the line between two tickets", () => {
    const offsets = Array.from({ length: 10_000 }, (_, id) =>
      lootDrawLandingOffset(id + 1),
    );

    expect(Math.min(...offsets)).toBeGreaterThanOrEqual(0.08);
    expect(Math.max(...offsets)).toBeLessThanOrEqual(0.92);
  });

  it("stops every wheel of one draw at the same place", () => {
    expect(lootDrawLandingOffset(44)).toBe(lootDrawLandingOffset(44));
    expect(lootDrawLandingOffset(44)).not.toBe(lootDrawLandingOffset(45));
  });
});
