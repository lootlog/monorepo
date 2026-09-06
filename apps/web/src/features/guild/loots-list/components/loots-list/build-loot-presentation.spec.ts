import { describe, expect, it } from "vitest";
import {
  buildLootData,
  type LootPresentationData,
} from "./build-loot-presentation";

const firstItem = {
  id: 1,
  hid: "sword",
  name: "Sword",
  icon: "sword.gif",
  stat: "",
  type: null,
  rarity: "HEROIC",
  lvl: 100,
  prof: [],
} satisfies LootPresentationData["items"][number];
const firstPlayer = {
  id: "first",
  name: "First",
  lvl: 100,
  prof: null,
  icon: null,
  characterId: null,
  accountId: null,
  hpp: null,
} satisfies LootPresentationData["players"][number];
const loot = {
  items: [firstItem, { ...firstItem, id: 2, hid: "shield" }],
  players: [firstPlayer, { ...firstPlayer, id: "second", name: "Second" }],
  npcs: [],
  world: "luvia",
  location: "Map",
  createdAt: "2026-09-06T12:00:00Z",
  lootShare: { second: ["sword"] },
} satisfies LootPresentationData;

describe("loot presentation ownership", () => {
  it("keeps shared items under their recipient and unknown items unassigned", () => {
    const result = buildLootData(loot);
    expect(result.itemsByPlayer.second).toEqual([firstItem]);
    expect(result.itemsByPlayer.first).toEqual([]);
    expect(result.unassignedItems.map((item) => item.hid)).toEqual(["shield"]);
    expect(result.sortedPlayers.map((player) => player.id)).toEqual([
      "second",
      "first",
    ]);
  });

  it("assigns a solo player's items without requiring explicit loot shares", () => {
    const result = buildLootData({
      ...loot,
      players: [firstPlayer],
      lootShare: {},
    });
    expect(result.itemsByPlayer.first).toEqual(loot.items);
    expect(result.unassignedItems).toEqual([]);
  });
});
