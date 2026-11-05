import { describe, expect, it } from "bun:test";
import type { LootDrawOutsider } from "#src/contracts/loots/schemas";
import { ErrorKey } from "#src/loots/error-key";
import { buildLootDrawEntrants } from "#src/loots/loot-draw-entrants";

const player = (
  id: string,
  name: string,
  prof: "MAGE" | "WARRIOR",
  lvl = 300,
) => ({
  id,
  name,
  lvl,
  prof,
  icon: null,
  characterId: Number(id),
  accountId: Number(id) * 10,
  hpp: null,
});

const wand = {
  id: 1,
  hid: "wand-hid",
  name: "Byczy ogon",
  icon: "roz/rozdzka149.gif",
  stat: "lvl=279;reqp=m",
  type: "WAND_WEAPON",
  rarity: "UNIQUE" as const,
  lvl: 279,
  prof: ["MAGE" as const],
};

const loot = {
  items: [wand],
  players: [
    player("1", "Rozdaje Kolby", "MAGE"),
    player("2", "Mikrowojczan", "MAGE"),
    player("3", "Xabz", "WARRIOR"),
  ],
  lootShare: { "1": ["wand-hid"] },
};

const outsider = (
  overrides: Partial<LootDrawOutsider> = {},
): LootDrawOutsider => ({
  name: "Spoza Grupy",
  accountId: 900,
  characterId: 90,
  prof: "MAGE",
  lvl: 290,
  icon: null,
  source: "MAP",
  ...overrides,
});

describe("buildLootDrawEntrants", () => {
  it("gives the winner a ticket per party mage and each outsider one", () => {
    const result = buildLootDrawEntrants(loot, {
      itemHid: "wand-hid",
      outsiders: [outsider()],
    });

    expect(result).toEqual({
      entrants: [
        expect.objectContaining({
          name: "Rozdaje Kolby",
          source: "WINNER",
          tickets: 2,
        }),
        expect.objectContaining({
          name: "Spoza Grupy",
          source: "MAP",
          tickets: 1,
        }),
      ],
    });
  });

  it("refuses a party member entered again as an outsider, even by name", () => {
    const result = buildLootDrawEntrants(loot, {
      itemHid: "wand-hid",
      outsiders: [
        outsider({
          name: " mikrowojczan ",
          characterId: null,
          source: "MANUAL",
        }),
      ],
    });

    expect(result).toEqual({ error: ErrorKey.LOOT_DRAW_OUTSIDER_IN_PARTY });
  });

  it("refuses an outsider who cannot wear the item", () => {
    for (const ineligible of [
      outsider({ prof: "WARRIOR" }),
      outsider({ lvl: 278 }),
      outsider({ lvl: null }),
    ]) {
      expect(
        buildLootDrawEntrants(loot, {
          itemHid: "wand-hid",
          outsiders: [ineligible],
        }),
      ).toEqual({ error: ErrorKey.LOOT_DRAW_OUTSIDER_INELIGIBLE });
    }
  });

  it("refuses the same outsider twice", () => {
    const result = buildLootDrawEntrants(loot, {
      itemHid: "wand-hid",
      outsiders: [
        outsider(),
        outsider({ characterId: null, source: "MANUAL" }),
      ],
    });

    expect(result).toEqual({ error: ErrorKey.LOOT_DRAW_DUPLICATE_OUTSIDER });
  });

  it("refuses an item nobody in the party caught", () => {
    const result = buildLootDrawEntrants(
      { ...loot, lootShare: {} },
      { itemHid: "wand-hid", outsiders: [outsider()] },
    );

    expect(result).toEqual({ error: ErrorKey.LOOT_DRAW_ITEM_UNASSIGNED });
  });
});
