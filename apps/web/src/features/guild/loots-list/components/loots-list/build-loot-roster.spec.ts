import { describe, expect, it } from "vitest";
import { buildLootRoster, type LootRosterInput } from "./build-loot-roster";

const recipient = (
  id: string,
  characterId: number | null,
): LootRosterInput["players"][number] => ({
  id,
  name: `Gracz ${id}`,
  lvl: 100,
  prof: "WARRIOR",
  icon: null,
  characterId,
  accountId: 10,
  hpp: null,
});

const loot: LootRosterInput = {
  source: "FIGHT",
  world: "luvia",
  location: "Mapa",
  createdAt: "2026-09-01T10:00:00.000Z",
  players: [recipient("p1", 4), recipient("p2", null)],
  items: [
    {
      id: 1,
      hid: "item-1",
      name: "Legenda",
      icon: "item.png",
      stat: "",
      type: null,
      rarity: "LEGENDARY",
      lvl: 100,
      prof: [],
    },
  ],
  npcs: [
    {
      id: 1,
      name: "Elita",
      wt: 20,
      lvl: 100,
      prof: null,
      icon: null,
      type: "ELITE2",
      margonemType: null,
    },
  ],
  lootShare: { p1: ["item-1"] },
  mapPlayersSnapshot: [
    {
      accountId: 1,
      characterId: 2,
      name: "Obserwator",
      prof: "MAGE",
      icon: null,
    },
    { accountId: 3, characterId: 4, name: "Gracz p1", prof: null, icon: null },
    { accountId: 5, characterId: 6, name: "Gracz p2", prof: null, icon: null },
  ],
};

describe("buildLootRoster", () => {
  it("lists recipients with their items and keeps only unmatched map players as bystanders", () => {
    const roster = buildLootRoster(loot);

    expect(roster.recipients.map((player) => player.name)).toEqual([
      "Gracz p1",
      "Gracz p2",
    ]);
    expect(roster.recipients[0]?.items.map((item) => item.hid)).toEqual([
      "item-1",
    ]);
    // "Gracz p2" shares a name with a recipient but has no character id, so
    // the map entry stays a bystander instead of being merged by name.
    expect(roster.bystanders.map((player) => player.name)).toEqual([
      "Obserwator",
      "Gracz p2",
    ]);
    expect(roster.isSnapshotUnavailable).toBe(false);
  });

  it("reports a missing snapshot only for legendary ELITE2 fight loot", () => {
    expect(
      buildLootRoster({ ...loot, mapPlayersSnapshot: null })
        .isSnapshotUnavailable,
    ).toBe(true);

    expect(
      buildLootRoster({ ...loot, mapPlayersSnapshot: [] })
        .isSnapshotUnavailable,
    ).toBe(true);

    for (const other of [
      { ...loot, source: "LOOTBOX" as const },
      { ...loot, items: [{ ...loot.items[0]!, rarity: "HEROIC" as const }] },
      { ...loot, npcs: [{ ...loot.npcs[0]!, type: "HERO" as const }] },
      {
        ...loot,
        npcs: [
          loot.npcs[0]!,
          { ...loot.npcs[0]!, wt: 100, type: "HERO" as const },
        ],
      },
    ]) {
      expect(
        buildLootRoster({ ...other, mapPlayersSnapshot: null })
          .isSnapshotUnavailable,
      ).toBe(false);
    }
  });

  it("still lists a recorded roster for legacy NPC types", () => {
    const roster = buildLootRoster({
      ...loot,
      npcs: [{ ...loot.npcs[0]!, type: null }],
    });

    expect(roster.bystanders).toHaveLength(2);
    expect(roster.isSnapshotUnavailable).toBe(false);
  });
});
