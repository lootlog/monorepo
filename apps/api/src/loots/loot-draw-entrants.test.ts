import { describe, expect, it } from "bun:test";
import type { LootDrawEntrantInput } from "#src/contracts/loots/schemas";
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
  rarity: "LEGENDARY" as const,
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

const winner: LootDrawEntrantInput = {
  name: "Rozdaje Kolby",
  accountId: 10,
  characterId: 1,
  prof: "MAGE",
  lvl: 300,
  icon: null,
  source: "WINNER",
  tickets: 2,
};

const outsider = (
  overrides: Partial<LootDrawEntrantInput> = {},
): LootDrawEntrantInput => ({
  name: "Spoza Grupy",
  accountId: 900,
  characterId: 90,
  prof: "MAGE",
  lvl: 290,
  icon: null,
  source: "MAP",
  tickets: 1,
  ...overrides,
});

const request = (
  entrants: LootDrawEntrantInput[],
  ticketOrder = entrants.flatMap((entrant, index) =>
    Array.from({ length: entrant.tickets }, () => index),
  ),
) => ({ itemHid: "wand-hid", entrants, ticketOrder });

describe("buildLootDrawEntrants", () => {
  it("keeps the manager's tickets and stores the winner as the loot records them", () => {
    const result = buildLootDrawEntrants(
      loot,
      request([
        { ...winner, name: "rozdaje kolby", characterId: null, tickets: 5 },
        outsider({ tickets: 3 }),
      ]),
    );

    expect(result).toEqual({
      entrants: [
        expect.objectContaining({
          name: "Rozdaje Kolby",
          characterId: 1,
          source: "WINNER",
          tickets: 5,
        }),
        expect.objectContaining({ name: "Spoza Grupy", tickets: 3 }),
      ],
    });
  });

  it("refuses a WINNER who did not catch the item", () => {
    const result = buildLootDrawEntrants(
      loot,
      request([{ ...winner, name: "Xabz", characterId: 3 }, outsider()]),
    );

    expect(result).toEqual({ error: ErrorKey.LOOT_DRAW_WINNER_MISMATCH });
  });

  it("refuses a party member entered again as an outsider, even by name", () => {
    const result = buildLootDrawEntrants(
      loot,
      request([
        winner,
        outsider({
          name: " mikrowojczan ",
          characterId: null,
          source: "MANUAL",
        }),
      ]),
    );

    expect(result).toEqual({ error: ErrorKey.LOOT_DRAW_OUTSIDER_IN_PARTY });
  });

  it("refuses an outsider of another profession, whatever the level", () => {
    expect(
      buildLootDrawEntrants(
        loot,
        request([winner, outsider({ prof: "WARRIOR" })]),
      ),
    ).toEqual({ error: ErrorKey.LOOT_DRAW_OUTSIDER_INELIGIBLE });
    expect(
      buildLootDrawEntrants(loot, request([winner, outsider({ lvl: 120 })])),
    ).toHaveProperty("entrants");
  });

  it("refuses the same outsider twice", () => {
    const result = buildLootDrawEntrants(
      loot,
      request([
        winner,
        outsider(),
        outsider({ characterId: null, source: "MANUAL" }),
      ]),
    );

    expect(result).toEqual({ error: ErrorKey.LOOT_DRAW_DUPLICATE_OUTSIDER });
  });

  it("refuses a ticket order that does not hold each entrant's tickets", () => {
    const result = buildLootDrawEntrants(
      loot,
      request([winner, outsider()], [0, 1, 1]),
    );

    expect(result).toEqual({ error: ErrorKey.LOOT_DRAW_INVALID_TICKET_ORDER });
  });

  it("refuses an item that is not legendary", () => {
    const result = buildLootDrawEntrants(
      { ...loot, items: [{ ...wand, rarity: "HEROIC" }] },
      request([winner, outsider()]),
    );

    expect(result).toEqual({ error: ErrorKey.LOOT_DRAW_ITEM_NOT_DRAWABLE });
  });

  it("refuses a legendary item bound for good, as colossi and titans drop", () => {
    const result = buildLootDrawEntrants(
      { ...loot, items: [{ ...wand, stat: "lvl=279;permbound;reqp=m" }] },
      request([winner, outsider()]),
    );

    expect(result).toEqual({ error: ErrorKey.LOOT_DRAW_ITEM_NOT_DRAWABLE });
  });

  it("refuses an item nobody in the party caught", () => {
    const result = buildLootDrawEntrants(
      { ...loot, lootShare: {} },
      request([winner, outsider()]),
    );

    expect(result).toEqual({ error: ErrorKey.LOOT_DRAW_ITEM_UNASSIGNED });
  });
});
